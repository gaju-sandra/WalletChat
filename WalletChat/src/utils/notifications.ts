import type { Href } from "expo-router";
import type { Contact, Message, Transaction } from "@/data/mock";
import { dayLabel, firstName, formatRWF, formatTime, messageTime } from "@/utils/formats";
import { monthLabel, totals, transactionsThisMonth } from "@/utils/insights";

export type NotificationKind = "budget" | "request" | "message" | "payment" | "income";

export type AppNotification = {
  id: string; // stable, so we can remember which ones were already seen
  kind: NotificationKind;
  title: string;
  body: string;
  time: string;
  href: Href; // where tapping it takes you
};

type Sources = {
  contacts: Contact[];
  messages: Message[];
  transactions: Transaction[];
  unread: Record<string, number>;
  monthlyBudget: number;
};

// Notifications are not stored anywhere: they are worked out from the data the app already has,
// so they can never get out of sync with it. Most important first.
export function buildNotifications({ contacts, messages, transactions, unread, monthlyBudget }: Sources) {
  const list: AppNotification[] = [];
  const nameOf = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    return contact ? firstName(contact.name) : "Someone";
  };
  const timeOf = (m: Message) => messageTime(new Date(m.sentAt));
  const lastMessageTime = (contactId: string) => {
    const last = messages.filter((m) => m.contactId === contactId).at(-1);
    return last ? timeOf(last) : "";
  };
  const chatLink = (contactId: string): Href => ({ pathname: "/chat/[id]", params: { id: contactId } });

  // 1. Budget warning (the id includes the month, so a new month warns again)
  const { spent } = totals(transactionsThisMonth(transactions));
  const percent = Math.round((spent / monthlyBudget) * 100);
  if (spent > monthlyBudget) {
    list.push({
      id: `budget-over-${monthLabel()}`,
      kind: "budget",
      title: "Over budget",
      body: `You've spent ${formatRWF(spent)}, more than your ${formatRWF(monthlyBudget)} budget.`,
      time: monthLabel(),
      href: "/insights",
    });
  } else if (percent >= 80) {
    list.push({
      id: `budget-80-${monthLabel()}`,
      kind: "budget",
      title: "Close to your budget",
      body: `You've used ${percent}% of your ${formatRWF(monthlyBudget)} monthly budget.`,
      time: monthLabel(),
      href: "/insights",
    });
  }

  // 2. Messages from other people, newest first
  const fromOthers = messages.filter((m) => !m.fromMe).reverse();

  for (const m of fromOthers) {
    if (m.kind === "request") {
      list.push({
        id: `msg-${m.id}`,
        kind: "request",
        title: "Money request",
        body: `${nameOf(m.contactId)} asked you for ${formatRWF(m.amount)}.`,
        time: timeOf(m),
        href: chatLink(m.contactId),
      });
    }
  }

  // 3. Unread chats (the id includes the count, so a new message makes it "new" again)
  for (const contact of contacts) {
    const count = unread[contact.id] ?? 0;
    if (count > 0) {
      list.push({
        id: `unread-${contact.id}-${count}`,
        kind: "message",
        title: `${count} new message${count === 1 ? "" : "s"}`,
        body: `From ${firstName(contact.name)}`,
        time: lastMessageTime(contact.id),
        href: chatLink(contact.id),
      });
    }
  }

  // 4. Payments people sent you in chat
  for (const m of fromOthers) {
    if (m.kind === "payment") {
      list.push({
        id: `msg-${m.id}`,
        kind: "payment",
        title: "Money received",
        body: `${nameOf(m.contactId)} sent you ${formatRWF(m.amount)}.`,
        time: timeOf(m),
        href: chatLink(m.contactId),
      });
    }
  }

  // 5. Money in: salary, top ups (this month only)
  for (const t of transactionsThisMonth(transactions)) {
    if (t.amount > 0) {
      const date = new Date(t.date);
      list.push({
        id: `tx-${t.id}`,
        kind: "income",
        title: t.title === "Top up" ? "Top up successful" : t.title,
        body: `+${formatRWF(t.amount)} added to your wallet.`,
        time: `${dayLabel(date)} · ${formatTime(date)}`,
        href: "/activity",
      });
    }
  }

  return list;
}
