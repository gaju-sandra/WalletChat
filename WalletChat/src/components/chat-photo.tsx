import { useEffect, useState } from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useAuth } from "@clerk/expo";
import { colors } from "@/constants/theme";

type ChatPhotoProps = {
  url: string; // e.g. http://…:3000/messages/42/photo
  style?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain";
};

// A photo from a chat. Chat photos are private: the server only gives them to the two people in the
// chat, so the request must carry the sign-in ticket, like every other request to our server.
export function ChatPhoto({ url, style, contentFit = "cover" }: ChatPhotoProps) {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  // getToken is async (Clerk may renew the ticket first), so fetch it once, then show the picture
  useEffect(() => {
    let cancelled = false;
    getToken().then((t) => !cancelled && setToken(t));
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <View style={[styles.box, style]}>
      {token ? (
        <Image
          // cacheKey = the address only: the ticket changes every minute, but it's still the same photo,
          // so the phone keeps using its saved copy instead of downloading it again
          source={{ uri: url, headers: { Authorization: `Bearer ${token}` }, cacheKey: url }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.divider, overflow: "hidden" }, // grey while the photo loads
});
