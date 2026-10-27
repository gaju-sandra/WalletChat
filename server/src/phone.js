// One standard format for Rwandan numbers, so "0788 555 123", "+250 788 555 123" and "250788555123"
// are all stored as "0788555123" and recognised as the same person. Returns null if it isn't a valid number.
export function normalizePhone(input) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("250")) return `0${digits.slice(3)}`;
  if (digits.length === 10 && digits.startsWith("07")) return digits;
  return null;
}
