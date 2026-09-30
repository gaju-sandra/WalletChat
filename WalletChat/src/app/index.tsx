import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react-native";
import { colors, spacing, radius, fonts } from "@/constants/theme";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>SA</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.name}>Sandra</Text>
        </View>
        <Pressable style={styles.iconButton} accessibilityLabel="Notifications">
          <Bell size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Balance card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total balance</Text>
        <Text style={styles.balance}>RWF 250,000</Text>
        <Text style={styles.weekly}>+RWF 12,400 this week</Text>

        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.accent }]}>
            <ArrowUpRight size={18} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Send</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <ArrowDownLeft size={18} color="white" />
            <Text style={styles.actionText}>Request</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Plus size={18} color="white" />
            <Text style={styles.actionText}>Top up</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "white", fontFamily: fonts.semibold, fontSize: 15 },
  headerText: { flex: 1, gap: 2 },
  greeting: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: 6,
  },
  cardLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.onPrimaryMuted },
  balance: { fontFamily: fonts.display, fontSize: 36, color: "white" },
  weekly: { fontFamily: fonts.medium, fontSize: 13, color: colors.accentOnPrimary },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: 14 },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionText: { fontFamily: fonts.semibold, fontSize: 14, color: "white" },
});