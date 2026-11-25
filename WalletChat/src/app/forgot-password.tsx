import { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSignIn } from "@clerk/expo";
import { PrimaryButton } from "@/components/primary-button";
import { FormError } from "@/components/form-error";
import { AuthField, AuthScreen, AuthSwitch } from "@/components/auth-ui";
import { describeClerkError } from "@/utils/clerk-errors";

// Forgot your password? Three steps, all done by Clerk:
//   1. your email → Clerk emails you a code
//   2. the code   → proves the email is yours
//   3. a new password → you're signed in with it
export default function ForgotPasswordScreen() {
  // The email you typed on Sign in comes along, so you don't type it twice
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useSignIn();

  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false); // stops a second tap while one is still running (see sign-in.tsx)

  // Runs one step: blocks double taps, shows "busy", and turns a Clerk error into a red message
  async function run(action: () => Promise<string | null>) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const problem = await action();
      if (problem) setError(problem);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  // Step 1: start a sign-in for this email, then ask Clerk for a reset code
  function handleSendCode() {
    if (!email.trim()) return setError("Enter your email.");
    return run(async () => {
      const { error: createError } = await signIn.create({ identifier: email.trim() });
      if (createError) return describeClerkError(createError).message; // e.g. no account with this email
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) return describeClerkError(sendError).message;
      setStep("code");
      return null;
    });
  }

  // Step 2: check the code
  function handleVerifyCode() {
    if (code.trim().length < 6) return setError("Enter the 6-digit code from the email.");
    return run(async () => {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyError) return describeClerkError(verifyError).message; // e.g. wrong or expired code
      if (signIn.status !== "needs_new_password") return `Couldn't check the code (${signIn.status}).`;
      setStep("password");
      return null;
    });
  }

  // Step 3: save the new password and sign in. Other phones signed in to this account are signed out,
  // in case someone else knew the old password.
  function handleNewPassword() {
    if (password.length < 8) return setError("Your new password needs at least 8 characters.");
    return run(async () => {
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (submitError) return describeClerkError(submitError).message; // e.g. a password found in a data leak
      if (signIn.status !== "complete") return `Couldn't finish signing in (${signIn.status}).`;
      // Like Sign in: make this the active session, and the layout shows the app
      await signIn.finalize({ navigate: () => router.replace("/") });
      return null;
    });
  }

  if (step === "code") {
    return (
      <AuthScreen title="Check your email" subtitle={`We sent a 6-digit code to ${email.trim()}.`}>
        <AuthField
          label="Code"
          value={code}
          onChangeText={(text) => {
            setCode(text.replace(/\D/g, ""));
            setError("");
          }}
          placeholder="123456"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={handleVerifyCode}
        />
        <FormError message={error} />
        <PrimaryButton label={busy ? "Checking…" : "Continue"} onPress={handleVerifyCode} disabled={busy} />
        <AuthSwitch question="Wrong email?" action="Change it" onPress={() => setStep("email")} />
      </AuthScreen>
    );
  }

  if (step === "password") {
    return (
      <AuthScreen title="New password" subtitle="Choose a password with at least 8 characters.">
        <AuthField
          label="New password"
          secret
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError("");
          }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleNewPassword}
        />
        <FormError message={error} />
        <PrimaryButton label={busy ? "Saving…" : "Save and sign in"} onPress={handleNewPassword} disabled={busy} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Forgot password" subtitle="Enter your email and we'll send you a code to reset it.">
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
        returnKeyType="send"
        onSubmitEditing={handleSendCode}
      />
      <FormError message={error} />
      <PrimaryButton label={busy ? "Sending…" : "Send code"} onPress={handleSendCode} disabled={busy} />
      <AuthSwitch question="Remembered it?" action="Back to sign in" onPress={() => router.replace("/sign-in")} />
    </AuthScreen>
  );
}
