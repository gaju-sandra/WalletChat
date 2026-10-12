export function formatRWF(amount: number) {
  return `RWF ${Math.abs(amount).toLocaleString("en-US")}`;
}

export function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}