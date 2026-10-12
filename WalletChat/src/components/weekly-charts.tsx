import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/constants/theme";
import type { DaySpending } from "@/utils/insights";

const CHART_HEIGHT = 110;

function shortAmount(amount: number) {
  return amount >= 1000 ? `${Math.round(amount / 100) / 10}k` : String(amount);
}

export function WeeklyChart({ days }: { days: DaySpending[] }) {
  const max = Math.max(...days.map((d) => d.amount), 1);
  const peakIndex = days.findIndex((d) => d.amount === max);

  return (
    <View style={styles.chart}>
      {days.map((day, index) => {
        const isPeak = index === peakIndex;
        const height = Math.max((day.amount / max) * CHART_HEIGHT, 4);

        return (
          <View key={day.label} style={styles.column}>
            <Text style={[styles.value, !isPeak && styles.hidden]}>{shortAmount(day.amount)}</Text>
            <View style={[styles.bar, { height }, isPeak && styles.barPeak]} />
            <Text style={[styles.dayLabel, isPeak && styles.dayLabelPeak]}>{day.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: CHART_HEIGHT + 44 },
  column: { flex: 1, alignItems: "center", gap: 6 },
  bar: {
    width: "100%",
    backgroundColor: colors.primarySoft,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  barPeak: { backgroundColor: colors.primary },
  value: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
  hidden: { opacity: 0 },
  dayLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  dayLabelPeak: { fontFamily: fonts.semibold, color: colors.text },
});