const digitsOnly = (text: string) => text.replace(/\D/g, "");

// True when two numbers are the same phone, however they are written: "0788 555 123", "+250788555123"…
// Comparing the last 9 digits ignores the country code and the leading 0.
export function samePhone(a: string | undefined, b: string | undefined) {
  if (!a || !b) return false;
  return digitsOnly(a).slice(-9) === digitsOnly(b).slice(-9);
}
