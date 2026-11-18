import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useClerk } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { Mail, Phone, Wallet, Pencil, LogOut, Camera } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { SectionHeader } from "@/components/section-header";
import { SettingsRow } from "@/components/settings-row";
import { useWallet } from "@/context/wallet";
import { formatRWF, initialsOf } from "@/utils/formats";

export default function ProfileScreen() {
  const { profile, updateName, monthlyBudget, setMonthlyBudget, changePicture } = useWallet();
  const { signOut } = useClerk(); // ends the Clerk session: the app goes back to the sign-in screen

  // Local "draft" state: what the user is typing before they press Save
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(monthlyBudget));
  const [savingPicture, setSavingPicture] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null) // the scroll view on screen (what we call scrollToEnd on);

  // The budget field sits low on the screen: once the keyboard is open, scroll it into view
  useEffect(() => {
    if (!editingBudget) return;
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => subscription.remove(); // stop listening when editing ends
  }, [editingBudget]);

  // Uploads (or removes) the picture and shows a spinner on the avatar meanwhile
  async function savePicture(picture: string | null) {
    setSavingPicture(true);
    try {
      await changePicture(picture);
    } catch (error) {
      Alert.alert("Couldn't change your picture", error instanceof Error ? error.message : String(error));
    } finally {
      setSavingPicture(false);
    }
  }

  async function pickFromPhotos() {
    // Opens the phone's photo library. allowsEditing + aspect 1:1 lets you crop a square, which fits the circle.
    // base64 gives us the picture as text, which is how Clerk accepts a file from a phone.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6, // smaller file, still sharp in a small circle
      base64: true,
    });
    if (result.canceled) return; // you closed the library without choosing
    const photo = result.assets[0];
    if (!photo.base64) return Alert.alert("Couldn't read that photo", "Please try another one.");
    await savePicture(`data:${photo.mimeType ?? "image/jpeg"};base64,${photo.base64}`);
  }

  function handleAvatarPress() {
    if (savingPicture) return;
    Alert.alert("Profile picture", undefined, [
      { text: "Choose from photos", onPress: pickFromPhotos },
      // Only offer "Remove" when there is a picture to remove
      ...(profile.imageUrl ? [{ text: "Remove picture", style: "destructive" as const, onPress: () => savePicture(null) }] : []),
      { text: "Cancel", style: "cancel" },
    ]);
  }

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
            <Pressable
              onPress={handleAvatarPress}
              style={({ pressed }) => pressed && styles.pressed}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              <Avatar initials={initialsOf(profile.name)} size={88} imageUrl={profile.imageUrl} />
              {savingPicture ? (
                <View style={styles.avatarBusy}>
                  <ActivityIndicator color="white" />
                </View>
              ) : null}
              <View style={styles.cameraBadge}>
                <Camera size={14} color="white" />
              </View>
            </Pressable>

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
              {/* People who sign up with a phone number have no email, so only show it when there is one */}
              {profile.email ? <SettingsRow icon={Mail} label="Email" value={profile.email} /> : null}
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
                isLast={!editingBudget} // the edit box below becomes the last row while it's open
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
            </View>
          </View>

          <Pressable style={styles.signOutButton} onPress={() => signOut()} accessibilityRole="button">
            <LogOut size={18} color={colors.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  pressed: { opacity: 0.7 },
  // a dark see-through layer over the avatar while the picture uploads
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  // the small camera circle on the avatar's corner, so people know they can tap it
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
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
  budgetEditRow: { paddingVertical: spacing.md },
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
  signOutButton: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.danger },
});