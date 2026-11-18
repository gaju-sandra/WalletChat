import { useState } from "react";
import { RefreshControl } from "react-native";
import { colors } from "@/constants/theme";
import { useWallet } from "@/context/wallet";

// "Pull to refresh" for any scrolling screen: drag down, a spinner shows, and the newest data loads from
// the server. Use it as <ScrollView refreshControl={usePullToRefresh()}> (FlatList works the same way).
export function usePullToRefresh() {
  const { reload } = useWallet();
  const [refreshing, setRefreshing] = useState(false); // true while the spinner shows

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await reload();
    } catch {
      // keep showing what we already have; the spinner just stops
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary} // spinner colour on iPhone
      colors={[colors.primary]} // spinner colour on Android
    />
  );
}
