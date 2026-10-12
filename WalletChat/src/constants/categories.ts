import { ArrowUpRight, ArrowDownLeft, Bus, Zap, ShoppingCart, type LucideIcon } from "lucide-react-native";
import type { Tone } from "@/constants/theme";
import type { Transaction } from "@/data/mock";

export const categoryInfo: Record<Transaction["category"], { label: string; icon: LucideIcon; tone: Tone }> = {
  transfer: { label: "Transfers", icon: ArrowUpRight, tone: "amber" },
  income: { label: "Income", icon: ArrowDownLeft, tone: "green" },
  transport: { label: "Transport", icon: Bus, tone: "teal" },
  bills: { label: "Bills", icon: Zap, tone: "indigo" },
  shopping: { label: "Shopping", icon: ShoppingCart, tone: "red" },
};