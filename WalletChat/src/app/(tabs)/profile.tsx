import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Mail, Phone, Wallet, EyeOff, Pencil, Database } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { SectionHeader } from "@/components/section-header";
import { SettingsRow } from "@/components/settings-row";
import { useWallet } from "@/context/wallet";
import { formatRWF, initialsOf } from "@/utils/formats";

export default function ProfileScreen() {
  const { profile, updateName, monthlyBudget, setMonthlyBudget, hideBalance, setHideBalance } = useWallet();

  // Local "draft" state: what the user is typing before they press Save
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(monthlyBudget));
  const scrollRef = useRef<ScrollView>(null);

  // The budget field sits low on the screen: once the keyboard is open, scroll it into view
  useEffect(() => {
    if (!editingBudget) return;
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => subscription.remove(); // stop listening when editing ends
  }, [editingBudget]);

  function startEditName() {
    setNameDraft(profile.name); // start from the current saved name
    setEditingName(true);
  }

  function saveName() {
    updateName(nameDraft); // the context ignores empty names
    setEditingName(false);
  }

  function toggleEditBudget() {
    setBudgetDraft(String(monthlyBudget));
    setEditingBudget((editing) => !editing);
  }

  function saveBudget() {
    const amount = Number(budgetDraft);
    if (amount > 0) setMonthlyBudget(amount);
    setEditingBudget(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Shrinks the screen by the keyboard height so the bottom of the list can scroll above it */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.screen}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Profile</Text>

          {/* Profile card */}
          <View style={styles.profileCard}>
            <Avatar initials={initialsOf(profile.name)} size={72} />

            {editingName ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.input}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onSubmitEditing={saveName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  autoFocus
                />
                <Pressable style={styles.saveButton} onPress={saveName}>
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.nameRow} onPress={startEditName} accessibilityLabel="Edit name">
                <Text style={styles.name}>{profile.name}</Text>
                <Pencil size={16} color={colors.textMuted} />
              </Pressable>
            )}

            <Text style={styles.subtitle}>{profile.phone}</Text>
          </View>

          {/* Account details */}
          <View style={styles.section}>
            <SectionHeader title="Account" />
            <View style={styles.listCard}>
              <SettingsRow icon={Mail} label="Email" value={profile.email} />
              <SettingsRow icon={Phone} tone="green" label="Phone" value={profile.phone} isLast />
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <SectionHeader title="Preferences" />
            <View style={styles.listCard}>
              <SettingsRow
                icon={Wallet}
                tone="amber"
                label="Monthly budget"
                value={formatRWF(monthlyBudget)}
                right={
                  <Pressable onPress={toggleEditBudget} hitSlop={8}>
                    <Text style={styles.link}>{editingBudget ? "Cancel" : "Edit"}</Text>
                  </Pressable>
                }
              />

              {editingBudget ? (
                <View style={[styles.editRow, styles.budgetEditRow]}>
                  <TextInput
                    style={styles.input}
                    value={budgetDraft}
                    onChangeText={(text) => setBudgetDraft(text.replace(/\D/g, ""))} // digits only
                    onSubmitEditing={saveBudget}
                    keyboardType="number-pad"
                    maxLength={9}
                    autoFocus
                  />
                  <Pressable style={styles.saveButton} onPress={saveBudget}>
                    <Text style={styles.saveText}>Save</Text>
                  </Pressable>
                </View>
              ) : null}

              <SettingsRow
                icon={EyeOff}
                tone="indigo"
                label="Hide balance"
                value="Show •••••• on the Home screen"
                isLast
                right={
                  <Switch
                    value={hideBalance}
                    onValueChange={setHideBalance}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="white"
                  />
                }
              />
            </View>
          </View>

          
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  screen: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.xl },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text, marginTop: spacing.sm },
  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  editRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "stretch" },
  budgetEditRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  saveButton: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: "center",
  },
  saveText: { fontFamily: fonts.semibold, fontSize: 14, color: "white" },
  section: { gap: spacing.md },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
  },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary },
  version: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: "center" },
});