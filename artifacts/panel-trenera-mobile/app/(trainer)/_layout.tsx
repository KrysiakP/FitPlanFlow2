import type { ComponentProps } from "react";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

function TrainerDrawerContent(props: DrawerContentComponentProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();

  async function handleLogout() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={[styles.drawerContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.drawerHeader, { paddingTop: insets.top + 16, backgroundColor: colors.primary }]}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.headerRole}>Trener</Text>
          </View>
        </View>
      </View>

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: colors.background }}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.destructive + "18", opacity: pressed ? 0.7 : 1 },
          ]}
          testID="button-logout"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Wyloguj się</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function TrainerLayout() {
  const colors = useColors();

  type DrawerScreen = {
    name: string;
    title: string;
    icon: IoniconsName;
    iconFocused: IoniconsName;
    hidden?: boolean;
  };

  const screens: DrawerScreen[] = [
    { name: "index", title: "Klienci", icon: "people-outline", iconFocused: "people" },
    { name: "plans", title: "Plany treningowe", icon: "clipboard-outline", iconFocused: "clipboard" },
    { name: "invitations", title: "Zaproszenia", icon: "mail-outline", iconFocused: "mail" },
    { name: "profile", title: "Profil i subskrypcja", icon: "person-circle-outline", iconFocused: "person-circle" },
    { name: "client", title: "Klient", icon: "person-outline", iconFocused: "person", hidden: true },
  ];

  return (
    <Drawer
      drawerContent={(props) => <TrainerDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: "Inter_700Bold", fontSize: 18 },
        headerShadowVisible: false,
        drawerStyle: { backgroundColor: colors.background, width: 280 },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.mutedForeground,
        drawerActiveBackgroundColor: colors.primary + "14",
        drawerLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginLeft: -8 },
        drawerItemStyle: { borderRadius: 10, marginHorizontal: 8, marginVertical: 2 },
      }}
    >
      {screens.map((s) => (
        <Drawer.Screen
          key={s.name}
          name={s.name}
          options={{
            title: s.title,
            drawerItemStyle: s.hidden
              ? { display: "none" }
              : { borderRadius: 10, marginHorizontal: 8, marginVertical: 2 },
            drawerIcon: ({ focused, color }) => (
              <Ionicons name={focused ? s.iconFocused : s.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1 },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  headerInfo: { flex: 1 },
  headerName: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  headerRole: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular" },
  scrollContent: { paddingTop: 8 },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
