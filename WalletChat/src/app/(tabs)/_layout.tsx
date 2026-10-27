import { View, StyleSheet, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { House, MessageCircle, ChartColumn, User, type LucideIcon } from "lucide-react-native";
import { colors, fonts, radius } from "@/constants/theme";

type TabIconProps = { icon: LucideIcon; color: ColorValue; focused: boolean };

// The active tab gets a soft pill behind a bolder icon, so it's clear which tab you're on
// even for people who can't tell the two colours apart
function TabIcon({ icon: Icon, color, focused }: TabIconProps) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Icon color={color} size={20} strokeWidth={focused ? 2.4 : 1.8} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true, // keep the tab bar from riding up on top of the keyboard
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        tabBarIconStyle: { width: 56, height: 28 }, // wider than the default 31, same height so the label keeps its room
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <TabIcon icon={House} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, focused }) => <TabIcon icon={MessageCircle} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, focused }) => <TabIcon icon={ChartColumn} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => <TabIcon icon={User} color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: { width: 56, height: 28, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  pillActive: { backgroundColor: colors.primarySoft },
});
