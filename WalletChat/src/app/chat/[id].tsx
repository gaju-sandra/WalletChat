import { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Send, Wallet } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { MessageBubble } from "@/components/message-bubble";
import { contacts, type Message } from "@/data/mock";
import { useWallet } from "@/context/wallet";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { messages, sendMessage } = useWallet();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  const contact = contacts.find((c) => c.id === id);
  const thread = messages.filter((m) => m.contactId === id);
  const canSend = draft.trim().length > 0;

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/chats");
  }

  function handleSend() {
    if (!contact || !canSend) return;
    sendMessage(contact.id, draft);
    setDraft(""); // clear the input
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

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={thread}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.composer}>
          <Pressable
            style={styles.payButton}
            accessibilityLabel={`Send money to ${contact.name}`}
            onPress={() => router.push({ pathname: "/send", params: { contactId: contact.id } })}
          >
            <Wallet size={20} color={colors.text} />
          </Pressable>

          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />

          <Pressable
            style={[styles.sendButton, !canSend && styles.sendDisabled]}
            disabled={!canSend}
            onPress={handleSend}
            accessibilityLabel="Send message"
          >
            <Send size={18} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  payButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.4 },
  empty: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, padding: spacing.xl },
});