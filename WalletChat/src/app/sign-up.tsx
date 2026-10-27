import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useSignUp } from "@clerk/expo";
import { PrimaryButton } from "@/components/primary-button";
import { FormError } from "@/components/form-error";
import { AuthField, AuthScreen, AuthSwitch, authStyles } from "@/components/auth-ui";
import { describeClerkError } from "@/utils/clerk-errors";

const MIN_PASSWORD = 8; // the same minimum as in the Clerk settings

// "0788 123 456", "250788123456" or "+250 788 123 456" are all fine; the server stores one standard form
function isValidPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return (
    (digits.length === 10 && digits.startsWith("07")) ||
    (digits.length === 12 && digits.startsWith("250")) ||
    (input.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15)
  );
}

// Create an account in two steps: 1) the form, 2) the code Clerk emails you to prove the email is yours
export default function SignUpScreen() {
  const { signUp } = useSignUp();

  const [step, setStep] = useState<"form" | "code">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Step 1: create the Clerk account and email a code
  async function handleCreate() {
    if (!name.trim()) return setError("Enter your full name.");
    if (!isValidPhone(phone)) return setError("Enter your phone number, e.g. 0788 123 456.");
    if (!email.trim()) return setError("Enter your email.");
    if (password.length < MIN_PASSWORD) return setError(`Your password needs at least ${MIN_PASSWORD} characters.`);

    setBusy(true);
    setError("");
    try {
      // Name and phone are for your WalletChat wallet, not for Clerk's sign-in, so they travel along as
      // "unsafeMetadata": extra details the app may write. The server checks them again when it creates the wallet.
      const { error: createError } = await signUp.password({
        emailAddress: email.trim(),
        password,
        unsafeMetadata: { name: name.trim(), phone: phone.trim() },
      });
      if (createError) return setError(describeClerkError(createError).message);

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) return setError(describeClerkError(sendError).message);

      setStep("code");
    } finally {
      setBusy(false);
    }
  }

  // Step 2: check the emailed code. When it's right, the account is complete and you are signed in.
  async function handleVerify() {
    if (code.trim().length < 6) return setError("Enter the 6-digit code.");

    setBusy(true);
    setError("");
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verifyError) return setError(describeClerkError(verifyError).message);

      if (signUp.status === "complete") {
        await signUp.finalize({ navigate: () => router.replace("/") });
      } else {
        setError(`Couldn't finish creating your account. Clerk still needs: ${signUp.missingFields.join(", ")}.`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError("");
    setNotice("");
    const { error: resendError } = await signUp.verifications.sendEmailCode();
    if (resendError) setError(describeClerkError(resendError).message);
    else setNotice("We sent you a new code.");
  }

  function handleBack() {
    signUp.reset(); // forget this attempt, so the form can be changed and sent again
    setCode("");
    setError("");
    setNotice("");
    setStep("form");
  }

  if (step === "code") {
    return (
      <AuthScreen title="Check your email" subtitle={`Enter the 6-digit code we sent to ${email.trim()}.`}>
        <AuthField
          label="Code"
          value={code}
          onChangeText={(text) => {
            setCode(text.replace(/\D/g, ""));
            setError("");
          }}
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode" // iPhone suggests the code from your email
          returnKeyType="done"
          onSubmitEditing={handleVerify}
          style={authStyles.codeInput}
          autoFocus
        />
        <FormError message={error} />
        {notice ? <Text style={authStyles.notice}>{notice}</Text> : null}
        <PrimaryButton label={busy ? "Checking…" : "Verify email"} onPress={handleVerify} disabled={busy} />
        <View style={authStyles.links}>
          <Pressable onPress={handleResend} hitSlop={8}>
            <Text style={authStyles.link}>Send a new code</Text>
          </Pressable>
          <Pressable onPress={handleBack} hitSlop={8}>
            <Text style={authStyles.link}>Change my details</Text>
          </Pressable>
        </View>
        {__DEV__ ? (
          <Text style={authStyles.hint}>Testing? Emails ending in +clerk_test@example.com use the code 424242.</Text>
        ) : null}
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Create your account" subtitle="Send and receive money with the people you chat with.">
      <AuthField
        label="Full name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError("");
        }}
        placeholder="e.g. Sandra Gaju"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
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
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <AuthField
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError("");
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <AuthField
        label={`Password (at least ${MIN_PASSWORD} characters)`}
        secret
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError("");
        }}
        placeholder="Choose a password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />

      <FormError message={error} />
      <PrimaryButton label={busy ? "Creating account…" : "Create account"} onPress={handleCreate} disabled={busy} />

      <AuthSwitch question="Already have an account?" action="Sign in" onPress={() => router.replace("/sign-in")} />

      {/* Clerk's bot protection shows its check here when needed (required on sign-up screens) */}
      <View nativeID="clerk-captcha" />
    </AuthScreen>
  );
}
