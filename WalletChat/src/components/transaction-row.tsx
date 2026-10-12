import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, palette, radius, spacing} from "@/constants/theme";
import type { Transaction } from "@/data/mock";
import { formatRWF } from "@/utils/formats";
import { categoryInfo } from "@/constants/categories";



type TransactionRowProps = {
  transaction: Transaction;
  isLast?: boolean;
};

export function TransactionRow({ transaction, isLast = false }: TransactionRowProps) {
  const { icon: Icon, tone } = categoryInfo[transaction.category];
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