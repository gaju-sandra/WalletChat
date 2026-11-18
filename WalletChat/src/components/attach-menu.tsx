import { View, Text, StyleSheet, Pressable } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, palette, radius, spacing, type Tone } from "@/constants/theme";

export type AttachOption = {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  hint?: string; // a small line under the label, e.g. why it's turned off
  disabled?: boolean;
  onPress: () => void;
};

type AttachMenuProps = {
  options: AttachOption[];
  onClose: () => void;
};

// The menu that slides up from the chat's + button. It is drawn on top of the chat screen (not as a
// separate native window), so the phone's own pickers, like the contact list, can open straight after it.
export function AttachMenu({ options, onClose }: AttachMenuProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Tapping the dark area around the menu closes it */}
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <View style={styles.sheet}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Pressable
              key={option.label}
              style={({ pressed }) => [styles.row, pressed && styles.pressed, option.disabled && styles.disabled]}
              disabled={option.disabled}
              onPress={() => {
                onClose();
                option.onPress();
              }}
              accessibilityRole="button"
            >
              <View style={[styles.iconBox, { backgroundColor: palette[option.tone].bg }]}>
                <Icon size={20} color={palette[option.tone].fg} />
              </View>
              <View style={styles.texts}>
                <Text style={styles.label}>{option.label}</Text>
                {option.hint ? <Text style={styles.hint}>{option.hint}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  iconBox: { width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
});
