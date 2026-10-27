import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { useWallet } from "@/context/wallet";
import { firstName } from "@/utils/formats";

type RecipientPickerProps = {
  contactId?: string;
  onChange: (contactId: string | undefined) => void;
  label: string; // shown above the name once chosen, e.g. "To"
  prompt: string; // shown above the list, e.g. "Choose who to send money to"
};

export function RecipientPicker({ contactId, onChange, label, prompt }: RecipientPickerProps) {
  const { contacts } = useWallet();
  const contact = contacts.find((c) => c.id === contactId);

  if (contact) {
    return (
      <View style={styles.card}>
        <Avatar initials={contact.initials} tone={contact.tone} size={44} />
        <View style={styles.cardText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.name}>{contact.name}</Text>
        </View>
        <Pressable onPress={() => onChange(undefined)} hitSlop={8}>
          <Text style={styles.link}>Change</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.picker}>
      <Text style={styles.label}>{prompt}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {contacts.map((c) => (
          <Pressable key={c.id} style={styles.item} onPress={() => onChange(c.id)}>
            <Avatar initials={c.initials} tone={c.tone} />
            <Text style={styles.itemName} numberOfLines={1}>
              {firstName(c.name)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  cardText: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  picker: { gap: spacing.md },
  row: { gap: 14 },
  item: { width: 56, alignItems: "center", gap: 6 },
  itemName: { fontFamily: fonts.regular, fontSize: 12, color: colors.text },
});
