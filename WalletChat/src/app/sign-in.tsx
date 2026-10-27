import { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { isClerkAPIResponseError, useSignIn, useSignUp } from "@clerk/expo";
import { Wallet } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { PrimaryButton } from "@/components/primary-button";
import { FormError } from "@/components/form-error";

// Clerk needs international format: "0788 123 456" → "+250788123456".
// Numbers that already start with "+" (like Clerk's test numbers, "+1 555 555 0100") are kept.
function toInternational(input: string) {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("07")) return `+250${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("250")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

// Clerk errors carry a code (what went wrong, for the app) and a message (for people)
function describe(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    return { code: first?.code, message: first?.longMessage ?? first?.message ?? error.message };
  }
  return { code: undefined, message: error instanceof Error ? error.message : String(error) };
}

// After a successful sign-in: go to the app. (Session "tasks", like forced extra security steps,
// would be handled here; WalletChat doesn't turn any on.)
function goToApp() {
  router.replace("/");
}

// One screen for everyone: if your number has no account yet, signing in becomes signing up automatically
export default function SignInScreen() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn"); // existing account, or a new one
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Step 1: send a code to the phone
  async function handleSendCode() {
    const phoneNumber = toInternational(phone);
    if (!phoneNumber) return setError("Enter your phone number, e.g. 0788 123 456.");

    setBusy(true);
    setError("");
    try {
      // Try to sign in. This also sends the SMS code.
      const { error: signInError } = await signIn.phoneCode.sendCode({ phoneNumber });
      if (!signInError) {
        setMode("signIn");
        setStep("code");
        return;
      }

      const problem = describe(signInError);
      if (problem.code !== "form_identifier_not_found") return setError(problem.message);

      // No account with this number yet: create one, then send the code
      const { error: createError } = await signUp.create({ phoneNumber });
      if (createError) return setError(describe(createError).message);
      const { error: sendError } = await signUp.verifications.sendPhoneCode();
      if (sendError) return setError(describe(sendError).message);

      setMode("signUp");
      setStep("code");
    } finally {
      setBusy(false);
    }
  }

  // Step 2: check the code the person typed
  async function handleVerify() {
    if (code.trim().length < 6) return setError("Enter the 6-digit code.");

    setBusy(true);
    setError("");
    try {
      if (mode === "signIn") {
        const { error: verifyError } = await signIn.phoneCode.verifyCode({ code: code.trim() });
        if (verifyError) return setError(describe(verifyError).message);
        if (signIn.status === "complete") await signIn.finalize({ navigate: goToApp });
        else setError(`Couldn't finish signing in (${signIn.status}).`);
      } else {
        const { error: verifyError } = await signUp.verifications.verifyPhoneCode({ code: code.trim() });
        if (verifyError) return setError(describe(verifyError).message);
        if (signUp.status === "complete") await signUp.finalize({ navigate: goToApp });
        else setError(`Couldn't finish signing up. Clerk still needs: ${signUp.missingFields.join(", ")}.`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError("");
    setNotice("");
    const { error: resendError } =
      mode === "signIn" ? await signIn.phoneCode.sendCode() : await signUp.verifications.sendPhoneCode();
    if (resendError) setError(describe(resendError).message);
    else setNotice("We sent you a new code.");
  }

  function handleChangeNumber() {
    signIn.reset(); // forget this attempt, so a different number can be used
    signUp.reset();
    setCode("");
    setError("");
    setNotice("");
    setStep("phone");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.content}>
          <View style={styles.logo}>
            <Wallet size={32} color="white" />
          </View>
          <Text style={styles.title}>WalletChat</Text>

          {step === "phone" ? (
            <>
              <Text style={styles.message}>Enter your phone number. We&apos;ll text you a code to sign in.</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setError("");
                }}
                placeholder="0788 123 456"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
              />
              <FormError message={error} />
              <PrimaryButton label={busy ? "Sending code…" : "Continue"} onPress={handleSendCode} disabled={busy} />
              {__DEV__ ? (
                <Text style={styles.hint}>Testing? Use +1 555 555 0100 and the code 424242. No real SMS is sent.</Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.message}>
                {mode === "signUp" ? "Welcome! " : "Welcome back! "}Enter the 6-digit code we sent to {phone}.
              </Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                onChangeText={(text) => {
                  setCode(text.replace(/\D/g, ""));
                  setError("");
                }}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="sms-otp" // Android suggests the code from the SMS
                textContentType="oneTimeCode" // iPhone suggests the code from the SMS
                returnKeyType="done"
                onSubmitEditing={handleVerify}
                autoFocus
              />
              <FormError message={error} />
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              <PrimaryButton label={busy ? "Checking…" : "Verify"} onPress={handleVerify} disabled={busy} />
              <View style={styles.links}>
                <Pressable onPress={handleResend} hitSlop={8}>
                  <Text style={styles.link}>Send a new code</Text>
                </Pressable>
                <Pressable onPress={handleChangeNumber} hitSlop={8}>
                  <Text style={styles.link}>Use a different number</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Clerk's bot protection shows its check here when needed (required on sign-up screens) */}
          <View nativeID="clerk-captcha" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, textAlign: "center" },
  message: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: "center" },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.text,
  },
  codeInput: { textAlign: "center", letterSpacing: 8, fontSize: 22 },
  notice: { fontFamily: fonts.medium, fontSize: 13, color: colors.success, textAlign: "center" },
  links: { flexDirection: "row", justifyContent: "space-between" },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.primary },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: "center" },
});
