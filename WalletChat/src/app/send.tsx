import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { colors, spacing } from "@/constants/theme";
import { ScreenHeader } from "@/components/screen-header";
import { RecipientPicker } from "@/components/recipient-picker";
import { AmountPad } from "@/components/amount-pad";
import { PrimaryButton } from "@/components/primary-button";
import { SuccessView } from "@/components/success-view";
import { useWallet } from "@/context/wallet";
import { formatRWF } from "@/utils/formats";
import { goBack } from "@/utils/navigation";

export default function SendScreen() {
  // amount comes from the "Pay" button on a request bubble in chat
  const params = useLocalSearchParams<{ contactId?: string; amount?: string }>();
  const { balance, contacts, sendMoney } = useWallet();
  const [contactId, setContactId] = useState(params.contactId);
  const [digits, setDigits] = useState(params.amount ?? "");
  const [sent, setSent] = useState(false);

  const contact = contacts.find((c) => c.id === contactId);
  const amount = Number(digits || "0");
  const exceedsBalance = amount > balance;
  const canSend = !!contact && amount > 0 && !exceedsBalance;

  function handleSend() {
    if (!contact) return;
    sendMoney(contact.id, amount);
    setSent(true);
  }

  if (sent && contact) {
    return (
      <SuccessView title="Money sent" message={`${formatRWF(amount)} is on its way to ${contact.name}.`}>
        <PrimaryButton label="Done" onPress={() => goBack()} />
      </SuccessView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Send money" />

      <RecipientPicker
        label="To"
        prompt="Choose who to send money to"
        contactId={contactId}
        onChange={setContactId}
      />

      <AmountPad
        digits={digits}
        onChange={setDigits}
        error={exceedsBalance}
        hint={exceedsBalance ? "Not enough balance" : `Available ${formatRWF(balance)}`}
      />

      <PrimaryButton
        label={contact && amount > 0 ? `Send ${formatRWF(amount)}` : "Send"}
        disabled={!canSend}
        onPress={handleSend}
      />
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
});
