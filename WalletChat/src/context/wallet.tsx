import { createContext, useContext, useState, type ReactNode } from "react";
import {
  balance as initialBalance,
  contacts,
  transactions as initialTransactions,
  type Transaction,
} from "@/data/mock";

type WalletContextValue = {
  balance: number;
  transactions: Transaction[];
  sendMoney: (contactId: string, amount: number) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  function sendMoney(contactId: string, amount: number) {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || amount <= 0) return;

    const newTransaction: Transaction = {
      id: `t${Date.now()}`,
      title: contact.name,
      subtitle: `Sent · ${formatTime(new Date())}`,
      amount: -amount, // negative = money out
      category: "transfer",
    };

    setBalance((prev) => prev - amount);
    setTransactions((prev) => [newTransaction, ...prev]); // newest first
  }

  return (
    <WalletContext.Provider value={{ balance, transactions, sendMoney }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside WalletProvider");
  return wallet;
}
