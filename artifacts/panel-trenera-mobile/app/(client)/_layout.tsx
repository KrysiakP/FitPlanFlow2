import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useUnreadCount } from "@/hooks/useChat";

function ClassicClientTabs() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView pointerEvents="none" intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Panel",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house.fill" tintColor={color} size={22} /> : <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: "Trening",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="dumbbell" tintColor={color} size={22} /> : <Ionicons name="barbell-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="diet"
        options={{
          title: "Dieta",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="fork.knife" tintColor={color} size={22} /> : <Ionicons name="nutrition-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Czat",
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="message.fill" tintColor={color} size={22} /> : <Ionicons name="chatbubble-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="referrals" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="medical-tests" options={{ href: null }} />
      <Tabs.Screen name="weekly-report" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.fill" tintColor={color} size={22} /> : <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function ClientLayout() {
  return <ClassicClientTabs />;
}
