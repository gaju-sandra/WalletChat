import { View, Text, StyleSheet } from "react-native";
import { ArrowUpRight, ArrowDownLeft, Bus, Zap, ShoppingCart, type LucideIcon } from "lucide-react-native";
import { colors, fonts, palette, radius, spacing, type Tone } from "@/constants/theme";
import type { Transaction } from "@/data/mock";
import { formatRWF } from "@/utils/formats";

const categoryStyle: Record<Transaction["category"], { icon: LucideIcon; tone: Tone }> = {
  transfer: { icon: ArrowUpRight, tone: "amber" },
  income: { icon: ArrowDownLeft, tone: "green" },
  transport: { icon: Bus, tone: "teal" },
  bills: { icon: Zap, tone: "indigo" },
  shopping: { icon: ShoppingCart, tone: "red" },
};

type TransactionRowProps = {
  transaction: Transaction;
  isLast?: boolean;
};

export function TransactionRow({ transaction, isLast = false }: TransactionRowProps) {
  const { icon: Icon, tone } = categoryStyle[transaction.category];
  const isIncome = transaction.amount > 0;

  return (
    <View style={[styles.row, !isLast && styles.divider]}>
      <View style={[styles.iconBox, { backgroundColor: palette[tone].bg }]}>
        <Icon size={20} color={palette[tone].fg} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{transaction.title}</Text>
        <Text style={styles.subtitle}>{transaction.subtitle}</Text>
      </View>
      <Text style={[styles.amount, isIncome && { color: colors.success }]}>
        {isIncome ? "+" : "−"}
        {formatRWF(transaction.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 60, flexDirection: "row", alignItems: "center", gap: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  amount: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});