import type { ComponentProps } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const TIER_LABELS: Record<string, string> = {
  start: "Start (darmowy)",
  solo: "Solo",
  pro: "Pro",
  elite: "Elite",
  studio: "Studio",
};

export default function TrainerProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();

  const tier = user?.subscriptionTier ?? "start";
  const tierLabel = TIER_LABELS[tier] ?? tier;
  const isActive = user?.subscriptionStatus === "active";

  async function handleLogout() {
    Alert.alert("Wylogowanie", "Czy na pewno chcesz się wylogować?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Wyloguj",
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profil</Text>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.primary + "1a" }]}>
          <Ionicons name="barbell-outline" size={13} color={colors.primary} />
          <Text style={[styles.roleText, { color: colors.primary }]}>Trener</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subskrypcja</Text>
      <View style={[styles.subscriptionCard, { backgroundColor: colors.primary }]}>
        <View style={styles.subHeader}>
          <View>
            <Text style={styles.subTier}>{tierLabel}</Text>
            <Text style={styles.subStatus}>
              {isActive ? "Aktywna" : user?.subscriptionStatus === "trialing" ? "Okres próbny" : "Nieaktywna"}
            </Text>
          </View>
          <View style={[styles.subBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons name="star" size={16} color="#fff" />
          </View>
        </View>
        <View style={[styles.subDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
        <Pressable
          onPress={() => Linking.openURL("https://paneltrenera.pl/cennik")}
          style={({ pressed }) => [styles.subBtn, { opacity: pressed ? 0.8 : 1 }]}
          testID="button-manage-subscription"
        >
          <Ionicons name="globe-outline" size={16} color="#fff" />
          <Text style={styles.subBtnText}>Zarządzaj subskrypcją na paneltrenera.pl</Text>
          <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ustawienia</Text>
      <MenuRow icon="globe-outline" label="Panel trenera web" desc="Otwórz pełny panel w przeglądarce" colors={colors} onPress={() => Linking.openURL("https://paneltrenera.pl")} />
      <MenuRow icon="people-outline" label="Zaproś klienta" desc="Wyślij zaproszenie nowemu klientowi" colors={colors} onPress={() => Linking.openURL("https://paneltrenera.pl/zaproszenie")} />
      <MenuRow icon="shield-checkmark-outline" label="Prywatność i RODO" desc="Zarządzaj zgodami i danymi" colors={colors} />
      <MenuRow icon="help-circle-outline" label="Pomoc i kontakt" desc="FAQ i support techniczny" colors={colors} />

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutBtn,
          { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "44", opacity: pressed ? 0.8 : 1 },
        ]}
        testID="button-logout"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Wyloguj się</Text>
      </Pressable>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Panel Trenera v1.0{"\n"}paneltrenera.pl
      </Text>
    </ScrollView>
  );
}

interface MenuRowProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  desc?: string;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
}

function MenuRow({ icon, label, desc, colors, onPress }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={18} color={colors.foreground} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
        {desc && <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{desc}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 16 },
  profileCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold" },
  email: { fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  subscriptionCard: { borderRadius: 16, padding: 20, marginBottom: 24, gap: 16 },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subTier: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  subStatus: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  subBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  subDivider: { height: 1 },
  subBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  subBtnText: { flex: 1, color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8, marginBottom: 16 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
