import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { apiGet } from "@/lib/api";
import * as Haptics from "expo-haptics";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

type GymMe = {
  id: string;
  name: string;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  planTier: string;
  maxTrainers: number;
  logoUrl: string | null;
  createdAt: string;
  stats: {
    activeTrainers: number;
    invitedTrainers: number;
    totalClients: number;
  };
};

const TIER_INFO: Record<string, { label: string; color: string; desc: string }> = {
  starter: { label: "Starter", color: "#6366f1", desc: "Do 5 trenerów" },
  pro: { label: "Pro", color: "#0846ab", desc: "Do 15 trenerów" },
  enterprise: { label: "Enterprise", color: "#f59e0b", desc: "Bez limitu trenerów" },
};

export default function GymProfile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const { data: gym, isLoading, refetch, isRefetching } = useQuery<GymMe>({
    queryKey: ["gym-me"],
    queryFn: () => apiGet("/api/gym/me"),
  });

  async function handleLogout() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace("/(auth)/login");
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const tier = TIER_INFO[gym?.planTier ?? "starter"] ?? TIER_INFO.starter;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Gym card */}
      <View style={[styles.gymCard, { backgroundColor: colors.primary }]}>
        <View style={styles.gymCardIcon}>
          <Ionicons name="barbell-outline" size={30} color="rgba(255,255,255,0.85)" />
        </View>
        <View style={styles.gymCardInfo}>
          <Text style={styles.gymName}>{gym?.name ?? "Siłownia"}</Text>
          <View style={styles.gymBadgeRow}>
            <View style={styles.gymBadge}>
              <Text style={styles.gymBadgeText}>Plan {tier.label}</Text>
            </View>
            <View style={styles.gymBadge}>
              <Text style={styles.gymBadgeText}>{tier.desc}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Gym info */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dane siłowni</Text>
      {[
        { icon: "mail-outline" as const, label: "E-mail kontaktowy", value: gym?.contactEmail },
        { icon: "call-outline" as const, label: "Telefon", value: gym?.phone },
        { icon: "location-outline" as const, label: "Adres", value: gym?.address },
        { icon: "calendar-outline" as const, label: "Data założenia", value: gym?.createdAt ? new Date(gym.createdAt).toLocaleDateString("pl-PL") : undefined },
      ].map(({ icon, label, value }) => (
        value ? (
          <View key={label} style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + "14" }]}>
              <Ionicons name={icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
            </View>
          </View>
        ) : null
      ))}

      {/* Account info */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Konto właściciela</Text>
      <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.infoIcon, { backgroundColor: colors.primary + "14" }]}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.infoText}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Imię i nazwisko</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{user?.firstName} {user?.lastName}</Text>
        </View>
      </View>
      <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.infoIcon, { backgroundColor: colors.primary + "14" }]}>
          <Ionicons name="mail-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.infoText}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>E-mail</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{user?.email}</Text>
        </View>
      </View>

      {/* Package info */}
      {Platform.OS !== "ios" && (
      <>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subskrypcja</Text>
      <View style={[styles.packageCard, { borderColor: tier.color + "60", backgroundColor: tier.color + "08" }]}>
        <View style={styles.packageHeader}>
          <View style={[styles.packageBadge, { backgroundColor: tier.color }]}>
            <Text style={styles.packageBadgeText}>{tier.label}</Text>
          </View>
          <Text style={[styles.packageDesc, { color: colors.foreground }]}>{tier.desc}</Text>
        </View>
        <View style={[styles.usageBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.usageBarFill,
              {
                width: `${Math.min(((gym?.stats.activeTrainers ?? 0) / (gym?.maxTrainers ?? 1)) * 100, 100)}%`,
                backgroundColor: tier.color,
              },
            ]}
          />
        </View>
        <Text style={[styles.usageText, { color: colors.mutedForeground }]}>
          {gym?.stats.activeTrainers ?? 0} / {gym?.maxTrainers ?? "?"} aktywnych trenerów
        </Text>
        <Pressable
          onPress={() => Linking.openURL("https://paneltrenera.pl/cennik")}
          style={({ pressed }) => [styles.upgradeBtn, { borderColor: tier.color + "60", opacity: pressed ? 0.8 : 1 }]}
          testID="button-upgrade-package"
        >
          <Ionicons name="arrow-up-circle-outline" size={16} color={tier.color} />
          <Text style={[styles.upgradeBtnText, { color: tier.color }]}>Zmień pakiet na paneltrenera.pl</Text>
        </Pressable>
      </View>
      </>
      )}

      {/* Settings */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ustawienia</Text>
      <ThemeToggleRow colors={colors} />
      <MenuRow icon="globe-outline" label="Panel trenera web" desc="Otwórz pełny panel w przeglądarce" colors={colors} onPress={() => Linking.openURL("https://paneltrenera.pl")} />
      <MenuRow icon="card-outline" label="Subskrypcja" desc="Zarządzaj subskrypcją na paneltrenera.pl" colors={colors} onPress={() => Linking.openURL("https://paneltrenera.pl")} />
      <MenuRow icon="shield-checkmark-outline" label="Prywatność i RODO" desc="Zarządzaj zgodami i danymi" colors={colors} onPress={() => router.push("/(auth)/privacy")} />
      <MenuRow icon="help-circle-outline" label="Pomoc i kontakt" desc="FAQ i support techniczny" colors={colors} onPress={() => router.push("/(auth)/help")} />

      <DeleteAccountButton />

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
        Panel Trenera — Siłownia v1.0{"\n"}paneltrenera.pl
      </Text>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  desc,
  colors,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  desc: string;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: colors.primary + "14" }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ThemeToggleRow({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { preference, setPreference } = useTheme();
  const options: { value: ThemePreference; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[] = [
    { value: "light", icon: "sunny-outline", label: "Jasny" },
    { value: "system", icon: "phone-portrait-outline", label: "System" },
    { value: "dark", icon: "moon-outline", label: "Ciemny" },
  ];

  return (
    <View style={[styles.menuRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.menuIcon, { backgroundColor: colors.primary + "14" }]}>
        <Ionicons name="contrast-outline" size={20} color={colors.primary} />
      </View>
      <View style={[styles.menuInfo]}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>Motyw</Text>
      </View>
      <View style={[styles.themeToggleRow, { backgroundColor: colors.accent, borderColor: colors.border }]}>
        {options.map((opt) => {
          const active = preference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => { setPreference(opt.value); Haptics.selectionAsync(); }}
              style={[styles.themeOption, active && { backgroundColor: colors.primary }]}
              testID={`button-theme-${opt.value}`}
            >
              <Ionicons name={opt.icon} size={14} color={active ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.themeOptionLabel, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  gymCard: { borderRadius: 18, padding: 20, flexDirection: "row", gap: 16, alignItems: "center", marginBottom: 24 },
  gymCardIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  gymCardInfo: { flex: 1 },
  gymName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 6 },
  gymBadgeRow: { flexDirection: "row", gap: 8 },
  gymBadge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  gymBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10, marginTop: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  packageCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10, marginBottom: 24 },
  packageHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  packageBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  packageBadgeText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  packageDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  usageBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  usageBarFill: { height: 6, borderRadius: 3 },
  usageText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  upgradeBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, padding: 10, justifyContent: "center" },
  upgradeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8, marginBottom: 16 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  themeToggleRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  themeOption: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7 },
  themeOptionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
