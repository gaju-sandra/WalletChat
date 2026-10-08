import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Delete, Check } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { balance, contacts } from "@/data/mock";
import { formatRWF } from "@/utils/formats";

const MAX_DIGITS = 9;
const quickAmounts = [1000, 5000, 10000];
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];

export default function SendScreen() {
  const params = useLocalSearchParams<{ contactId?: string }>();
  const [contactId, setContactId] = useState(params.contactId);
  const [digits, setDigits] = useState("");
  const [sent, setSent] = useState(false);

  const contact = contacts.find((c) => c.id === contactId);
  const amount = Number(digits || "0");
  const exceedsBalance = amount > balance;
  const canSend = !!contact && amount > 0 && !exceedsBalance;

  function pressKey(key: string) {
    if (key === "back") {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    setDigits((d) => {
      if (d === "" && key.startsWith("0")) return d; // no leading zeros
      return (d + key).slice(0, MAX_DIGITS);
    });
  }

  if (sent && contact) {
    return (
      <SafeAreaView style={[styles.safe, styles.successScreen]}>
        <View style={styles.successIcon}>
          <Check size={36} color="white" />
        </View>
        <Text style={styles.successTitle}>Money sent</Text>
        <Text style={styles.successText}>
          {formatRWF(amount)} is on its way to {contact.name}.
        </Text>
        <Pressable style={[styles.primaryButton, styles.successButton]} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Send money</Text>
      </View>

      {/* Recipient */}
      {contact ? (
        <View style={styles.recipientCard}>
          <Avatar initials={contact.initials} tone={contact.tone} size={44} />
          <View style={styles.recipientText}>
            <Text style={styles.label}>To</Text>
            <Text style={styles.recipientName}>{contact.name}</Text>
          </View>
          <Pressable onPress={() => setContactId(undefined)} hitSlop={8}>
            <Text style={styles.link}>Change</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.pickerSection}>
          <Text style={styles.label}>Choose who to send money to</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
            {contacts.map((c) => (
              <Pressable key={c.id} style={styles.pickerItem} onPress={() => setContactId(c.id)}>
                <Avatar initials={c.initials} tone={c.tone} />
                <Text style={styles.pickerName}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Amount */}
      <View style={styles.amountSection}>
        <Text style={[styles.amount, amount === 0 && styles.amountEmpty, exceedsBalance && styles.amountError]}>
          {formatRWF(amount)}
        </Text>
        <Text style={[styles.label, exceedsBalance && styles.errorText]}>
          {exceedsBalance ? "Not enough balance" : `Available ${formatRWF(balance)}`}
        </Text>
        <View style={styles.chips}>
          {quickAmounts.map((value) => (
            <Pressable key={value} style={styles.chip} onPress={() => setDigits(String(value))}>
              <Text style={styles.chipText}>{value.toLocaleString("en-US")}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {keys.map((key) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            onPress={() => pressKey(key)}
            onLongPress={key === "back" ? () => setDigits("") : undefined}
            accessibilityLabel={key === "back" ? "Delete digit" : key}
          >
            {key === "back" ? (
              <Delete size={22} color={colors.text} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.primaryButton, !canSend && styles.primaryButtonDisabled]}
        disabled={!canSend}
        onPress={() => setSent(true)}
      >
        <Text style={styles.primaryButtonText}>
          {contact && amount > 0 ? `Send ${formatRWF(amount)}` : "Send"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  recipientText: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  recipientName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  pickerSection: { gap: spacing.md },
  pickerRow: { gap: 14 },
  pickerItem: { width: 56, alignItems: "center", gap: 6 },
  pickerName: { fontFamily: fonts.regular, fontSize: 12, color: colors.text },
  amountSection: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  amount: { fontFamily: fonts.display, fontSize: 40, color: colors.text },
  amountEmpty: { color: colors.textMuted },
  amountError: { color: colors.danger },
  errorText: { color: colors.danger },
  chips: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  keypad: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.xs },
  key: { width: "33.333%", height: 56, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  keyPressed: { backgroundColor: colors.divider },
  keyText: { fontFamily: fonts.medium, fontSize: 24, color: colors.text },
  primaryButton: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { fontFamily: fonts.semibold, fontSize: 16, color: "white" },
  successScreen: { alignItems: "center", justifyContent: "center" },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  successText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: "center" },
  successButton: { alignSelf: "stretch", marginTop: spacing.lg },
});
