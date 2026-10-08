import { Tabs } from "expo-router";
import { House, MessageCircle, ChartColumn, User } from "lucide-react-native";
import { colors, fonts } from "@/constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: "Chats", tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: "Insights", tabBarIcon: ({ color, size }) => <ChartColumn color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tabs>
  );
}
