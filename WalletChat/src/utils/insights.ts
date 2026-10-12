import type { Transaction } from "@/data/mock";

export type SpendingCategory = Exclude<Transaction["category"], "income">;

export const MONTHLY_BUDGET = 150000;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(date = new Date()) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function transactionsThisMonth(transactions: Transaction[], now = new Date()) {
  return transactions.filter((tx) => {
    const date = new Date(tx.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
}

export function totals(transactions: Transaction[]) {
  return transactions.reduce(
    (sum, tx) => {
      if (tx.amount < 0) sum.spent += -tx.amount;
      else sum.received += tx.amount;
      return sum;
    },
    { spent: 0, received: 0 },
  );
}

export function spendingByCategory(transactions: Transaction[]) {
  const sums: Record<SpendingCategory, number> = { transfer: 0, transport: 0, bills: 0, shopping: 0 };

  for (const tx of transactions) {
    if (tx.category === "income" || tx.amount >= 0) continue;
    sums[tx.category] += -tx.amount;
  }

  const total = Object.values(sums).reduce((a, b) => a + b, 0);

  return (Object.keys(sums) as SpendingCategory[])
    .map((category) => ({
      category,
      amount: sums[category],
      percent: total > 0 ? Math.round((sums[category] / total) * 100) : 0,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export type DaySpending = { label: string; amount: number };

export function lastSevenDays(transactions: Transaction[]) {
  const days: DaySpending[] = [];

  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);

    const amount = transactions
      .filter((tx) => tx.amount < 0 && new Date(tx.date).toDateString() === day.toDateString())
      .reduce((sum, tx) => sum - tx.amount, 0);

    days.push({ label: i === 0 ? "Today" : DAY_NAMES[day.getDay()], amount });
  }

  return days;
}