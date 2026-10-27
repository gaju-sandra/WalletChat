import { useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wallet } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { PrimaryButton } from "@/components/primary-button";
import { FormError } from "@/components/form-error";
import { AuthField } from "@/components/auth-ui";
import { createProfile } from "@/api/wallet";

type ProfileSetupProps = {
  initialName?: string;
  initialPhone?: string;
  initialError?: string; // e.g. why creating the wallet automatically didn't work
  onCreated: () => void; // called once the wallet exists, so the app can load it
  onSignOut: () => void;
};

// Shown when you are signed in with Clerk but WalletChat's database has no wallet for you yet.
// Normally the app creates it for you from the Create account form; this screen is the fallback,
// e.g. when that phone number is already used by another wallet.
export function ProfileSetup({ initialName = "", initialPhone = "", initialError = "", onCreated, onSignOut }: ProfileSetupProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  // Stops a second submit while one is still running (e.g. iPhone autofills the code AND you tap the button).
  // A ref changes instantly, unlike state, which only updates on the next render.
  const submitting = useRef(false);

  async function handleCreate() {
    if (!name.trim()) return setError("Enter your name.");
    if (!phone.trim()) return setError("Enter your phone number.");
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await createProfile(name.trim(), phone.trim()); // the server checks the phone number
      onCreated();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.icon}>
        <Wallet size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>Create your wallet</Text>
      <Text style={styles.message}>People find you by your phone number and see your name when you pay them.</Text>

      <AuthField
        label="Full name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError("");
        }}
        placeholder="Your full name"
        autoCapitalize="words"
      />
      <AuthField
        label="Phone number"
        value={phone}
        onChangeText={(text) => {
          setPhone(text);
          setError("");
        }}
        placeholder="0788 123 456"
        keyboardType="phone-pad"
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />

      <FormError message={error} />

      <View style={styles.actions}>
        <PrimaryButton label={busy ? "Creating…" : "Create my wallet"} onPress={handleCreate} disabled={busy} />
        <PrimaryButton label="Sign out" variant="secondary" onPress={onSignOut} />
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
  actions: { gap: spacing.sm },
});
