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
import * as Contacts from "expo-contacts/legacy";
import * as ImagePicker from "expo-image-picker";
import { ArrowUpRight, Camera, ChevronLeft, HandCoins, Image as ImageIcon, Plus, Send, UserRound } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { MessageBubble } from "@/components/message-bubble";
import { AttachMenu } from "@/components/attach-menu";
import type { Message } from "@/types/wallet";
import { useWallet } from "@/context/wallet";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contacts, messages, sendMessage, markRead, shareContact, sendPhoto } = useWallet();
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false); // the + menu
  const [sendingPhoto, setSendingPhoto] = useState(false); // a photo is uploading
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

  // "Share a contact": pick someone from the phone's contact list and send their name and number
  async function handleShareContact() {
    if (!contact) return;
    try {
      // Android needs permission to read the chosen contact. On iPhone the picker hands it over without any.
      if (Platform.OS === "android") {
        const { granted } = await Contacts.requestPermissionsAsync();
        if (!granted) {
          return Alert.alert("No access to contacts", "Allow WalletChat to see your contacts in your phone's Settings.");
        }
      }
      // The legacy picker gives us the chosen contact's details directly. The newer Contact.presentPicker()
      // only gives an id and looks it up afterwards, which fails on iPhones with limited contact access.
      const picked = await Contacts.presentContactPickerAsync(); // the phone's own contact list
      if (!picked) return; // closed without choosing

      const name = picked.name;
      const number = picked.phoneNumbers?.find((p) => p.number)?.number; // the first number they have
      if (!number) return Alert.alert("No phone number", `${name || "This contact"} has no phone number to share.`);

      await shareContact(contact.id, name || number, number);
    } catch (error) {
      Alert.alert("Contact not shared", error instanceof Error ? error.message : String(error));
    }
  }

  // "Photo" and "Camera": choose a picture or take one, then send it
  async function handlePhoto(source: "library" | "camera") {
    if (!contact) return;
    // base64: the picture as text, which is how it travels to our server. quality 0.6 keeps it small.
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.6, base64: true };
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        // The camera always needs permission first (choosing from the library doesn't on iPhone)
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) return Alert.alert("No access to the camera", "Allow WalletChat to use the camera in your phone's Settings.");
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo.base64) return Alert.alert("Couldn't read that photo", "Please try another one.");

      setSendingPhoto(true);
      await sendPhoto(contact.id, `data:${photo.mimeType ?? "image/jpeg"};base64,${photo.base64}`);
    } catch (error) {
      Alert.alert("Photo not sent", error instanceof Error ? error.message : String(error));
    } finally {
      setSendingPhoto(false);
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

        {sendingPhoto ? <Text style={styles.sending}>Sending photo…</Text> : null}

        <View style={styles.composer}>
          <Pressable
            style={styles.plusButton}
            accessibilityLabel="More: photo, camera, contact, money"
            onPress={() => setMenuOpen(true)}
          >
            <Plus size={22} color={colors.text} />
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

      {menuOpen ? (
        <AttachMenu
          onClose={() => setMenuOpen(false)}
          options={[
            { icon: ImageIcon, tone: "green", label: "Photo", onPress: () => handlePhoto("library") },
            { icon: Camera, tone: "red", label: "Camera", onPress: () => handlePhoto("camera") },
            { icon: UserRound, tone: "indigo", label: "Share a contact", onPress: handleShareContact },
            {
              icon: ArrowUpRight,
              tone: "amber",
              label: "Send money",
              disabled: !contact.onWalletChat, // no account = nowhere for the money to go
              hint: contact.onWalletChat ? undefined : `${contact.name} isn't on WalletChat yet`,
              onPress: () => router.push({ pathname: "/send", params: { contactId: contact.id } }),
            },
            {
              icon: HandCoins,
              tone: "teal",
              label: "Request money",
              onPress: () => router.push({ pathname: "/request", params: { contactId: contact.id } }),
            },
          ]}
        />
      ) : null}
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
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.background,
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
  sending: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "right",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  empty: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, padding: spacing.xl },
});