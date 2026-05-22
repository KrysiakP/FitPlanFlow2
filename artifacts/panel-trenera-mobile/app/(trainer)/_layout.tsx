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

  const headerStyle = {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  } as const;
  const headerTitleStyle = { color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 17 } as const;

  return (
    <Tabs
      screenOptions={{
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
        headerStyle,
        headerTitleStyle,
        headerTintColor: colors.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
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
          headerShown: false,
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
          headerShown: false,
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
          headerShown: false,
          title: "Profil",
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="person.fill" tintColor={color} size={22} />
              : <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />

      {/* Hidden screens — show native header with back button for proper safe-area handling */}
      <Tabs.Screen name="payments" options={{ href: null, title: "Płatności" }} />
      <Tabs.Screen name="plans" options={{ href: null, title: "Plany" }} />
      <Tabs.Screen name="exercise-library" options={{ href: null, title: "Ćwiczenia" }} />
      <Tabs.Screen name="diets" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="invitations" options={{ href: null, title: "Zaproszenia" }} />
      <Tabs.Screen name="referrals" options={{ href: null, title: "Polecenia" }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: "Powiadomienia" }} />
      <Tabs.Screen name="admin-gyms" options={{ href: null, title: "Siłownie" }} />
      <Tabs.Screen name="client/[id]" options={{ href: null, title: "" }} />
      <Tabs.Screen name="plan/[id]" options={{ href: null, title: "" }} />
      <Tabs.Screen name="diet/[id]" options={{ href: null, title: "" }} />
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
