import type { Contact, Message } from "@/data/mock";
import { formatRWF } from "@/utils/formats";

export function previewText(message: Message) {
  switch (message.kind) {
    case "text":
      return message.text;
    case "payment":
      return `${message.fromMe ? "You sent" : "You received"} ${formatRWF(message.amount)}`;
    case "request":
      return `${message.fromMe ? "You requested" : "Requested"} ${formatRWF(message.amount)}`;
  }
}

// When a chat was last active: its newest message, or when the contact was added if it has none.
// ISO dates can be compared as plain text: "2026-10-23T09:00" > "2026-10-22T18:00"
export function lastActivity(contact: Contact, messages: Message[]) {
  let latest = contact.addedAt ?? "";
  for (const m of messages) {
    if (m.contactId === contact.id && m.sentAt > latest) latest = m.sentAt;
  }
  return latest;
}
