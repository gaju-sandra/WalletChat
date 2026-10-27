import { Text, StyleSheet, Pressable } from "react-native";
import { colors, fonts, radius } from "@/constants/theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({ label, onPress, disabled = false, variant = "primary" }: PrimaryButtonProps) {
  const secondary = variant === "secondary";

  return (
    <Pressable
      style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.label, secondary && styles.labelSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.4 },
  label: { fontFamily: fonts.semibold, fontSize: 16, color: "white" },
  labelSecondary: { color: colors.text },
});
