import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Contact, Message, Profile, Transaction } from "@/data/mock";
import {
  createContact,
  fetchWallet,
  markChatRead,
  sendRequest,
  sendTextMessage,
  sendTopUp,
  sendTransfer,
  updateSettings,
  type WalletData,
} from "@/api/wallet";
import { ServerStatus } from "@/components/server-status";
import { buildNotifications, type AppNotification } from "@/utils/notifications";

type WalletContextValue = {
  balance: number;
  transactions: Transaction[];
  messages: Message[];
  contacts: Contact[];
  unread: Record<string, number>;
  // These talk to the server, so they take time and can fail: screens `await` them and show the error
  sendMoney: (contactId: string, amount: number) => Promise<void>;
  sendMessage: (contactId: string, text: string) => Promise<void>;
  topUp: (amount: number, source: string) => Promise<void>;
  requestMoney: (contactId: string, amount: number) => Promise<void>;
  addContact: (name: string, phone: string) => Promise<Contact>;
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

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function WalletProvider({ children }: { children: ReactNode }) {
  // Everything from the server, or null until the first load finishes
  const [data, setData] = useState<WalletData | null>(null);
  const [loadError, setLoadError] = useState("");
  // Only this phone needs to remember which notifications you've seen, so this stays local
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);

  // Goes up by one each time "Try again" is pressed, which makes the effect below run again
  const [attempt, setAttempt] = useState(0);

  // Load when the app opens (and on every retry)
  useEffect(() => {
    let cancelled = false; // set if the provider goes away before the server answers
    fetchWallet().then(
      (wallet) => !cancelled && setData(wallet),
      (error) => !cancelled && setLoadError(messageOf(error)),
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Until the first load works, show a spinner or the error instead of the app
  if (!data) {
    return (
      <ServerStatus
        error={loadError}
        onRetry={() => {
          setLoadError("");
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  // After every change: ask the server for the fresh data, so the screen always matches the database
  async function refresh() {
    setData(await fetchWallet());
  }

  async function sendMoney(contactId: string, amount: number) {
    await sendTransfer(contactId, amount); // throws "Not enough balance" etc., which the Send screen shows
    await refresh();
  }

  async function sendMessage(contactId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return; // don't send empty messages
    await sendTextMessage(contactId, trimmed);
    await refresh();
  }

  async function topUp(amount: number, source: string) {
    await sendTopUp(amount, source);
    await refresh();
  }

  // A request moves no money, so it is only a chat message, not a transaction
  async function requestMoney(contactId: string, amount: number) {
    await sendRequest(contactId, amount);
    await refresh();
  }

  // Returns the new contact so the caller can open a chat with them straight away
  async function addContact(name: string, phone: string) {
    const contact = await createContact(name, phone);
    await refresh();
    return contact;
  }

  function markRead(contactId: string) {
    // Nothing to clear: stop here (this also stops the chat screen asking the server again on every render)
    if (!data?.unread[contactId]) return;
    // Clear the badge on screen straight away, then tell the server
    setData((prev) => prev && { ...prev, unread: { ...prev.unread, [contactId]: 0 } });
    markChatRead(contactId).catch((error) => console.warn("Couldn't mark the chat as read:", messageOf(error)));
  }

  // Settings change on screen straight away ("optimistic update") and are saved in the background.
  // If saving fails, reload, so the screen goes back to what the server really has.
  function saveSettings(changes: Parameters<typeof updateSettings>[0], update: (prev: WalletData) => WalletData) {
    setData((prev) => prev && update(prev));
    updateSettings(changes).catch((error) => {
      console.warn("Couldn't save the setting:", messageOf(error));
      refresh().catch(() => {});
    });
  }

  function updateName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveSettings({ name: trimmed }, (prev) => ({ ...prev, profile: { ...prev.profile, name: trimmed } }));
  }

  function setMonthlyBudget(amount: number) {
    saveSettings({ monthlyBudget: amount }, (prev) => ({ ...prev, monthlyBudget: amount }));
  }

  function setHideBalance(hide: boolean) {
    saveSettings({ hideBalance: hide }, (prev) => ({ ...prev, hideBalance: hide }));
  }

  // Worked out fresh on every render from the data above, never stored
  const notifications = buildNotifications({
    contacts: data.contacts,
    messages: data.messages,
    transactions: data.transactions,
    unread: data.unread,
    monthlyBudget: data.monthlyBudget,
  });

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
        balance: data.balance,
        transactions: data.transactions,
        messages: data.messages,
        contacts: data.contacts,
        unread: data.unread,
        sendMoney,
        sendMessage,
        topUp,
        requestMoney,
        addContact,
        markRead,
        notifications,
        seenNotificationIds,
        markNotificationsSeen,
        profile: data.profile,
        updateName,
        monthlyBudget: data.monthlyBudget,
        setMonthlyBudget,
        hideBalance: data.hideBalance,
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
