import { useRef, useState } from "react";
import { router } from "expo-router";
import { useSignIn } from "@clerk/expo";
import { PrimaryButton } from "@/components/primary-button";
import { FormError } from "@/components/form-error";
import { AuthField, AuthScreen, AuthSwitch } from "@/components/auth-ui";
import { describeClerkError } from "@/utils/clerk-errors";

// For people who already have an account: email + password
export default function SignInScreen() {
  const { signIn } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Stops a second submit while one is still running (e.g. iPhone autofills the code AND you tap the button).
  // A ref changes instantly, unlike state, which only updates on the next render.
  const submitting = useRef(false);

  async function handleSignIn() {
    if (!email.trim() || !password) return setError("Enter your email and password.");
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      // Clerk checks the email and password. Every Clerk method answers { error }: null means it worked.
      const { error: signInError } = await signIn.password({ emailAddress: email.trim(), password });
      if (signInError) return setError(describeClerkError(signInError).message);

      if (signIn.status === "complete") {
        // Make this the active session. The layout then shows the app instead of this screen.
        await signIn.finalize({ navigate: () => router.replace("/") });
      } else {
        setError(`Couldn't finish signing in (${signIn.status}).`);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to your WalletChat account.">
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
        returnKeyType="next"
      />
      <AuthField
        label="Password"
        secret
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError("");
        }}
        placeholder="Your password"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleSignIn}
      />

      <FormError message={error} />
      <PrimaryButton label={busy ? "Signing in…" : "Sign in"} onPress={handleSignIn} disabled={busy} />

      <AuthSwitch question="New to WalletChat?" action="Create an account" onPress={() => router.replace("/sign-up")} />
    </AuthScreen>
  );
}
