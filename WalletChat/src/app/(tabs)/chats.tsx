import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import type { Contact } from "@/data/mock";
import { useWallet } from "@/context/wallet";
import { lastActivity, previewText } from "@/utils/messages";
import { messageTime } from "@/utils/formats";

function Separator() {
  return <View style={styles.separator} />;
}

function ChatRow({ contact }: { contact: Contact }) {
  const { messages, unread } = useWallet();

  const thread = messages.filter((m) => m.contactId === contact.id);
  const last = thread[thread.length - 1];
  const unreadCount = unread[contact.id] ?? 0;
  const hasUnread = unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push({ pathname: "/chat/[id]", params: { id: contact.id } })}
    >
      <Avatar initials={contact.initials} tone={contact.tone} size={48} />

      <View style={styles.texts}>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={[styles.message, hasUnread && styles.messageUnread]} numberOfLines={1}>
          {last ? previewText(last) : "Say hi 👋"}
        </Text>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.time, hasUnread && styles.timeUnread]}>{last ? messageTime(new Date(last.sentAt)) : ""}</Text>
        {hasUnread ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ChatsScreen() {
  const { contacts, messages } = useWallet();

  // Most recent conversation first. [...contacts] makes a copy, because .sort() changes the array it is
  // called on, and we must never change state directly
  const sorted = [...contacts].sort((a, b) => lastActivity(b, messages).localeCompare(lastActivity(a, messages)));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/new-contact")}
          accessibilityLabel="Add contact"
        >
          <UserPlus size={20} color="white" />
        </Pressable>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(contact) => contact.id}
        renderItem={({ item }) => <ChatRow contact={item} />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowPressed: { opacity: 0.6 },
  texts: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  message: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  messageUnread: { fontFamily: fonts.medium, color: colors.text },
  meta: { alignItems: "flex-end", gap: 6 },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  timeUnread: { fontFamily: fonts.semibold, color: colors.primary },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11, color: "white" },
  separator: { height: 1, backgroundColor: colors.divider, marginLeft: 60 },
});