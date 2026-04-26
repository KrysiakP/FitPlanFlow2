import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TrainerDetail = {
  trainer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    clientCount: number;
    subscriptionTier: string;
    createdAt: string;
  };
  membership: {
    status: string;
    invitedAt: string;
    joinedAt: string | null;
  };
  stats: {
    activeClients: number;
    totalClients: number;
    sessionsLast30: number;
    plansCount: number;
  };
  clients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  }>;
  weeklySessionChart: Array<{ week: string; sessions: number }>;
};

const TIER_LABELS: Record<string, string> = {
  start: "Start",
  solo: "Solo",
  pro: "Pro",
  elite: "Elite",
  max: "Max",
  studio: "Studio",
};

export default function TrainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, refetch, isRefetching } = useQuery<TrainerDetail>({
    queryKey: ["gym-trainer-detail", id],
    queryFn: () => apiGet(`/api/gym/trainer/${id}/detail`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Nie znaleziono trenera</Text>
      </View>
    );
  }

  const { trainer, stats, clients, weeklySessionChart, membership } = data;
  const initials = ((trainer.firstName[0] ?? "") + (trainer.lastName[0] ?? "")).toUpperCase();
  const maxSessions = Math.max(...weeklySessionChart.map((w) => w.sessions), 1);

  const statBoxes = [
    { icon: "people" as const, label: "Aktywnych klientów", value: stats.activeClients, color: "#10b981" },
    { icon: "people-outline" as const, label: "Wszystkich klientów", value: stats.totalClients, color: colors.primary },
    { icon: "barbell-outline" as const, label: "Sesji (30 dni)", value: stats.sessionsLast30, color: "#6366f1" },
    { icon: "clipboard-outline" as const, label: "Planów treningowych", value: stats.plansCount, color: "#f59e0b" },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Trainer header */}
      <View style={[styles.trainerHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.bigAvatar, { backgroundColor: colors.primary + "18" }]}>
          <Text style={[styles.bigAvatarText, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={styles.trainerHeaderInfo}>
          <Text style={[styles.trainerName, { color: colors.foreground }]}>
            {trainer.firstName} {trainer.lastName}
          </Text>
          <Text style={[styles.trainerEmail, { color: colors.mutedForeground }]}>{trainer.email}</Text>
          <View style={styles.trainerBadges}>
            <View style={[styles.badge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {TIER_LABELS[trainer.subscriptionTier] ?? trainer.subscriptionTier}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: membership.status === "active" ? "#10b98118" : "#ef444418" }]}>
              <Text style={[styles.badgeText, { color: membership.status === "active" ? "#10b981" : "#ef4444" }]}>
                {membership.status === "active" ? "Aktywny" : "Zawieszony"}
              </Text>
            </View>
          </View>
          {membership.joinedAt && (
            <Text style={[styles.joinedAt, { color: colors.mutedForeground }]}>
              Dołączył: {new Date(membership.joinedAt).toLocaleDateString("pl-PL")}
            </Text>
          )}
        </View>
      </View>

      {/* Stats */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Statystyki</Text>
      <View style={styles.statsGrid}>
        {statBoxes.map((s) => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: s.color + "18" }]}>
              <Ionicons name={s.icon} size={20} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Weekly sessions chart */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sesje treningowe (8 tygodni)</Text>
      <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {weeklySessionChart.every((w) => w.sessions === 0) ? (
          <Text style={[styles.noChartData, { color: colors.mutedForeground }]}>Brak sesji w tym okresie</Text>
        ) : (
          <View style={styles.chart}>
            {weeklySessionChart.map((w, i) => {
              const barHeight = maxSessions > 0 ? Math.max((w.sessions / maxSessions) * 80, 2) : 2;
              return (
                <View key={i} style={styles.chartBar}>
                  <Text style={[styles.chartValue, { color: colors.mutedForeground }]}>
                    {w.sessions > 0 ? w.sessions : ""}
                  </Text>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: i === weeklySessionChart.length - 1 ? colors.primary : colors.primary + "60",
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartLabel, { color: colors.mutedForeground }]}>{w.week}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Clients list */}
      {clients.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Klienci ({clients.length})
          </Text>
          {clients.slice(0, 10).map((c) => (
            <View
              key={c.id}
              style={[styles.clientRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              testID={`row-client-${c.id}`}
            >
              <View style={[styles.clientAvatar, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.clientAvatarText, { color: colors.primary }]}>
                  {((c.firstName[0] ?? "") + (c.lastName[0] ?? "")).toUpperCase()}
                </Text>
              </View>
              <View style={styles.clientInfo}>
                <Text style={[styles.clientName, { color: colors.foreground }]}>
                  {c.firstName} {c.lastName}
                </Text>
                <Text style={[styles.clientEmail, { color: colors.mutedForeground }]}>{c.email}</Text>
              </View>
              <View
                style={[
                  styles.clientStatus,
                  { backgroundColor: c.status === "active" ? "#10b98118" : "#6b728018" },
                ]}
              >
                <Text style={[styles.clientStatusText, { color: c.status === "active" ? "#10b981" : colors.mutedForeground }]}>
                  {c.status === "active" ? "Aktywny" : "Archiwalny"}
                </Text>
              </View>
            </View>
          ))}
          {clients.length > 10 && (
            <Text style={[styles.moreClients, { color: colors.mutedForeground }]}>
              + {clients.length - 10} więcej klientów
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  content: { padding: 16 },
  trainerHeader: { flexDirection: "row", gap: 16, borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 24, alignItems: "flex-start" },
  bigAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  bigAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  trainerHeaderInfo: { flex: 1, gap: 4 },
  trainerName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  trainerEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  trainerBadges: { flexDirection: "row", gap: 6, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  joinedAt: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12, marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statBox: { flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  chartContainer: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24 },
  noChartData: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 24 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 110 },
  chartBar: { flex: 1, alignItems: "center", gap: 4 },
  chartValue: { fontSize: 10, fontFamily: "Inter_400Regular" },
  barWrapper: { flex: 1, justifyContent: "flex-end", width: "100%" },
  bar: { width: "100%", borderRadius: 4, minHeight: 2 },
  chartLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  clientAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  clientAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  clientEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clientStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  clientStatusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  moreClients: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
});
