import type { Tone } from "@/constants/theme";

export type Contact = {
  id: string;
  name: string;
  initials: string;
  tone: Tone;
};

export type Transaction = {
  id: string;
  title: string;
  subtitle: string;
  amount: number; // negative = money out, positive = money in
  category: "transfer" | "income" | "transport" | "bills" | "shopping";
};

export const balance = 250000;

export const contacts: Contact[] = [
  { id: "1", name: "Aline", initials: "AM", tone: "teal" },
  { id: "2", name: "Eric", initials: "EN", tone: "amber" },
  { id: "3", name: "Grace", initials: "GU", tone: "indigo" },
  { id: "4", name: "Kevin", initials: "KI", tone: "green" },
];

export const transactions: Transaction[] = [
  { id: "t1", title: "Aline M.", subtitle: "Sent in chat · 12:40", amount: -5000, category: "transfer" },
  { id: "t2", title: "Salary", subtitle: "Income · 08:00", amount: 180000, category: "income" },
  { id: "t3", title: "Bus fare", subtitle: "Transport · Yesterday", amount: -600, category: "transport" },
  { id: "t4", title: "Electricity", subtitle: "Bills · Mon", amount: -10000, category: "bills" },
];

export type Chat = {
  contactId: string;
  unread: number;
};

export const chats: Chat[] = [
  { contactId: "1", unread: 2 },
  { contactId: "2", unread: 0 },
  { contactId: "3", unread: 1 },
  { contactId: "4", unread: 0 },
];

type MessageBase = {
  id:string;
  contactId: string;
  fromMe: boolean;
  time: string;
};

export type Message =
  | (MessageBase & { kind: "text"; text: string })
  | (MessageBase & {kind: "payment"; amount: number});

 export const messages: Message[] = [
  { id: "m1", contactId: "1", fromMe: false, time: "12:30", kind: "text", text: "Hey! Can you send me 5k for the tickets?" },
  { id: "m2", contactId: "1", fromMe: true, time: "12:38", kind: "text", text: "Sure, sending now" },
  { id: "m3", contactId: "1", fromMe: true, time: "12:40", kind: "payment", amount: 5000 },
  { id: "m4", contactId: "1", fromMe: false, time: "12:41", kind: "text", text: "Thanks for the 5k! 🙏" },
  { id: "m5", contactId: "2", fromMe: false, time: "10:15", kind: "text", text: "Are we splitting lunch?" },
  { id: "m6", contactId: "3", fromMe: false, time: "Yesterday", kind: "payment", amount: 600 },
  { id: "m7", contactId: "3", fromMe: false, time: "Yesterday", kind: "text", text: "Sent you the bus fare" },
  { id: "m8", contactId: "4", fromMe: true, time: "Mon", kind: "text", text: "See you tomorrow" },
];