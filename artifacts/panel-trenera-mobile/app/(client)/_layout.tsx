import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useUnreadCount } from "@/hooks/useChat";

function NativeClientTabs() {
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;
  const chatLabel = unreadCount > 0 ? `Czat (${unreadCount > 99 ? "99+" : unreadCount})` : "Czat";

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Panel</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="training">
        <Icon sf={{ default: "dumbbell", selected: "dumbbell.fill" }} />
        <Label>Trening</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="diet">
        <Icon sf={{ default: "fork.knife", selected: "fork.knife" }} />
        <Label>Dieta</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <Icon sf={{ default: "chart.line.uptrend.xyaxis", selected: "chart.line.uptrend.xyaxis" }} />
        <Label>Postępy</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>{chatLabel}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="referrals">
        <Icon sf={{ default: "gift", selected: "gift.fill" }} />
        <Label>Polecenia</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <Label>Powiadomienia</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="medical-tests">
        <Icon sf={{ default: "cross.case", selected: "cross.case.fill" }} />
        <Label>Badania</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

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
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
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
        name="progress"
        options={{
          title: "Postępy",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="chart.line.uptrend.xyaxis" tintColor={color} size={22} /> : <Feather name="trending-up" size={22} color={color} />,
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
      <Tabs.Screen
        name="referrals"
        options={{
          title: "Polecenia",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="gift.fill" tintColor={color} size={22} /> : <Ionicons name="gift-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Powiadomienia",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="bell.fill" tintColor={color} size={22} /> : <Ionicons name="notifications-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medical-tests"
        options={{
          title: "Badania",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="cross.case.fill" tintColor={color} size={22} /> : <Ionicons name="medical-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.fill" tintColor={color} size={22} /> : <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="weekly-report"
        options={{ href: null }}
      />
    </Tabs>
  );
}

export default function ClientLayout() {
  if (isLiquidGlassAvailable()) return <NativeClientTabs />;
  return <ClassicClientTabs />;
}
