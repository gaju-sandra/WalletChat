import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Bell, ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react-native";
import { colors, spacing, radius, fonts } from "@/constants/theme";
import { Avatar } from "@/components/avatar";
import { SectionHeader } from "@/components/section-header";
import { TransactionRow } from "@/components/transaction-row";
import { useWallet } from "@/context/wallet";
import { firstName, formatRWF, initialsOf } from "@/utils/formats";

export default function HomeScreen() {
  const { balance, transactions, contacts, profile, hideBalance, notifications, seenNotificationIds } = useWallet();
  const recent = transactions.slice(0, 5);
  const unseenCount = notifications.filter((n) => !seenNotificationIds.includes(n.id)).length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(profile.name)}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.name}>WalletChat</Text>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push("/notifications")}
            accessibilityLabel={unseenCount > 0 ? `Notifications, ${unseenCount} new` : "Notifications"}
          >
            <Bell size={20} color={colors.text} />
            {unseenCount > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>

        {/* Balance card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total balance</Text>
          <Text style={styles.balance}>{hideBalance ? "RWF ......" :formatRWF(balance)}</Text>
          

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={() => router.push("/send")}
            >
              <ArrowUpRight size={18} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Send</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => router.push("/request")}>
              <ArrowDownLeft size={18} color="white" />
              <Text style={styles.actionText}>Request</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => router.push("/top-up")}>
              <Plus size={18} color="white" />
              <Text style={styles.actionText}>Top up</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick send */}
                {/* Quick send */}
        <View style={styles.section}>
          <SectionHeader title="Quick send" actionLabel="See all" onPressAction={() => router.push("/chats")} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickScroll}
            contentContainerStyle={styles.quickRow}
          >
            <Pressable
              style={styles.quickItem}
              accessibilityLabel="New transfer"
              onPress={() => router.push("/send")}
            >
              <View style={styles.newCircle}>
                <Plus size={20} color={colors.textMuted} />
              </View>
              <Text style={styles.quickName}>New</Text>
            </Pressable>

            {contacts.map((contact) => (
              <Pressable
                key={contact.id}
                style={styles.quickItem}
                onPress={() => router.push({ pathname: "/send", params: { contactId: contact.id } })}
              >
                <Avatar initials={contact.initials} tone={contact.tone} />
                <Text style={styles.quickName} numberOfLines={1}>
                  {firstName(contact.name)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recent activity */}
        <View style={styles.section}>
          <SectionHeader
            title="Recent activity"
            actionLabel="See all"
            onPressAction={() => router.push("/activity")}
          />
          <View style={styles.listCard}>
            {recent.map((tx, index) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                isLast={index === recent.length - 1}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
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
  bellDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: radius.full,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
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
  section: { gap: spacing.md },
  quickScroll: { marginHorizontal: -spacing.xl },
  quickRow: { gap: 14, paddingHorizontal: spacing.xl },
  quickItem: { width: 56, alignItems: "center", gap: 6 },
  quickName: { fontFamily: fonts.regular, fontSize: 12, color: colors.text },
  newCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
  },
});
