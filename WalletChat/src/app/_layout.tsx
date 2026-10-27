import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { WalletProvider } from "@/context/wallet";
import { useFonts, BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add your key to .env.local.\nRun: 1) clerk auth login  2) clerk link  3) clerk env pull — then restart the dev server.",
  );
}

SplashScreen.preventAutoHideAsync();

// Which screens exist depends on whether you are signed in:
//   signed out → only the sign-in screen
//   signed in  → the whole app, with your wallet loaded from the server
function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();

  // Clerk needs a moment to read a saved session from the phone; showing nothing avoids a flash of the
  // sign-in screen for people who are already signed in
  if (!isLoaded) return null;

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Stack.Protected: these screens only exist while `guard` is true */}
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="send" />
        <Stack.Screen name="top-up" />
        <Stack.Screen name="request" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="new-contact" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="chat/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );

  // Only load a wallet once someone is signed in
  return isSignedIn ? <WalletProvider>{stack}</WalletProvider> : stack;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <RootNavigator />
    </ClerkProvider>
  );
}
