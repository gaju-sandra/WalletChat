import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing } from "@/constants/theme";
import { ScreenHeader } from "@/components/screen-header";
import { RecipientPicker } from "@/components/recipient-picker";
import { AmountPad } from "@/components/amount-pad";
import { PrimaryButton } from "@/components/primary-button";
import { SuccessView } from "@/components/success-view";
import { FormError } from "@/components/form-error";
import { useWallet } from "@/context/wallet";
import { formatRWF } from "@/utils/formats";
import { goBack } from "@/utils/navigation";

export default function RequestScreen() {
  const { contacts, requestMoney } = useWallet();
  const [contactId, setContactId] = useState<string | undefined>();
  const [digits, setDigits] = useState("");
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false); // waiting for the server
  const [error, setError] = useState("");

  const contact = contacts.find((c) => c.id === contactId);
  const amount = Number(digits || "0");
  const canRequest = !!contact && amount > 0 && !busy;

  async function handleRequest() {
    if (!contact) return;
    setBusy(true);
    setError("");
    try {
      await requestMoney(contact.id, amount);
      setRequested(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (requested && contact) {
    return (
      <SuccessView title="Request sent" message={`You asked ${contact.name} for ${formatRWF(amount)}.`}>
        {/* replace, not push: Back from the chat should go Home, not to this success screen */}
        <PrimaryButton
          label="Open chat"
          onPress={() => router.replace({ pathname: "/chat/[id]", params: { id: contact.id } })}
        />
        <PrimaryButton label="Done" variant="secondary" onPress={() => goBack()} />
      </SuccessView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Request money" />

      <RecipientPicker
        label="From"
        prompt="Who should pay you?"
        contactId={contactId}
        onChange={setContactId}
      />

      <AmountPad digits={digits} onChange={setDigits} hint="They'll get the request in your chat" />

      <FormError message={error} />

      <PrimaryButton
        label={busy ? "Sending request…" : contact && amount > 0 ? `Request ${formatRWF(amount)}` : "Request"}
        disabled={!canRequest}
        onPress={handleRequest}
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
