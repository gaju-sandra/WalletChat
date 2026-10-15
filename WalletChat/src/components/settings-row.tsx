import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, palette, radius, spacing, type Tone } from "@/constants/theme";

type SettingsRowProps = {
  icon: LucideIcon;
  tone?: Tone;
  label: string;
  value?: string;
  right?: ReactNode; // anything on the right: a Switch, an "Edit" link...
  isLast?: boolean;
};

export function SettingsRow({ icon: Icon, tone = "teal", label, value, right, isLast = false }: SettingsRowProps) {
  return (
    <View style={[styles.row, !isLast && styles.divider]}>
      <View style={[styles.iconBox, { backgroundColor: palette[tone].bg }]}>
        <Icon size={18} color={palette[tone].fg} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  iconBox: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  value: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});