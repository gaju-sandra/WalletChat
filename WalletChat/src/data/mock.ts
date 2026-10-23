import type { Tone } from "@/constants/theme";

export type Contact = {
  id: string;
  name: string;
  initials: string;
  tone: Tone;
  phone?: string;
  addedAt?: string; // ISO date, set when you add someone (so a new chat can go to the top)
};

// Makes a date "N days ago" so the fake data always looks recent
function daysAgo(days: number, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

// Same idea for chat messages that happened earlier today
function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export type Transaction = {
  id: string;
  title: string;
  subtitle: string;
  amount: number; // negative = money out, positive = money in
  category: "transfer" | "income" | "transport" | "bills" | "shopping";
  date: string; // ISO date, e.g. "2026-10-12T10:00:00.000Z"
};

export const balance = 250000;

export const contacts: Contact[] = [
  { id: "1", name: "Aline", initials: "AM", tone: "teal", phone: "0788 111 111" },
  { id: "2", name: "Eric", initials: "EN", tone: "amber", phone: "0788 222 222" },
  { id: "3", name: "Grace", initials: "GU", tone: "indigo", phone: "0788 333 333" },
  { id: "4", name: "Kevin", initials: "KI", tone: "green", phone: "0788 444 444" },
];

export const transactions: Transaction[] = [
  { id: "t1", title: "Aline M.", subtitle: "Sent in chat · 12:40", amount: -5000, category: "transfer", date: daysAgo(0, 12) },
  { id: "t2", title: "Salary", subtitle: "Income · 08:00", amount: 180000, category: "income", date: daysAgo(0, 8) },
  { id: "t3", title: "Bus fare", subtitle: "Transport", amount: -600, category: "transport", date: daysAgo(1) },
  { id: "t4", title: "Electricity", subtitle: "Bills", amount: -10000, category: "bills", date: daysAgo(2) },
  { id: "t5", title: "Groceries", subtitle: "Shopping", amount: -8500, category: "shopping", date: daysAgo(3) },
  { id: "t6", title: "Moto", subtitle: "Transport", amount: -1500, category: "transport", date: daysAgo(4) },
  { id: "t7", title: "Eric N.", subtitle: "Sent in chat", amount: -3000, category: "transfer", date: daysAgo(5) },
  { id: "t8", title: "Internet", subtitle: "Bills", amount: -15000, category: "bills", date: daysAgo(6) },
];

// How many unread messages each chat starts with (contactId → count)
export const unreadCounts: Record<string, number> = { "1": 2, "3": 1 };

type MessageBase = {
  id:string;
  contactId: string;
  fromMe: boolean;
  sentAt: string; // ISO date. Labels like "14:05" or "Yesterday" are worked out from it when shown
};

export type Message =
  | (MessageBase & { kind: "text"; text: string })
  | (MessageBase & {kind: "payment"; amount: number})
  | (MessageBase & { kind: "request"; amount: number });

 export const messages: Message[] = [
  { id: "m1", contactId: "1", fromMe: false, sentAt: minutesAgo(60), kind: "text", text: "Hey! Can you send me 5k for the tickets?" },
  { id: "m2", contactId: "1", fromMe: true, sentAt: minutesAgo(52), kind: "text", text: "Sure, sending now" },
  { id: "m3", contactId: "1", fromMe: true, sentAt: minutesAgo(50), kind: "payment", amount: 5000 },
  { id: "m4", contactId: "1", fromMe: false, sentAt: minutesAgo(49), kind: "text", text: "Thanks for the 5k! 🙏" },
  { id: "m5", contactId: "2", fromMe: false, sentAt: minutesAgo(180), kind: "text", text: "Are we splitting lunch?" },
  { id: "m9", contactId: "2", fromMe: false, sentAt: minutesAgo(179), kind: "request", amount: 4000 },
  { id: "m6", contactId: "3", fromMe: false, sentAt: daysAgo(1, 17), kind: "payment", amount: 600 },
  { id: "m7", contactId: "3", fromMe: false, sentAt: daysAgo(1, 18), kind: "text", text: "Sent you the bus fare" },
  { id: "m8", contactId: "4", fromMe: true, sentAt: daysAgo(4, 19), kind: "text", text: "See you tomorrow" },
];

export type Profile = {
  name: string;
  email: string;
  phone: string;
};

export const profile: Profile = {
  name: "Sandra Gaju",
  email: "sandra@example.com",
  phone: "+250 788 000 000",
};