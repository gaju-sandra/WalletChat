import { createContext, useContext, useState, type ReactNode } from "react";
import { palette, type Tone } from "@/constants/theme";
import {
  balance as initialBalance,
  contacts as initialContacts,
  messages as initialMessages,
  profile as initialProfile,
  transactions as initialTransactions,
  unreadCounts as initialUnread,
  type Contact,
  type Message,
  type Profile,
  type Transaction,
} from "@/data/mock";
import { formatTime, initialsOf } from "@/utils/formats";
import { buildNotifications, type AppNotification } from "@/utils/notifications";

const tones = Object.keys(palette) as Tone[];

type WalletContextValue = {
  balance: number;
  transactions: Transaction[];
  messages: Message[];
  contacts: Contact[];
  unread: Record<string, number>;
  sendMoney: (contactId: string, amount: number) => void;
  sendMessage: (contactId: string, text: string) => void;
  topUp: (amount: number, source: string) => void;
  requestMoney: (contactId: string, amount: number) => void;
  addContact: (name: string, phone: string) => Contact;
  markRead: (contactId: string) => void;
  notifications: AppNotification[];
  seenNotificationIds: string[];
  markNotificationsSeen: () => void;
  profile: Profile;
  updateName: (name: string) => void;
  monthlyBudget: number;
  setMonthlyBudget: (amount: number) => void;
  hideBalance: boolean;
  setHideBalance: (hide: boolean) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [unread, setUnread] = useState<Record<string, number>>(initialUnread);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [monthlyBudget, setMonthlyBudget] = useState(150000);
  const [hideBalance, setHideBalance] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);

  // Worked out fresh on every render from the state above, never stored
  const notifications = buildNotifications({ contacts, messages, transactions, unread, monthlyBudget });

  function updateName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProfile((prev) => ({ ...prev, name: trimmed }));
  }

  function sendMoney(contactId: string, amount: number) {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || amount <= 0) return;

    const now = new Date();
    const time = formatTime(now);

    setBalance((prev) => prev - amount);
    setTransactions((prev) => [
      {
        id: `t${now.getTime()}`,
        title: contact.name,
        subtitle: `Sent in chat · ${time}`,
        amount: -amount, // negative = money out
        category: "transfer",
        date: now.toISOString(),
      },
      ...prev, // newest first
    ]);
    setMessages((prev) => [
      ...prev, // oldest first, like a real chat
      { id: `m${now.getTime()}`, contactId, fromMe: true, sentAt: now.toISOString(), kind: "payment", amount },
    ]);
  }

  function sendMessage(contactId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return; // don't send empty messages

    const now = new Date();
    setMessages((prev) => [
      ...prev,
      { id: `m${now.getTime()}`, contactId, fromMe: true, sentAt: now.toISOString(), kind: "text", text: trimmed },
    ]);
  }

  function topUp(amount: number, source: string) {
    if (amount <= 0) return;

    const now = new Date();
    setBalance((prev) => prev + amount);
    setTransactions((prev) => [
      {
        id: `t${now.getTime()}`,
        title: "Top up",
        subtitle: `${source} · ${formatTime(now)}`,
        amount, // positive = money in
        category: "income",
        date: now.toISOString(),
      },
      ...prev,
    ]);
  }

  // A request moves no money, so it is only a chat message, not a transaction
  function requestMoney(contactId: string, amount: number) {
    if (amount <= 0) return;

    const now = new Date();
    setMessages((prev) => [
      ...prev,
      { id: `m${now.getTime()}`, contactId, fromMe: true, sentAt: now.toISOString(), kind: "request", amount },
    ]);
  }

  // Returns the new contact so the caller can open a chat with them straight away
  function addContact(name: string, phone: string) {
    const trimmed = name.trim();
    const contact: Contact = {
      id: `c${Date.now()}`,
      name: trimmed,
      initials: initialsOf(trimmed),
      tone: tones[contacts.length % tones.length], // cycle through the avatar colours
      phone: phone.trim(),
      addedAt: new Date().toISOString(),
    };
    setContacts((prev) => [contact, ...prev]); // newest first
    return contact;
  }

  function markRead(contactId: string) {
    // Return the same object when there is nothing to clear, so React skips the re-render
    setUnread((prev) => (prev[contactId] ? { ...prev, [contactId]: 0 } : prev));
  }

  function markNotificationsSeen() {
    setSeenNotificationIds((prev) => {
      const unseen = notifications.filter((n) => !prev.includes(n.id));
      // Same array back when nothing changed, so React skips the re-render
      return unseen.length === 0 ? prev : [...prev, ...unseen.map((n) => n.id)];
    });
  }

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        messages,
        contacts,
        unread,
        sendMoney,
        sendMessage,
        topUp,
        requestMoney,
        addContact,
        markRead,
        notifications,
        seenNotificationIds,
        markNotificationsSeen,
        profile,
        updateName,
        monthlyBudget,
        setMonthlyBudget,
        hideBalance,
        setHideBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside WalletProvider");
  return wallet;
}
