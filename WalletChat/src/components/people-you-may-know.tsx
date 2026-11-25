import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from "react-native";
import * as Contacts from "expo-contacts/legacy";
import { router } from "expo-router";
import { Users } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { PrimaryButton } from "@/components/primary-button";
import { SectionHeader } from "@/components/section-header";
import { useWallet } from "@/context/wallet";
import { findPeopleOnWalletChat } from "@/api/wallet";
import { initialsOf } from "@/utils/formats";
import { samePhone } from "@/utils/phone";

type Person = { name: string; phone: string };

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Reads the phone's contacts and asks the server which of them are on WalletChat (not yet in your chats).
// Each person keeps the name YOU saved them with: the server only answers with numbers.
async function findPeopleYouMayKnow(): Promise<Person[]> {
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
  // One entry per number: a contact can have several (work, home…)
  const entries = data
    .flatMap((contact) =>
      (contact.phoneNumbers ?? []).map((number) => ({ name: (contact.name ?? "").trim(), phone: number.number ?? "" })),
    )
    .filter((entry) => entry.name && entry.phone.trim());
  if (entries.length === 0) return [];

  const onWalletChat = await findPeopleOnWalletChat(entries.map((entry) => entry.phone));
  return onWalletChat.flatMap((phone) => {
    const entry = entries.find((e) => samePhone(e.phone, phone));
    return entry ? [{ name: entry.name, phone }] : [];
  });
}

// "People you may know", on Home under "Quick send".
//   Not asked yet → a card explaining it, with a button (we never ask for your contacts out of nowhere)
//   Allowed       → the list, checked straight away when Home opens
//   Refused / web → nothing: you can still add people with the + button
export function PeopleYouMayKnow() {
  const { contacts, addContact } = useWallet();
  // A browser can't read the phone's contacts, so on the web it's "refused" from the start
  const [access, setAccess] = useState<"checking" | "ask" | "allowed" | "refused">(
    Platform.OS === "web" ? "refused" : "checking",
  );
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(""); // the number being added, to show its spinner
  const [error, setError] = useState("");
  const [notNow, setNotNow] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setPeople(await findPeopleYouMayKnow());
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }

  // Allowed before? Then look straight away. Otherwise wait for the button.
  useEffect(() => {
    if (Platform.OS === "web") return;
    Contacts.getPermissionsAsync().then(
      ({ granted, canAskAgain }) => {
        if (!granted) return setAccess(canAskAgain ? "ask" : "refused");
        setAccess("allowed");
        void load();
      },
      () => setAccess("refused"),
    );
  }, []); // only once, when Home opens

  async function handleAllow() {
    const { granted } = await Contacts.requestPermissionsAsync();
    setAccess(granted ? "allowed" : "refused");
    if (granted) await load();
  }

  async function handleAdd(person: Person) {
    setAdding(person.phone);
    setError("");
    try {
      const contact = await addContact(person.name, person.phone);
      // Like "Save and start chat" on New contact: go straight to the chat with them
      router.push({ pathname: "/chat/[id]", params: { id: contact.id } });
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setAdding("");
    }
  }

  if (access === "checking" || access === "refused" || notNow) return null;

  if (access === "ask") {
    return (
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Users size={20} color={colors.primary} />
          <Text style={styles.cardTitle}>Find friends on WalletChat</Text>
        </View>
        <Text style={styles.cardText}>
          See which of your contacts already use WalletChat. Their numbers are checked, not saved.
        </Text>
        <PrimaryButton label="Check my contacts" onPress={handleAllow} />
        <Pressable onPress={() => setNotNow(true)} hitSlop={8} accessibilityRole="button">
          <Text style={styles.notNow}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  // Someone you just added is in your chats now: stop suggesting them
  const suggestions = people.filter((person) => !contacts.some((c) => samePhone(c.phone, person.phone)));

  if (loading && suggestions.length === 0) return <ActivityIndicator style={styles.spinner} color={colors.primary} />;
  if (suggestions.length === 0 && !error) return null; // nobody new to suggest: show nothing

  return (
    <View style={styles.section}>
      <SectionHeader title="People you may know" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {suggestions.length > 0 ? (
        <View style={styles.listCard}>
          {suggestions.map((person, index) => (
            <View key={person.phone} style={[styles.row, index < suggestions.length - 1 && styles.rowDivider]}>
              <Avatar initials={initialsOf(person.name)} size={44} />
              <View style={styles.texts}>
                <Text style={styles.name} numberOfLines={1}>
                  {person.name}
                </Text>
                <Text style={styles.subtitle}>On WalletChat</Text>
              </View>
              <Pressable
                style={styles.addButton}
                onPress={() => handleAdd(person)}
                disabled={adding !== ""}
                accessibilityRole="button"
                accessibilityLabel={`Add ${person.name}`}
              >
                {adding === person.phone ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.addText}>Add</Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  cardText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  notNow: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  spinner: { marginVertical: spacing.lg },
  section: { gap: spacing.md }, // same spacing as the other sections on Home
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  texts: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  addButton: {
    minWidth: 64,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { fontFamily: fonts.semibold, fontSize: 14, color: "white" },
});
