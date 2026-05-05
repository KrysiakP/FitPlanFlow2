import type { ComponentProps } from "react";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useUnreadCount } from "@/hooks/useChat";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

function TrainerDrawerContent(props: DrawerContentComponentProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();

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

    </View>
  );
}

export default function TrainerLayout() {
  const colors = useColors();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count ?? 0;

  type DrawerScreen = {
    name: string;
    title: string;
    icon: IoniconsName;
    iconFocused: IoniconsName;
    hidden?: boolean;
    customHeader?: boolean;
  };

  const screens: DrawerScreen[] = [
    { name: "index", title: "Podopieczni", icon: "people-outline", iconFocused: "people", customHeader: true },
    { name: "plans", title: "Plany treningowe", icon: "clipboard-outline", iconFocused: "clipboard", hidden: true },
    { name: "exercise-library", title: "Biblioteka ćwiczeń", icon: "barbell-outline", iconFocused: "barbell" },
    { name: "diets", title: "Diety", icon: "nutrition-outline", iconFocused: "nutrition", hidden: true },
    { name: "invitations", title: "Zaproszenia", icon: "mail-outline", iconFocused: "mail" },
    {
      name: "chat",
      title: "Wiadomości",
      icon: "chatbubble-outline",
      iconFocused: "chatbubble",
      customHeader: true,
    },
    { name: "payments", title: "Płatności", icon: "wallet-outline", iconFocused: "wallet" },
    { name: "referrals", title: "Polecenia", icon: "gift-outline", iconFocused: "gift" },
    { name: "notifications", title: "Powiadomienia", icon: "notifications-outline", iconFocused: "notifications" },
    { name: "profile", title: "Profil i subskrypcja", icon: "person-circle-outline", iconFocused: "person-circle", customHeader: true },
    { name: "client/[id]", title: "Klient", icon: "person-outline", iconFocused: "person", hidden: true },
    { name: "plan/[id]", title: "Plan treningowy", icon: "clipboard-outline", iconFocused: "clipboard", hidden: true },
    { name: "diet/[id]", title: "Plan diety", icon: "nutrition-outline", iconFocused: "nutrition", hidden: true },
    { name: "admin-gyms", title: "Admin — Siłownie", icon: "business-outline", iconFocused: "business", hidden: true },
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
            headerShown: s.customHeader ? false : true,
            drawerItemStyle: s.hidden
              ? { display: "none" }
              : { borderRadius: 10, marginHorizontal: 8, marginVertical: 2 },
            drawerIcon: ({ focused, color }) =>
              s.name === "chat" && unreadCount > 0 ? (
                <View style={{ position: "relative" }}>
                  <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={22} color={color} />
                  <View style={styles.chatBadge}>
                    <Text style={styles.chatBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                </View>
              ) : (
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
  chatBadge: {
    position: "absolute",
    top: -5,
    right: -7,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  chatBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
});
