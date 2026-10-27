import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowDownLeft,
  BellOff,
  HandCoins,
  MessageCircle,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import { colors, fonts, palette, radius, spacing, type Tone } from "@/constants/theme";
import { ScreenHeader } from "@/components/screen-header";
import { useWallet } from "@/context/wallet";
import type { AppNotification, NotificationKind } from "@/utils/notifications";

const kindStyle: Record<NotificationKind, { icon: LucideIcon; tone: Tone }> = {
  budget: { icon: TriangleAlert, tone: "red" },
  request: { icon: HandCoins, tone: "teal" },
  message: { icon: MessageCircle, tone: "indigo" },
  payment: { icon: ArrowDownLeft, tone: "green" },
  income: { icon: Wallet, tone: "amber" },
};

function NotificationRow({ notification, isNew }: { notification: AppNotification; isNew: boolean }) {
  const { icon: Icon, tone } = kindStyle[notification.kind];

  return (
    <Pressable
      style={({ pressed }) => [styles.row, isNew && styles.rowNew, pressed && styles.rowPressed]}
      onPress={() => router.push(notification.href)}
    >
      <View style={[styles.iconBox, { backgroundColor: palette[tone].bg }]}>
        <Icon size={20} color={palette[tone].fg} />
      </View>
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.time}>{notification.time}</Text>
        </View>
        <Text style={styles.body}>{notification.body}</Text>
      </View>
      {isNew ? <View style={styles.newDot} /> : null}
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { notifications, seenNotificationIds, markNotificationsSeen } = useWallet();

  // Snapshot of what was unseen when the screen opened. Without it, marking them seen
  // below would remove the "new" highlight before you had a chance to see it.
  const [newIds] = useState(() =>
    notifications.filter((n) => !seenNotificationIds.includes(n.id)).map((n) => n.id),
  );

  // Opening this screen counts as seeing everything on it, so the dot on the bell goes away
  useEffect(() => {
    markNotificationsSeen();
  }, [markNotificationsSeen]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <ScreenHeader title="Notifications" />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotificationRow notification={item} isNew={newIds.includes(item.id)} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BellOff size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>You&apos;re all caught up.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowNew: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowPressed: { opacity: 0.6 },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  newDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary, marginTop: 6 },
  empty: { alignItems: "center", gap: spacing.md, marginTop: spacing.xxl },
  emptyText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
});
