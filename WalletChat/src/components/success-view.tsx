import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";

type SuccessViewProps = {
  title: string;
  message: string;
  children?: ReactNode; // the buttons at the bottom
};

export function SuccessView({ title, message, children }: SuccessViewProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.icon}>
        <Check size={36} color="white" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  message: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: "center" },
  actions: { alignSelf: "stretch", gap: spacing.sm, marginTop: spacing.lg },
});
