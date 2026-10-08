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