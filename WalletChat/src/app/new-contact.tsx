import { useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { ScreenHeader } from "@/components/screen-header";
import { PrimaryButton } from "@/components/primary-button";
import { useWallet } from "@/context/wallet";
import { initialsOf } from "@/utils/formats";

const digitsOnly = (text: string) => text.replace(/\D/g, "");

export default function NewContactScreen() {
  const { contacts, addContact } = useWallet();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // waiting for the server

  async function handleSave() {
    const phoneDigits = digitsOnly(phone);

    if (!name.trim()) return setError("Enter a name.");
    // 07XXXXXXXX (10 digits) or 2507XXXXXXXX (12 digits)
    if (phoneDigits.length !== 10 && phoneDigits.length !== 12) {
      return setError("Enter a valid phone number, e.g. 0788 123 456.");
    }
    // Compare the last 9 digits so "0788…" and "250788…" count as the same number
    const exists = contacts.some((c) => c.phone && digitsOnly(c.phone).slice(-9) === phoneDigits.slice(-9));
    if (exists) return setError("This number is already in your contacts.");

    setBusy(true);
    try {
      const contact = await addContact(name, phone); // the server checks the number too
      // replace: Back from the new chat should not come back to this form
      router.replace({ pathname: "/chat/[id]", params: { id: contact.id } });
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="New contact" />

      <View style={styles.preview}>
        <Avatar initials={initialsOf(name) || "?"} size={72} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError("");
          }}
          placeholder="e.g. Diane Mukamana"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          returnKeyType="next"
          autoFocus
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Phone number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setError("");
          }}
          placeholder="0788 123 456"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton label={busy ? "Saving…" : "Save and start chat"} onPress={handleSave} disabled={busy} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  preview: { alignItems: "center", marginVertical: spacing.sm },
  field: { gap: spacing.sm },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
});
