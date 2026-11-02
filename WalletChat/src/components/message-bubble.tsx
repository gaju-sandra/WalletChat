import { useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight, ArrowDownLeft, HandCoins } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import type { Message } from "@/types/wallet";
import { formatRWF, initialsOf, messageTime } from "@/utils/formats";
import { samePhone } from "@/utils/phone";
import { useWallet } from "@/context/wallet";
import { Avatar } from "@/components/avatar";
import { ChatPhoto } from "@/components/chat-photo";

// A shared contact: their name and number, with a button to chat with them or save them
function ContactCard({ message }: { message: Extract<Message, { kind: "contact" }> }) {
  const { contacts, profile } = useWallet();
  const mine = message.fromMe;
  const isMe = samePhone(message.contactPhone, profile.phone); // someone shared your own number
  const saved = contacts.find((c) => samePhone(c.phone, message.contactPhone)); // already in your contacts?

  return (
    <View style={[styles.payment, styles.contactCard, mine ? styles.right : styles.left]}>
      <View style={styles.paymentHeader}>
        <Avatar
          initials={initialsOf(message.contactName)}
          tone={saved?.tone}
          imageUrl={saved?.imageUrl}
          size={40}
        />
        <View style={styles.contactTexts}>
          <Text style={styles.contactName} numberOfLines={1}>
            {message.contactName}
          </Text>
          <Text style={styles.paymentLabel}>{message.contactPhone}</Text>
        </View>
      </View>
      {isMe ? null : saved ? (
        <Pressable
          style={styles.payButton}
          onPress={() => router.push({ pathname: "/chat/[id]", params: { id: saved.id } })}
        >
          <Text style={styles.payText}>Message</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.payButton}
          // opens New contact with the name and number already filled in
          onPress={() =>
            router.push({ pathname: "/new-contact", params: { name: message.contactName, phone: message.contactPhone } })
          }
        >
          <Text style={styles.payText}>Add contact</Text>
        </Pressable>
      )}
      <Text style={styles.time}>{messageTime(new Date(message.sentAt))}</Text>
    </View>
  );
}

// A photo in the chat. Tap it to see it full screen; tap again to close.
function PhotoBubble({ message }: { message: Extract<Message, { kind: "photo" }> }) {
  const [fullScreen, setFullScreen] = useState(false);

  return (
    <>
      <Pressable
        style={[styles.photoBubble, message.fromMe ? styles.right : styles.left]}
        onPress={() => setFullScreen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={message.fromMe ? "Photo you sent" : "Photo you received"}
      >
        <ChatPhoto url={message.photoUrl} style={styles.photo} />
        <Text style={styles.photoTime}>{messageTime(new Date(message.sentAt))}</Text>
      </Pressable>

      <Modal visible={fullScreen} transparent animationType="fade" onRequestClose={() => setFullScreen(false)}>
        <Pressable style={styles.viewer} onPress={() => setFullScreen(false)} accessibilityLabel="Close photo">
          <ChatPhoto url={message.photoUrl} style={styles.viewerPhoto} contentFit="contain" />
        </Pressable>
      </Modal>
    </>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const mine = message.fromMe;

  if (message.kind === "contact") return <ContactCard message={message} />;
  if (message.kind === "photo") return <PhotoBubble message={message} />;

  if (message.kind === "payment") {
    const Icon = mine ? ArrowUpRight : ArrowDownLeft;
    return (
      <View style={[styles.payment, mine ? styles.right : styles.left]}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentIcon}>
            <Icon size={16} color={colors.text} />
          </View>
          <Text style={styles.paymentLabel}>{mine ? "You sent" : "You received"}</Text>
        </View>
        <Text style={styles.paymentAmount}>{formatRWF(message.amount)}</Text>
        <Text style={styles.time}>{messageTime(new Date(message.sentAt))}</Text>
      </View>
    );
  }

  if (message.kind === "request") {
    return (
      <View style={[styles.payment, styles.request, mine ? styles.right : styles.left]}>
        <View style={styles.paymentHeader}>
          <View style={[styles.paymentIcon, styles.requestIcon]}>
            <HandCoins size={16} color={colors.primary} />
          </View>
          <Text style={styles.paymentLabel}>{mine ? "You requested" : "Requested from you"}</Text>
        </View>
        <Text style={styles.paymentAmount}>{formatRWF(message.amount)}</Text>
        {!mine ? (
          <Pressable
            style={styles.payButton}
            onPress={() =>
              router.push({
                pathname: "/send",
                params: { contactId: message.contactId, amount: String(message.amount) },
              })
            }
          >
            <Text style={styles.payText}>Pay</Text>
          </Pressable>
        ) : null}
        <Text style={styles.time}>{messageTime(new Date(message.sentAt))}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      <Text style={[styles.text, mine && styles.textMine]}>{message.text}</Text>
      <Text style={[styles.time, mine && styles.timeMine]}>{messageTime(new Date(message.sentAt))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, gap: 2 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  text: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  textMine: { color: "white" },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, alignSelf: "flex-end" },
  timeMine: { color: colors.onPrimaryMuted },
  payment: {
    width: 220,
    padding: 14,
    gap: 6,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  right: { alignSelf: "flex-end", borderBottomRightRadius: 6 },
  left: { alignSelf: "flex-start", borderBottomLeftRadius: 6 },
  paymentHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  paymentIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  paymentAmount: { fontFamily: fonts.display, fontSize: 24, color: colors.text },
  request: { borderColor: colors.primary, borderStyle: "dashed" },
  requestIcon: { backgroundColor: colors.primarySoft },
  payButton: {
    height: 36,
    marginTop: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  payText: { fontFamily: fonts.semibold, fontSize: 14, color: "white" },
  contactCard: { borderColor: colors.border },
  photoBubble: { width: 220, height: 260, borderRadius: 18, overflow: "hidden" },
  photo: { flex: 1 },
  // the time sits on the photo, white on a dark see-through label so it's readable on any picture
  photoTime: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: "rgba(0,0,0,0.45)",
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "white",
  },
  viewer: { flex: 1, backgroundColor: "black", justifyContent: "center" },
  viewerPhoto: { width: "100%", height: "80%", backgroundColor: "black" },
  contactTexts: { flex: 1, gap: 2 },
  contactName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
});