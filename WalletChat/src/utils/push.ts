import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// Push notifications: "Diane sent you RWF 5,000" on the lock screen, even when WalletChat is closed.
// The server sends them through Expo (server/src/push.ts) to this phone's address, the push token.

// While the app is open, the live line (api/live.ts) already updates the chats, balance and bell,
// so a banner on top would only repeat it: show nothing, play nothing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Asks for permission (only the first time: the phone remembers the answer) and returns this phone's
// push token, or null when push can't work here. Never throws: the app works fine without push.
export async function getPushToken(): Promise<string | null> {
  try {
    // Simulators can't receive push, and Expo Go on Android dropped remote push (SDK 53+)
    if (!Device.isDevice) return null;
    if (Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;

    // Android 13+ only shows the permission question once a channel exists
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Messages and payments",
        // eslint-disable-next-line import/namespace -- it exists (re-exported deep inside the package), the lint rule just can't see it
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) ({ granted } = await Notifications.requestPermissionsAsync());
    if (!granted) return null; // you said no: fine, no notifications

    // Expo needs to know which project the app belongs to. `npx eas-cli@latest init` writes it into app.json.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("Push notifications are off: no EAS projectId yet. Run `npx eas-cli@latest init` in WalletChat/.");
      return null;
    }
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    console.warn("Couldn't set up push notifications:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

// When you tap a notification: the chat it's about ("chatId" is put there by the server), if any
export function chatIdOf(response: Notifications.NotificationResponse | null) {
  if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const chatId = response.notification.request.content.data?.chatId;
  return typeof chatId === "string" ? chatId : null;
}
