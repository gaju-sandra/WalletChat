import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { WalletProvider } from "@/context/wallet";
import{ useFonts, BricolageGrotesque_700Bold } from 
"@expo-google-fonts/bricolage-grotesque";
import { DMSans_400Regular, DMSans_500Medium, 
  DMSans_600SemiBold } from "@expo-google-fonts/dm-sans";

SplashScreen.preventAutoHideAsync();

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
    <WalletProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="send" />
      </Stack>
    </WalletProvider>
  );
}
