// Everything the app asks the server for, and the translation from the server's shape
// (snake_case, number ids, created_at) to the shape the screens already use (camelCase, string ids, date).
// Every request carries the sign-in ticket (see client.ts), so the server knows who "me" is.
import { palette, type Tone } from "@/constants/theme";
import type { Contact, Message, Profile, Transaction } from "@/types/wallet";
import { initialsOf } from "@/utils/formats";
import { api, API_URL } from "./client";

// ---- What the server sends back ----

type ServerUser = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  image_url: string | null;
  balance: number;
  monthly_budget: number;
  hide_balance: boolean;
};
type ServerContact = {
  id: number;
  name: string;
  phone: string;
  image_url: string | null;
  unread: number;
  added_at: string;
  on_walletchat: boolean;
};
type ServerMessage = {
  id: number;
  sender_id: number;
  receiver_id: number;
  kind: Message["kind"];
  text: string | null;
  amount: number | null;
  contact_name: string | null;
  contact_phone: string | null;
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
    imageUrl: c.image_url ?? undefined,
    addedAt: c.added_at,
    onWalletChat: c.on_walletchat,
  };
}

// meId: my own user id, so we know which side of the chat each message is on
function toMessage(m: ServerMessage, meId: number): Message {
  const fromMe = m.sender_id === meId;
  const base = {
    id: String(m.id),
    contactId: String(fromMe ? m.receiver_id : m.sender_id), // the *other* person
    fromMe,
    sentAt: m.sent_at,
  };
  switch (m.kind) {
    case "text":
      return { ...base, kind: "text", text: m.text ?? "" };
    case "contact":
      return { ...base, kind: "contact", contactName: m.contact_name ?? "", contactPhone: m.contact_phone ?? "" };
    case "photo":
      return { ...base, kind: "photo", photoUrl: `${API_URL}/messages/${m.id}/photo` };
    default: // payment or request
      return { ...base, kind: m.kind, amount: m.amount ?? 0 };
  }
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

// Asks for all four at the same time (Promise.all) instead of one after another.
// If I have no wallet yet, GET /me fails with code "profile_missing" and the app shows "Create your wallet".
export async function fetchWallet(): Promise<WalletData> {
  const [user, contacts, messages, transactions] = await Promise.all([
    api<ServerUser>("/me"),
    api<ServerContact[]>("/me/contacts"),
    api<ServerMessage[]>("/me/messages"),
    api<ServerTransaction[]>("/me/transactions"),
  ]);

  return {
    profile: { name: user.name, email: user.email ?? "", phone: user.phone, imageUrl: user.image_url ?? undefined },
    balance: user.balance,
    monthlyBudget: user.monthly_budget,
    hideBalance: user.hide_balance,
    contacts: contacts.map(toContact),
    unread: Object.fromEntries(contacts.map((c) => [String(c.id), c.unread])),
    messages: messages.map((m) => toMessage(m, user.id)),
    transactions: transactions.map(toTransaction),
  };
}

// ---- Actions (the sender is always me: the server takes it from the ticket) ----

// First sign-in: create my wallet with my name and phone number (my email comes from Clerk)
export function createProfile(name: string, phone: string) {
  return api("/me", { method: "POST", body: { name, phone } });
}

// After changing my picture on Clerk: the server copies its new address so my contacts see it too
export function syncProfilePicture() {
  return api("/me/picture", { method: "POST" });
}

export function sendTransfer(contactId: string, amount: number) {
  return api("/transfers", { method: "POST", body: { toUserId: Number(contactId), amount } });
}

export function sendTextMessage(contactId: string, text: string) {
  return api("/messages", { method: "POST", body: { receiverId: Number(contactId), kind: "text", text } });
}

export function sendRequest(contactId: string, amount: number) {
  return api("/messages", { method: "POST", body: { receiverId: Number(contactId), kind: "request", amount } });
}

// photo: the picture as text, "data:image/jpeg;base64,…"
export function sendPhotoMessage(contactId: string, photo: string) {
  return api("/messages/photo", { method: "POST", body: { receiverId: Number(contactId), photo } });
}

// Share someone's name and number in a chat, as a contact card
export function sendContactCard(contactId: string, contactName: string, contactPhone: string) {
  return api("/messages", {
    method: "POST",
    body: { receiverId: Number(contactId), kind: "contact", contactName, contactPhone },
  });
}

export function sendTopUp(amount: number, source: string) {
  return api("/top-ups", { method: "POST", body: { amount, source } });
}

export async function createContact(name: string, phone: string) {
  return toContact(await api<ServerContact>("/me/contacts", { method: "POST", body: { name, phone } }));
}

export function markChatRead(contactId: string) {
  return api(`/me/contacts/${contactId}/read`, { method: "POST" });
}

export function updateSettings(changes: { name?: string; monthlyBudget?: number; hideBalance?: boolean }) {
  return api("/me", { method: "PATCH", body: changes });
}
