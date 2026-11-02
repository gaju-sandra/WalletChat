// The shapes of the app's data. The real data comes from the server (see src/api/wallet.ts),
// which translates the server's answers into these shapes.
import type { Tone } from "@/constants/theme";

export type Contact = {
  id: string;
  name: string;
  initials: string;
  tone: Tone;
  phone?: string;
  imageUrl?: string; // their profile picture; without one the app shows their initials
  addedAt?: string; // ISO date, set when you add someone (so a new chat can go to the top)
  onWalletChat: boolean; // false = saved by phone number but no account yet, so money can't be sent to them
};

export type Transaction = {
  id: string;
  title: string;
  subtitle: string;
  amount: number; // negative = money out, positive = money in
  category: "transfer" | "income" | "transport" | "bills" | "shopping";
  date: string; // ISO date, e.g. "2026-10-12T10:00:00.000Z"
};

type MessageBase = {
  id: string;
  contactId: string; // the other person in the chat
  fromMe: boolean;
  sentAt: string; // ISO date. Labels like "14:05" or "Yesterday" are worked out from it when shown
};

export type Message =
  | (MessageBase & { kind: "text"; text: string })
  | (MessageBase & { kind: "payment"; amount: number })
  | (MessageBase & { kind: "request"; amount: number })
  | (MessageBase & { kind: "contact"; contactName: string; contactPhone: string }); // a shared contact card

export type Profile = {
  name: string;
  email: string;
  phone: string;
  imageUrl?: string; // my profile picture (stored by Clerk)
};
