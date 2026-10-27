import { useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wallet } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { PrimaryButton } from "@/components/primary-button";
import { FormError } from "@/components/form-error";
import { createProfile } from "@/api/wallet";

type ProfileSetupProps = {
  onCreated: () => void; // called once the wallet exists, so the app can load it
  onSignOut: () => void;
};

// Shown once, after your first sign-in: Clerk knows you (your verified phone number),
// but WalletChat's database doesn't have a wallet for you yet.
export function ProfileSetup({ onCreated, onSignOut }: ProfileSetupProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return setError("Enter your name.");
    setBusy(true);
    setError("");
    try {
      await createProfile(name.trim());
      onCreated();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.icon}>
        <Wallet size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>Create your wallet</Text>
      <Text style={styles.message}>What should people see when you send them money?</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError("");
        }}
        placeholder="Your full name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleCreate}
        autoFocus
      />

      <FormError message={error} />

      <View style={styles.actions}>
        <PrimaryButton label={busy ? "Creating…" : "Create my wallet"} onPress={handleCreate} disabled={busy} />
        <PrimaryButton label="Use a different number" variant="secondary" onPress={onSignOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    gap: spacing.lg,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.text, textAlign: "center" },
  message: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: "center" },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  actions: { gap: spacing.sm },
});
