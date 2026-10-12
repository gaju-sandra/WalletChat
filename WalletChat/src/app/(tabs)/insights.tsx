import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, palette, radius, spacing } from "@/constants/theme";
import { useWallet } from "@/context/wallet";
import { WeeklyChart } from "@/components/weekly-charts";
import { CategoryBar } from "@/components/category-bar";
import { formatRWF } from "@/utils/formats";
import {
  MONTHLY_BUDGET,
  lastSevenDays,
  monthLabel,
  spendingByCategory,
  totals,
  transactionsThisMonth,
} from "@/utils/insights";

export default function InsightsScreen() {
  const { transactions } = useWallet();

  const monthTransactions = transactionsThisMonth(transactions);
  const { spent, received } = totals(monthTransactions);
  const week = lastSevenDays(transactions);
  const categories = spendingByCategory(monthTransactions);
  const budgetPercent = Math.round((spent / MONTHLY_BUDGET) * 100);
  const overBudget = spent > MONTHLY_BUDGET;

  let budgetMessage = "";
  if (overBudget) budgetMessage = " — over budget!";
  else if (budgetPercent >= 80) budgetMessage = " — close to your limit";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <View style={styles.monthPill}>
            <Text style={styles.monthText}>{monthLabel()}</Text>
          </View>
        </View>

        {/* Spent / Received */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={styles.statValue}>{formatRWF(spent)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Received</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>{formatRWF(received)}</Text>
          </View>
        </View>

        {/* Weekly chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spending this week</Text>
          <WeeklyChart days={week} />
        </View>

        {/* Categories */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>By category</Text>
          {categories.length > 0 ? (
            categories.map((item) => <CategoryBar key={item.category} {...item} />)
          ) : (
            <Text style={styles.statLabel}>No spending yet this month.</Text>
          )}
        </View>

        {/* Budget */}
        <View style={[styles.budgetCard, overBudget && styles.budgetCardOver]}>
          <View style={styles.budgetTop}>
            <Text style={styles.cardTitle}>Monthly budget</Text>
            <Text style={styles.budgetPercent}>{budgetPercent}% used</Text>
          </View>
          <View style={styles.budgetTrack}>
            <View
              style={[
                styles.budgetFill,
                { width: `${Math.min(budgetPercent, 100)}%` },
                overBudget && styles.budgetFillOver,
              ]}
            />
          </View>
          <Text style={styles.budgetText}>
            {formatRWF(spent)} of {formatRWF(MONTHLY_BUDGET)}
            {budgetMessage}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  monthPill: {
    paddingHorizontal: 14,
    height: 34,
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  monthText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statCard: {
    flex: 1,
    gap: 4,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  statValue: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  budgetCard: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.accentSoft },
  budgetCardOver: { backgroundColor: palette.red.bg },
  budgetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  budgetPercent: { fontFamily: fonts.semibold, fontSize: 13, color: palette.amber.fg },
  budgetTrack: { height: 8, borderRadius: radius.full, backgroundColor: colors.surface, overflow: "hidden" },
  budgetFill: { height: 8, borderRadius: radius.full, backgroundColor: colors.accent },
  budgetFillOver: { backgroundColor: colors.danger },
  budgetText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text },
});