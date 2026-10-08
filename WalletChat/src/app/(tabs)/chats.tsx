import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { chats, contacts, type Chat } from "@/data/mock";

function Separator() {
  return <View style={styles.separator} />;
}

function ChatRow({ chat }: { chat: Chat }) {
  const contact = contacts.find((c) => c.id === chat.contactId);
  if (!contact) return null;

  const hasUnread = chat.unread > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push({ pathname: "/send", params: { contactId: contact.id } })}
    >
      <Avatar initials={contact.initials} tone={contact.tone} size={48} />

      <View style={styles.texts}>
        <Text style={styles.name}>{contact.name}</Text>
        <Text style={[styles.message, hasUnread && styles.messageUnread]} numberOfLines={1}>
          {chat.lastMessage}
        </Text>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.time, hasUnread && styles.timeUnread]}>{chat.time}</Text>
        {hasUnread ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{chat.unread}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function ChatsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Chats</Text>
      <FlatList
        data={chats}
        keyExtractor={(chat) => chat.contactId}
        renderItem={({ item }) => <ChatRow chat={item} />}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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