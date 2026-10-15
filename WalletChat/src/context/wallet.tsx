import { createContext, useContext, useState, type ReactNode } from "react";
import {
  balance as initialBalance,
  contacts,
  messages as initialMessages,
  profile as initialProfile,
  transactions as initialTransactions,
  type Message,
  type Transaction,
  type Profile, 
  
} from "@/data/mock";
import { formatTime } from "@/utils/formats";


type WalletContextValue = {
  balance: number;
  transactions: Transaction[];
  messages: Message[];
  sendMoney: (contactId: string, amount: number) => void;
  sendMessage: (contactId: string, text: string) => void;
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
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [monthlyBudget, setMonthlyBudget] = useState(150000);
  const [hideBalance, setHideBalance] = useState(false);


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
      { id: `m${now.getTime()}`, contactId, fromMe: true, time, kind: "payment", amount },
    ]);
  }
   
  function sendMessage(contactId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return; // don't send empty messages

    const now = new Date();
    setMessages((prev) => [
      ...prev,
      { id: `m${now.getTime()}`, contactId, fromMe: true, time: formatTime(now), kind: "text", text: trimmed },
    ]);
  }

  return (
    <WalletContext.Provider value={{ balance, transactions, messages, 
    sendMoney, sendMessage,profile,
        updateName,
        monthlyBudget,
        setMonthlyBudget,
        hideBalance,
        setHideBalance,
      }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside WalletProvider");
  return wallet;
}