import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { ScreenHeader } from "@/components/screen-header";
import { TransactionRow } from "@/components/transaction-row";
import { useWallet } from "@/context/wallet";
import type { Transaction } from "@/data/mock";
import { dayLabel } from "@/utils/formats";

type Filter = "all" | "in" | "out";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in", label: "Money in" },
  { id: "out", label: "Money out" },
];

// [{ label: "Today", items: [...] }, { label: "Yesterday", items: [...] }, ...]
function groupByDay(transactions: Transaction[]) {
  const groups: { label: string; items: Transaction[] }[] = [];

  for (const tx of transactions) {
    const label = dayLabel(new Date(tx.date));
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(tx);
    else groups.push({ label, items: [tx] });
  }
  return groups;
}

export default function ActivityScreen() {
  const { transactions } = useWallet();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = transactions.filter((tx) => {
    if (filter === "in") return tx.amount > 0;
    if (filter === "out") return tx.amount < 0;
    return true;
  });
  const groups = groupByDay(visible);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <ScreenHeader title="Activity" />

        <View style={styles.filters}>
          {filters.map((f) => {
            const selected = f.id === filter;
            return (
              <Pressable
                key={f.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setFilter(f.id)}
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {groups.length === 0 ? <Text style={styles.empty}>Nothing here yet.</Text> : null}

        {groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.dayLabel}>{group.label}</Text>
            <View style={styles.listCard}>
              {group.items.map((tx, index) => (
                <TransactionRow key={tx.id} transaction={tx} isLast={index === group.items.length - 1} />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.lg },
  filters: { flexDirection: "row", gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  chipTextSelected: { color: "white" },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  group: { gap: spacing.sm },
  dayLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
  },
  empty: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
