import { isClerkAPIResponseError } from "@clerk/expo";

// Clerk errors carry a code (what went wrong, for the app, e.g. "form_password_incorrect")
// and a message (for people, e.g. "Password is incorrect. Try again, or use another method.")
export function describeClerkError(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    return { code: first?.code, message: first?.longMessage ?? first?.message ?? error.message };
  }
  return { code: undefined, message: error instanceof Error ? error.message : String(error) };
}
