import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, palette, radius } from "@/constants/theme";
import { categoryInfo } from "@/constants/categories";
import type { SpendingCategory } from "@/utils/insights";
import { formatRWF } from "@/utils/formats";

type CategoryBarProps = {
  category: SpendingCategory;
  amount: number;
  percent: number;
};

export function CategoryBar({ category, amount, percent }: CategoryBarProps) {
  const info = categoryInfo[category];

  return (
    <View style={styles.row}>
      <View style={styles.top}>
        <Text style={styles.label}>{info.label}</Text>
        <Text style={styles.amount}>
          {formatRWF(amount)} · {percent}%
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: palette[info.tone].fg }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6 },
  top: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  amount: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  track: { height: 8, borderRadius: radius.full, backgroundColor: colors.divider, overflow: "hidden" },
  fill: { height: 8, borderRadius: radius.full },
});