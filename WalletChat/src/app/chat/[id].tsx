import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Send, Wallet } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { MessageBubble } from "@/components/message-bubble";
import type { Message } from "@/types/wallet";
import { useWallet } from "@/context/wallet";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contacts, messages, sendMessage, markRead } = useWallet();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  const contact = contacts.find((c) => c.id === id);
  const thread = messages.filter((m) => m.contactId === id);
  const canSend = draft.trim().length > 0;

  // Opening the chat means you have read it
  useEffect(() => {
    if (id) markRead(id);
  }, [id, markRead]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/chats");
  }

  async function handleSend() {
    if (!contact || !canSend) return;
    const text = draft;
    setDraft(""); // clear the input straight away, like any chat app
    try {
      await sendMessage(contact.id, text);
    } catch (error) {
      setDraft(text); // put the text back so nothing is lost
      Alert.alert("Message not sent", error instanceof Error ? error.message : String(error));
    }
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
        {/* Tap the photo or name to open their contact info, like in other chat apps */}
        <Pressable
          style={({ pressed }) => [styles.who, pressed && styles.whoPressed]}
          onPress={() => router.push({ pathname: "/contact/[id]", params: { id: contact.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Contact info for ${contact.name}`}
        >
          <Avatar initials={contact.initials} tone={contact.tone} imageUrl={contact.imageUrl} size={40} />
          <View style={styles.whoTexts}>
            <Text style={styles.name} numberOfLines={1}>
              {contact.name}
            </Text>
            <Text style={styles.whoHint}>Tap for contact info</Text>
          </View>
        </Pressable>
      </View>

      {!contact.onWalletChat ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {`${contact.name} isn't on WalletChat yet. Your messages will wait for them, and you can send money once they create an account with ${contact.phone}.`}
          </Text>
        </View>
      ) : null}

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
            style={[styles.payButton, !contact.onWalletChat && styles.sendDisabled]}
            disabled={!contact.onWalletChat} // no account = nowhere for the money to go
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
  who: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
  whoPressed: { opacity: 0.6 },
  whoTexts: { flex: 1 },
  whoHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  notice: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noticeText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: "center" },
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