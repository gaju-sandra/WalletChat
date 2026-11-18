import { View, Text, StyleSheet, Pressable, ScrollView, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowDownLeft, ArrowUpRight, HandCoins, MessageCircle, Phone, type LucideIcon } from "lucide-react-native";
import { colors, fonts, palette, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { ScreenHeader } from "@/components/screen-header";
import { ChatPhoto } from "@/components/chat-photo";
import { useWallet } from "@/context/wallet";
import { formatRWF, messageTime } from "@/utils/formats";
import { goBack } from "@/utils/navigation";

type ActionProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

// One round button with a label under it (Message, Send, Request, Call)
function Action({ icon: Icon, label, onPress, disabled = false }: ActionProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionCircle}>
        <Icon size={20} color={colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

// Opened by tapping the name at the top of a chat: who this person is, and the money between you
export default function ContactInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contacts, messages } = useWallet();
  const contact = contacts.find((c) => c.id === id);

  if (!contact) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Contact info" />
        <Text style={styles.muted}>Contact not found.</Text>
      </SafeAreaView>
    );
  }

  // Payments are messages in your chat (kind "payment"), so the chat already knows every payment between you.
  // Newest first, like a history list.
  const payments = messages
    .filter((m) => m.contactId === contact.id && m.kind === "payment")
    .reverse();
  // The newest 6 photos you sent each other
  const photos = messages
    .filter((m) => m.contactId === contact.id && m.kind === "photo")
    .reverse()
    .slice(0, 6);

  let sent = 0;
  let received = 0;
  for (const p of payments) {
    if (p.kind !== "payment") continue; // tells TypeScript that p has an amount
    if (p.fromMe) sent += p.amount;
    else received += p.amount;
  }

  async function handleCall() {
    const url = `tel:${contact!.phone}`;
    // Not every device can make calls (e.g. an iPad or the iOS simulator)
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Can't call", `This device can't make phone calls. The number is ${contact!.phone}.`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Contact info" />

        {/* Who they are */}
        <View style={styles.hero}>
          <Avatar initials={contact.initials} tone={contact.tone} imageUrl={contact.imageUrl} size={96} />
          <Text style={styles.name}>{contact.name}</Text>
          {contact.phone ? <Text style={styles.muted}>{contact.phone}</Text> : null}
          <View style={[styles.status, !contact.onWalletChat && styles.statusOff]}>
            <Text style={[styles.statusText, !contact.onWalletChat && styles.statusTextOff]}>
              {contact.onWalletChat ? "On WalletChat" : "Not on WalletChat yet"}
            </Text>
          </View>
        </View>

        {/* What you can do */}
        <View style={styles.actions}>
          {/* The chat is the screen behind this one, so going back opens it */}
          <Action icon={MessageCircle} label="Message" onPress={() => goBack()} />
          <Action
            icon={ArrowUpRight}
            label="Send"
            disabled={!contact.onWalletChat} // money only goes to people with an account
            onPress={() => router.push({ pathname: "/send", params: { contactId: contact.id } })}
          />
          <Action
            icon={HandCoins}
            label="Request"
            onPress={() => router.push({ pathname: "/request", params: { contactId: contact.id } })}
          />
          <Action icon={Phone} label="Call" onPress={handleCall} disabled={!contact.phone} />
        </View>

        {/* Photos you sent each other (only shown once there are some) */}
        {photos.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos shared</Text>
            <View style={styles.photoGrid}>
              {photos.map((p) =>
                p.kind === "photo" ? <ChatPhoto key={p.id} url={p.photoUrl} style={styles.photoThumb} /> : null,
              )}
            </View>
          </View>
        ) : null}

        {/* Money between you */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payments together</Text>
          <View style={styles.totals}>
            <View style={styles.total}>
              <Text style={styles.muted}>You sent</Text>
              <Text style={styles.totalValue}>{formatRWF(sent)}</Text>
            </View>
            <View style={styles.total}>
              <Text style={styles.muted}>You received</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>{formatRWF(received)}</Text>
            </View>
          </View>

          {payments.length === 0 ? (
            <Text style={styles.muted}>No payments between you yet.</Text>
          ) : (
            payments.slice(0, 5).map((p, index) => {
              if (p.kind !== "payment") return null;
              const Icon = p.fromMe ? ArrowUpRight : ArrowDownLeft;
              const tone = p.fromMe ? palette.amber : palette.green;
              return (
                <View key={p.id} style={[styles.paymentRow, index > 0 && styles.divider]}>
                  <View style={[styles.paymentIcon, { backgroundColor: tone.bg }]}>
                    <Icon size={16} color={tone.fg} />
                  </View>
                  <View style={styles.paymentTexts}>
                    <Text style={styles.paymentLabel}>{p.fromMe ? "You sent" : "You received"}</Text>
                    <Text style={styles.muted}>{messageTime(new Date(p.sentAt))}</Text>
                  </View>
                  <Text style={[styles.paymentAmount, !p.fromMe && { color: colors.success }]}>
                    {p.fromMe ? "−" : "+"}
                    {formatRWF(p.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  hero: { alignItems: "center", gap: spacing.xs },
  name: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: spacing.sm, textAlign: "center" },
  status: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: palette.green.bg,
  },
  statusOff: { backgroundColor: colors.divider },
  statusText: { fontFamily: fonts.semibold, fontSize: 12, color: palette.green.fg },
  statusTextOff: { color: colors.textMuted },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  action: { flex: 1, alignItems: "center", gap: 6 },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.35 },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoThumb: { width: "31%", aspectRatio: 1, borderRadius: radius.md }, // 3 in a row
  totals: { flexDirection: "row", gap: spacing.md },
  total: { flex: 1, gap: 2 },
  totalValue: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  paymentIcon: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  paymentTexts: { flex: 1, gap: 2 },
  paymentLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  paymentAmount: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
});
