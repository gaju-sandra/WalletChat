import type { Message } from "@/data/mock";
import { formatRWF } from "@/utils/formats";

export function previewText(message: Message) {
  if (message.kind === "text") return message.text;
  return `${message.fromMe ? "You sent" : "You received"} ${formatRWF(message.amount)}`;
}