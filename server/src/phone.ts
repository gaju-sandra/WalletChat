// One standard format for phone numbers, so the same person is always recognised:
//   Rwandan numbers: "0788 555 123", "+250 788 555 123", "250788555123" → "0788555123"
//   other countries (e.g. Clerk's test numbers "+1 555 555 0100")     → "+15555550100"
// Returns null if it isn't a valid number.
export function normalizePhone(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("250")) return `0${digits.slice(3)}`;
  if (digits.length === 10 && digits.startsWith("07")) return digits;
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}
