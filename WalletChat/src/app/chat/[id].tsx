import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Wallet } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { MessageBubble } from "@/components/message-bubble";
import { contacts, messages } from "@/data/mock";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contact = contacts.find((c) => c.id === id);
  const thread = messages.filter((m) => m.contactId === id);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/chats");
  }

  if (!contact) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>Chat not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityLabel="Back to chats">
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Avatar initials={contact.initials} tone={contact.tone} size={40} />
        <Text style={styles.name}>{contact.name}</Text>
      </View>

      <FlatList
        data={thread}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.list}
      />

      <View style={styles.composer}>
        <Pressable
          style={styles.payButton}
          onPress={() => router.push({ pathname: "/send", params: { contactId: contact.id } })}
        >
          <Wallet size={20} color={colors.text} />
          <Text style={styles.payText}>Send money to {contact.name}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  list: { padding: spacing.lg, gap: 10 },
  composer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  payButton: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  payText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  empty: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, padding: spacing.xl },
});