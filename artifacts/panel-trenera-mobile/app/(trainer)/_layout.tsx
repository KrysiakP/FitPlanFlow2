import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useUnreadCount } from "@/hooks/useChat";

function ClassicTrainerTabs() {
  const colors = useColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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
      initialRouteName="panel"
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
        name="panel"
        options={{
          headerShown: false,
          title: "Panel",
          tabBarLabel: () => null,
          tabBarIcon: () => (
            <View
              style={[
                styles.raisedIconWrap,
                {
                  backgroundColor: colors.primary,
                  shadowColor: "#000",
                },
              ]}
            >
              {isIOS
                ? <SymbolView name="house.fill" tintColor={colors.primaryForeground} size={26} />
                : <Ionicons name="home" size={26} color={colors.primaryForeground} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="kalendarz-trenera"
        options={{
          headerShown: false,
          title: "Kalendarz",
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="calendar" tintColor={color} size={22} />
              : <Ionicons name="calendar-outline" size={22} color={color} />,
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

      {/* Hidden screens — each builds its own custom header, so the native one is suppressed */}
      <Tabs.Screen name="payments" options={{ href: null, headerShown: false, title: "Płatności" }} />
      <Tabs.Screen name="plans" options={{ href: null, headerShown: false, title: "Plany" }} />
      <Tabs.Screen name="exercise-library" options={{ href: null, headerShown: false, title: "Ćwiczenia" }} />
      <Tabs.Screen name="diets" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="invitations" options={{ href: null, headerShown: false, title: "Zaproszenia" }} />
      <Tabs.Screen name="referrals" options={{ href: null, headerShown: false, title: "Polecenia" }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false, title: "Powiadomienia" }} />
      <Tabs.Screen name="admin-gyms" options={{ href: null, headerShown: false, title: "Siłownie" }} />
      <Tabs.Screen name="rest-timer" options={{ href: null, headerShown: false, title: "Timer przerwy" }} />
      <Tabs.Screen name="pomagamy" options={{ href: null, headerShown: false, title: "PomagaMY" }} />
      <Tabs.Screen name="business-stats" options={{ href: null, headerShown: false, title: "Statystyki biznesowe" }} />
      <Tabs.Screen name="wspolny-trening" options={{ href: null, headerShown: false, title: "Wspólny trening" }} />
      <Tabs.Screen name="client/[id]" options={{ href: null, headerShown: false, title: "" }} />
      <Tabs.Screen name="plan/[id]" options={{ href: null, headerShown: false, title: "" }} />
      <Tabs.Screen name="diet/[id]" options={{ href: null, headerShown: false, title: "" }} />
    </Tabs>
  );
}

export default function TrainerLayout() {
  return <ClassicTrainerTabs />;
}

const styles = StyleSheet.create({
  raisedIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -22,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
});
