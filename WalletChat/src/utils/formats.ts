export function formatRWF(amount: number) {
  return `RWF ${Math.abs(amount).toLocaleString("en-US")}`;
}

export function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// "Diane Mukamana" → "Diane" (for small spaces like under an avatar)
export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

// "Sandra Gaju" → "SG"
export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Calendar days between two dates: 0 = same day, 1 = yesterday, ... (ignores the time of day)
function daysBetween(date: Date, now: Date) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
}

// "Today", "Yesterday", or e.g. "Mon, 12 Oct"
export function dayLabel(date: Date, now = new Date()) {
  const daysAgo = daysBetween(date, now);

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// Chat-style time: "14:05" today, "Yesterday", "Mon" this week, then "12 Oct"
export function messageTime(date: Date, now = new Date()) {
  const daysAgo = daysBetween(date, now);

  if (daysAgo === 0) return formatTime(date);
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) return date.toLocaleDateString("en-GB", { weekday: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
