import { useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReverification, useSession, useUser } from "@clerk/expo";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { ScreenHeader } from "@/components/screen-header";
import { PrimaryButton } from "@/components/primary-button";
import { FormError } from "@/components/form-error";
import { SuccessView } from "@/components/success-view";
import { useWallet } from "@/context/wallet";
import { describeClerkError } from "@/utils/clerk-errors";
import { goBack } from "@/utils/navigation";

// Clerk asks "is it really you?" before changing an email, if you signed in more than 10 minutes ago.
// It hands us these two functions: complete() = confirmed, carry on; cancel() = stop.
type Reverification = { complete: () => void; cancel: () => void };

// Change your email in two steps, like Create account: 1) the new address, 2) the code Clerk emails to it.
// Then the new address becomes your sign-in email, the old one is removed, and our server copies it.
export default function ChangeEmailScreen() {
  const { user } = useUser();
  const { session } = useSession();
  const { profile, emailChanged } = useWallet();

  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newEmailId, setNewEmailId] = useState(""); // Clerk's id for the new address
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // While this is set, the screen asks for your password instead
  const [reverification, setReverification] = useState<Reverification | null>(null);
  const [password, setPassword] = useState("");
  const cancelled = useRef(false); // you pressed Cancel on the password step, so its error isn't a real error

  // useReverification wraps a Clerk action. If Clerk says "confirm it's you first", it calls
  // onNeedsReverification, waits for complete() or cancel(), then runs the action again (or gives up).
  const askForPassword = {
    onNeedsReverification: ({ complete, cancel }: Reverification) => setReverification({ complete, cancel }),
  };
  const addEmail = useReverification((address: string) => user!.createEmailAddress({ email: address }), askForPassword);
  const makePrimary = useReverification(
    (id: string) => user!.update({ primaryEmailAddressId: id }),
    askForPassword,
  );
  const removeEmail = useReverification(
    async (id: string) => user!.emailAddresses.find((e) => e.id === id)?.destroy(),
    askForPassword,
  );

  function showError(caught: unknown) {
    if (cancelled.current) {
      cancelled.current = false; // you cancelled: just stop, no red message
      return;
    }
    setError(describeClerkError(caught).message);
  }

  // Step 1: add the new address to your Clerk account and email it a code
  async function handleSendCode() {
    const address = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError("Enter a valid email, e.g. name@example.com.");
    if (address === profile.email.toLowerCase()) return setError("That's already your email.");

    setBusy(true);
    setError("");
    try {
      // Tried before and didn't finish? Clerk still has the address, so use it again instead of adding it twice
      const existing = user!.emailAddresses.find((e) => e.emailAddress.toLowerCase() === address);
      const added = existing ?? (await addEmail(address));
      await added.prepareVerification({ strategy: "email_code" });
      setNewEmailId(added.id);
      setStep("code");
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  }

  // Step 2: check the code, then switch your sign-in email to the new one
  async function handleVerify() {
    const added = user!.emailAddresses.find((e) => e.id === newEmailId);
    if (!added) return setError("Something went wrong. Go back and enter your new email again.");
    if (code.trim().length < 6) return setError("Enter the 6-digit code from the email.");

    setBusy(true);
    setError("");
    try {
      const checked = await added.attemptVerification({ code: code.trim() });
      if (checked.verification.status !== "verified") throw new Error("That code didn't work. Try again.");

      const oldEmailId = user!.primaryEmailAddressId;
      await makePrimary(added.id); // sign in with the new email from now on
      if (oldEmailId && oldEmailId !== added.id) await removeEmail(oldEmailId); // the old one isn't needed
      await emailChanged(); // our server copies it, so the profile shows it
      setStep("done");
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  }

  // "Confirm it's you": check your password, then let Clerk carry on with the action that was waiting
  async function handleConfirmPassword() {
    if (!reverification || !session) return;
    if (!password) return setError("Enter your password.");
    setError("");
    try {
      const verification = await session.startVerification({ level: "first_factor" });
      if (verification.status === "needs_first_factor") {
        const result = await session.attemptFirstFactorVerification({ strategy: "password", password });
        if (result.status !== "complete") throw new Error("Clerk needs another check we don't support yet.");
      }
      setPassword("");
      setReverification(null);
      reverification.complete(); // the waiting action now runs
    } catch (caught) {
      setError(describeClerkError(caught).message); // e.g. "Password is incorrect"
    }
  }

  function handleCancelPassword() {
    cancelled.current = true;
    setPassword("");
    setError("");
    setReverification(null);
    reverification?.cancel(); // the waiting action stops with an error, which showError ignores
  }

  if (step === "done") {
    return (
      <SuccessView title="Email changed" message={`You now sign in with ${email.trim().toLowerCase()}.`}>
        <PrimaryButton label="Done" onPress={() => goBack()} />
      </SuccessView>
    );
  }

  if (reverification) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Confirm it's you" />
        <Text style={styles.intro}>For your safety, enter your password before changing your email.</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError("");
            }}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleConfirmPassword}
            autoFocus
          />
        </View>
        <FormError message={error} />
        <PrimaryButton label="Confirm" onPress={handleConfirmPassword} disabled={!password} />
        <PrimaryButton label="Cancel" variant="secondary" onPress={handleCancelPassword} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Change email" />

      {step === "email" ? (
        <>
          <Text style={styles.intro}>{`Your email now: ${profile.email}. We'll send a code to the new one.`}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>New email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError("");
              }}
              placeholder="name@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={handleSendCode}
              autoFocus
            />
          </View>
          <FormError message={error} />
          <PrimaryButton label={busy ? "Sending…" : "Send code"} onPress={handleSendCode} disabled={busy} />
        </>
      ) : (
        <>
          <Text style={styles.intro}>{`We sent a 6-digit code to ${email.trim().toLowerCase()}.`}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={(text) => {
                setCode(text.replace(/\D/g, ""));
                setError("");
              }}
              placeholder="123456"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              autoFocus
            />
          </View>
          <FormError message={error} />
          <PrimaryButton label={busy ? "Checking…" : "Change email"} onPress={handleVerify} disabled={busy} />
          <PrimaryButton
            label="Use a different email"
            variant="secondary"
            onPress={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl, gap: spacing.lg },
  intro: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  field: { gap: spacing.sm },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
});
