export function formatRWF(amount: number) {
  return `RWF ${Math.abs(amount).toLocaleString("en-US")}`;
}