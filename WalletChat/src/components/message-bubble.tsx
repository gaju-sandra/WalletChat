import { View, Text, StyleSheet } from "react-native";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import type { Message } from "@/data/mock";
import { formatRWF } from "@/utils/formats";

export function MessageBubble({ message }: { message: Message }) {
  const mine = message.fromMe;

  if (message.kind === "payment") {
    const Icon = mine ? ArrowUpRight : ArrowDownLeft;
    return (
      <View style={[styles.payment, mine ? styles.right : styles.left]}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentIcon}>
            <Icon size={16} color={colors.text} />
          </View>
          <Text style={styles.paymentLabel}>{mine ? "You sent" : "You received"}</Text>
        </View>
        <Text style={styles.paymentAmount}>{formatRWF(message.amount)}</Text>
        <Text style={styles.time}>{message.time}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.text, mine && styles.textMine]}>{message.text}</Text>
      <Text style={[styles.time, mine && styles.timeMine]}>{message.time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, gap: 2 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  text: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  textMine: { color: "white" },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, alignSelf: "flex-end" },
  timeMine: { color: colors.onPrimaryMuted },
  payment: {
    width: 220,
    padding: 14,
    gap: 6,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  right: { alignSelf: "flex-end", borderBottomRightRadius: 6 },
  left: { alignSelf: "flex-start", borderBottomLeftRadius: 6 },
  paymentHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  paymentIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  paymentAmount: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
});