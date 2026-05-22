import { BlurView } from "expo-blur";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useUnreadCount } from "@/hooks/useChat";

const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function NativeTrainerTabs() {
  const outerInsets = useSafeAreaInsets();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;
  const chatLabel = unreadCount > 0 ? `Wiadomości (${unreadCount > 99 ? "99+" : unreadCount})` : "Wiadomości";

  return (
    <SafeAreaInsetsContext.Provider value={outerInsets}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
          <Label>Podopieczni</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="chat">
          <Icon sf={{ default: "message", selected: "message.fill" }} />
          <Label>{chatLabel}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="tools">
          <Icon sf={{ default: "wrench.and.screwdriver", selected: "wrench.and.screwdriver.fill" }} />
          <Label>Narzędzia</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf={{ default: "person", selected: "person.fill" }} />
          <Label>Profil</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </SafeAreaInsetsContext.Provider>
  );
}

function ClassicTrainerTabs() {
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
          title: "Podopieczni",
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="person.2.fill" tintColor={color} size={22} />
              : <Ionicons name="people-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Wiadomości",
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="message.fill" tintColor={color} size={22} />
              : <Ionicons name="chatbubble-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Narzędzia",
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="wrench.and.screwdriver.fill" tintColor={color} size={22} />
              : <Ionicons name="construct-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="person.fill" tintColor={color} size={22} />
              : <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />

      {/* Hidden screens — accessible via router.push */}
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="plans" options={{ href: null }} />
      <Tabs.Screen name="exercise-library" options={{ href: null }} />
      <Tabs.Screen name="diets" options={{ href: null }} />
      <Tabs.Screen name="invitations" options={{ href: null }} />
      <Tabs.Screen name="referrals" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="admin-gyms" options={{ href: null }} />
      <Tabs.Screen name="client/[id]" options={{ href: null }} />
      <Tabs.Screen name="plan/[id]" options={{ href: null }} />
      <Tabs.Screen name="diet/[id]" options={{ href: null }} />
    </Tabs>
  );
}

export default function TrainerLayout() {
  if (!IS_EXPO_GO) {
    let useLiquidGlass = false;
    try {
      useLiquidGlass = isLiquidGlassAvailable();
    } catch {
      useLiquidGlass = false;
    }
    if (useLiquidGlass) return <NativeTrainerTabs />;
  }
  return <ClassicTrainerTabs />;
}

const styles = StyleSheet.create({});
