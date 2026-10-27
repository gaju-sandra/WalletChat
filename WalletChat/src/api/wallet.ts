// Everything the app asks the server for, and the translation from the server's shape
// (snake_case, number ids, created_at) to the shape the screens already use (camelCase, string ids, date)
import { palette, type Tone } from "@/constants/theme";
import type { Contact, Message, Profile, Transaction } from "@/data/mock";
import { initialsOf } from "@/utils/formats";
import { api, CURRENT_USER_ID as me } from "./client";

// ---- What the server sends back ----

type ServerUser = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  balance: number;
  monthly_budget: number;
  hide_balance: boolean;
};
type ServerContact = { id: number; name: string; phone: string; unread: number; added_at: string };
type ServerMessage = {
  id: number;
  sender_id: number;
  receiver_id: number;
  kind: Message["kind"];
  text: string | null;
  amount: number | null;
  sent_at: string;
};
type ServerTransaction = Omit<Transaction, "id" | "date"> & { id: number; created_at: string };

// ---- Translating to the app's shape ----

const tones = Object.keys(palette) as Tone[];

function toContact(c: ServerContact): Contact {
  return {
    id: String(c.id),
    name: c.name,
    initials: initialsOf(c.name),
    tone: tones[(c.id + 3) % tones.length], // same colour for the same person every time
    phone: c.phone,
    addedAt: c.added_at,
  };
}

function toMessage(m: ServerMessage): Message {
  const base = {
    id: String(m.id),
    contactId: String(m.sender_id === me ? m.receiver_id : m.sender_id), // the *other* person
    fromMe: m.sender_id === me,
    sentAt: m.sent_at,
  };
  return m.kind === "text"
    ? { ...base, kind: "text", text: m.text ?? "" }
    : { ...base, kind: m.kind, amount: m.amount ?? 0 };
}

function toTransaction(t: ServerTransaction): Transaction {
  return {
    id: String(t.id),
    title: t.title,
    subtitle: t.subtitle,
    amount: t.amount,
    category: t.category,
    date: t.created_at,
  };
}

// ---- Loading ----

export type WalletData = {
  profile: Profile;
  balance: number;
  monthlyBudget: number;
  hideBalance: boolean;
  contacts: Contact[];
  unread: Record<string, number>;
  messages: Message[];
  transactions: Transaction[];
};

// Asks for all four at the same time (Promise.all) instead of one after another
export async function fetchWallet(): Promise<WalletData> {
  const [user, contacts, messages, transactions] = await Promise.all([
    api<ServerUser>(`/users/${me}`),
    api<ServerContact[]>(`/users/${me}/contacts`),
    api<ServerMessage[]>(`/users/${me}/messages`),
    api<ServerTransaction[]>(`/users/${me}/transactions`),
  ]);

  return {
    profile: { name: user.name, email: user.email ?? "", phone: user.phone },
    balance: user.balance,
    monthlyBudget: user.monthly_budget,
    hideBalance: user.hide_balance,
    contacts: contacts.map(toContact),
    unread: Object.fromEntries(contacts.map((c) => [String(c.id), c.unread])),
    messages: messages.map(toMessage),
    transactions: transactions.map(toTransaction),
  };
}

// ---- Actions ----

export function sendTransfer(contactId: string, amount: number) {
  return api("/transfers", { method: "POST", body: { fromUserId: me, toUserId: Number(contactId), amount } });
}

export function sendTextMessage(contactId: string, text: string) {
  return api("/messages", { method: "POST", body: { senderId: me, receiverId: Number(contactId), kind: "text", text } });
}

export function sendRequest(contactId: string, amount: number) {
  return api("/messages", {
    method: "POST",
    body: { senderId: me, receiverId: Number(contactId), kind: "request", amount },
  });
}

export function sendTopUp(amount: number, source: string) {
  return api("/top-ups", { method: "POST", body: { userId: me, amount, source } });
}

export async function createContact(name: string, phone: string) {
  return toContact(await api<ServerContact>(`/users/${me}/contacts`, { method: "POST", body: { name, phone } }));
}

export function markChatRead(contactId: string) {
  return api(`/users/${me}/contacts/${contactId}/read`, { method: "POST" });
}

export function updateSettings(changes: { name?: string; monthlyBudget?: number; hideBalance?: boolean }) {
  return api(`/users/${me}`, { method: "PATCH", body: changes });
}
