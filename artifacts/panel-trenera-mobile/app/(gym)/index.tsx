import { ScrollView, StyleSheet, Text, View, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

type GymMe = {
  id: string;
  name: string;
  planTier: string;
  maxTrainers: number;
  contactEmail: string;
  phone: string;
  address: string;
  stats: {
    activeTrainers: number;
    invitedTrainers: number;
    totalClients: number;
  };
};

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function GymDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: gym, isLoading, refetch, isRefetching } = useQuery<GymMe>({
    queryKey: ["gym-me"],
    queryFn: () => apiGet("/api/gym/me"),
  });

  const statCards = [
    {
      icon: "people" as const,
      label: "Aktywnych trenerów",
      value: gym?.stats.activeTrainers ?? 0,
      color: colors.primary,
      onPress: () => router.push("/(gym)/trainers"),
    },
    {
      icon: "person-add" as const,
      label: "Oczekujących zaproszeń",
      value: gym?.stats.invitedTrainers ?? 0,
      color: "#f59e0b",
      onPress: () => router.push("/(gym)/trainers"),
    },
    {
      icon: "body" as const,
      label: "Klientów w siłowni",
      value: gym?.stats.totalClients ?? 0,
      color: "#10b981",
      onPress: () => router.push("/(gym)/analytics"),
    },
    {
      icon: "shield-checkmark" as const,
      label: "Limit trenerów",
      value: gym?.maxTrainers ?? "—",
      color: "#6366f1",
      onPress: undefined,
    },
  ];

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Gym hero card */}
      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <View style={styles.heroIcon}>
          <Ionicons name="barbell-outline" size={32} color="rgba(255,255,255,0.8)" />
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{gym?.name ?? "Siłownia"}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.heroBadge]}>
              <Text style={styles.heroBadgeText}>Plan {TIER_LABELS[gym?.planTier ?? "starter"] ?? "Starter"}</Text>
            </View>
          </View>
          {gym?.address ? (
            <Text style={styles.heroAddress} numberOfLines={1}>{gym.address}</Text>
          ) : null}
        </View>
      </View>

      {/* Stats grid */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Statystyki</Text>
      <View style={styles.statsGrid}>
        {statCards.map((card) => (
          <Pressable
            key={card.label}
            onPress={card.onPress}
            style={({ pressed }) => [
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
            testID={`card-stat-${card.label}`}
          >
            <View style={[styles.statIconBox, { backgroundColor: card.color + "18" }]}>
              <Ionicons name={card.icon} size={22} color={card.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{card.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Szybkie akcje</Text>
      <QuickAction
        icon="person-add-outline"
        title="Zaproś trenera"
        desc="Dodaj nowego trenera do siłowni"
        color={colors.primary}
        colors={colors}
        onPress={() => router.push("/(gym)/trainers")}
        testID="button-quick-invite"
      />
      <QuickAction
        icon="people-outline"
        title="Lista trenerów"
        desc="Zarządzaj trenerami i ich statusem"
        color="#10b981"
        colors={colors}
        onPress={() => router.push("/(gym)/trainers")}
        testID="button-quick-trainers"
      />
      <QuickAction
        icon="bar-chart-outline"
        title="Analityka siłowni"
        desc="Sprawdź wyniki i aktywność trenerów"
        color="#6366f1"
        colors={colors}
        onPress={() => router.push("/(gym)/analytics")}
        testID="button-quick-analytics"
      />
      <QuickAction
        icon="business-outline"
        title="Profil siłowni"
        desc="Edytuj dane kontaktowe siłowni"
        color="#f59e0b"
        colors={colors}
        onPress={() => router.push("/(gym)/profile")}
        testID="button-quick-profile"
      />
    </ScrollView>
  );
}

function QuickAction({
  icon,
  title,
  desc,
  color,
  colors,
  onPress,
  testID,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  desc: string;
  color: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.quickActionText}>
        <Text style={[styles.quickActionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.quickActionDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, gap: 0 },
  heroCard: {
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroInfo: { flex: 1 },
  heroName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 6 },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  heroBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  heroAddress: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12, marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: "flex-start",
  },
  statIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  quickActionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  quickActionText: { flex: 1 },
  quickActionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  quickActionDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
