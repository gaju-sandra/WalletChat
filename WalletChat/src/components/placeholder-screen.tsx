import { Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, spacing } from "@/constants/theme";

type PlaceholderScreenProps = {
  title: string;
  message: string;
};

export function PlaceholderScreen({ title, message }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  message: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
});
