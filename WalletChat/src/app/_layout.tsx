import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SQLiteProvider } from "expo-sqlite";
import { WalletProvider } from "@/context/wallet";
import { migrateDbIfNeeded } from "@/db/migrations";
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
    // Opens (or creates) walletchat.db and runs the migrations before any screen renders
    <SQLiteProvider databaseName="walletchat.db" onInit={migrateDbIfNeeded}>
      <WalletProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="send" />
          <Stack.Screen name="top-up" />
          <Stack.Screen name="request" />
          <Stack.Screen name="activity" />
          <Stack.Screen name="new-contact" />
          <Stack.Screen name="database" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="chat/[id]" />
        </Stack>
      </WalletProvider>
    </SQLiteProvider>
  );
}
