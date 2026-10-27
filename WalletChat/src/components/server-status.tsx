import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WifiOff } from "lucide-react-native";
import { colors, fonts, palette, radius, spacing } from "@/constants/theme";
import { PrimaryButton } from "@/components/primary-button";

type ServerStatusProps = {
  error?: string; // no error = still loading
  onRetry: () => void;
};

// Shown instead of the app while it loads from the server, or when the server can't be reached
export function ServerStatus({ error, onRetry }: ServerStatusProps) {
  return (
    <SafeAreaView style={styles.safe}>
      {error ? (
        <>
          <View style={styles.icon}>
            <WifiOff size={32} color={colors.danger} />
          </View>
          <Text style={styles.title}>Can&apos;t load your wallet</Text>
          <Text style={styles.message}>{error}</Text>
          <View style={styles.button}>
            <PrimaryButton label="Try again" onPress={onRetry} />
          </View>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>Loading your wallet…</Text>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: palette.red.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  message: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: "center" },
  button: { alignSelf: "stretch", marginTop: spacing.lg },
});
