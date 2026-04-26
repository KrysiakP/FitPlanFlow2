import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

type GymAnalytics = {
  gymId: string;
  gymName: string;
  planTier: string;
  maxTrainers: number;
  activeTrainers: number;
  totalClients: number;
  totalSessions: number;
  totalPlans: number;
  trainerBreakdown: Array<{
    trainerId: string;
    name: string;
    activeClients: number;
    sessionCount: number;
    plansCount: number;
  }>;
};

export default function GymAnalytics() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, refetch, isRefetching } = useQuery<GymAnalytics>({
    queryKey: ["gym-analytics"],
    queryFn: () => apiGet("/api/gym/analytics"),
  });

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const maxClients = Math.max(...(data?.trainerBreakdown.map((t) => t.activeClients) ?? [1]), 1);
  const maxSessions = Math.max(...(data?.trainerBreakdown.map((t) => t.sessionCount) ?? [1]), 1);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Totals */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Podsumowanie siłowni</Text>
      <View style={styles.totalsGrid}>
        <TotalCard icon="people" label="Aktywni trenerzy" value={data?.activeTrainers ?? 0} sub={`/ ${data?.maxTrainers ?? "?"} miejsc`} color={colors.primary} colors={colors} />
        <TotalCard icon="body" label="Wszyscy klienci" value={data?.totalClients ?? 0} color="#10b981" colors={colors} />
        <TotalCard icon="barbell-outline" label="Sesje treningowe" value={data?.totalSessions ?? 0} color="#6366f1" colors={colors} />
        <TotalCard icon="clipboard-outline" label="Plany treningowe" value={data?.totalPlans ?? 0} color="#f59e0b" colors={colors} />
      </View>

      {/* Utilization bar */}
      {data && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Wykorzystanie pakietu</Text>
          <View style={[styles.utilizationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.utilizationHeader}>
              <Text style={[styles.utilizationLabel, { color: colors.foreground }]}>
                {data.activeTrainers} / {data.maxTrainers} trenerów
              </Text>
              <Text style={[styles.utilizationPct, { color: colors.primary }]}>
                {Math.round((data.activeTrainers / data.maxTrainers) * 100)}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min((data.activeTrainers / data.maxTrainers) * 100, 100)}%`,
                    backgroundColor: data.activeTrainers >= data.maxTrainers ? "#ef4444" : colors.primary,
                  },
                ]}
              />
            </View>
            {data.activeTrainers >= data.maxTrainers && (
              <Text style={[styles.limitWarning, { color: "#ef4444" }]}>
                Osiągnięto limit — rozważ upgrade pakietu
              </Text>
            )}
          </View>
        </>
      )}

      {/* Per-trainer breakdown */}
      {data && data.trainerBreakdown.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Aktywność trenerów</Text>

          {/* Clients ranking */}
          <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>Klienci</Text>
          {data.trainerBreakdown
            .sort((a, b) => b.activeClients - a.activeClients)
            .map((t, i) => (
              <Pressable
                key={t.trainerId}
                onPress={() => router.push({ pathname: "/(gym)/trainer/[id]", params: { id: t.trainerId } })}
                style={({ pressed }) => [
                  styles.breakdownRow,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                testID={`row-breakdown-${t.trainerId}`}
              >
                <View style={[styles.rankCircle, { backgroundColor: i === 0 ? "#f59e0b18" : colors.primary + "10" }]}>
                  <Text style={[styles.rankText, { color: i === 0 ? "#f59e0b" : colors.primary }]}>#{i + 1}</Text>
                </View>
                <View style={styles.breakdownInfo}>
                  <Text style={[styles.breakdownName, { color: colors.foreground }]}>{t.name}</Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max((t.activeClients / maxClients) * 100, 2)}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.breakdownValue, { color: colors.foreground }]}>{t.activeClients}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
              </Pressable>
            ))}

          {/* Sessions ranking */}
          <Text style={[styles.subTitle, { color: colors.mutedForeground, marginTop: 16 }]}>Sesje treningowe</Text>
          {data.trainerBreakdown
            .sort((a, b) => b.sessionCount - a.sessionCount)
            .map((t, i) => (
              <Pressable
                key={t.trainerId}
                onPress={() => router.push({ pathname: "/(gym)/trainer/[id]", params: { id: t.trainerId } })}
                style={({ pressed }) => [
                  styles.breakdownRow,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.rankCircle, { backgroundColor: i === 0 ? "#10b98118" : colors.primary + "10" }]}>
                  <Text style={[styles.rankText, { color: i === 0 ? "#10b981" : colors.primary }]}>#{i + 1}</Text>
                </View>
                <View style={styles.breakdownInfo}>
                  <Text style={[styles.breakdownName, { color: colors.foreground }]}>{t.name}</Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max((t.sessionCount / maxSessions) * 100, 2)}%`,
                          backgroundColor: "#10b981",
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.breakdownValue, { color: colors.foreground }]}>{t.sessionCount}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
              </Pressable>
            ))}
        </>
      )}

      {data?.trainerBreakdown.length === 0 && (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak danych</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Dane analityczne pojawią się po dodaniu aktywnych trenerów.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function TotalCard({ icon, label, value, sub, color, colors }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: number;
  sub?: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.totalIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.totalValue, { color: colors.foreground }]}>{value}</Text>
      {sub && <Text style={[styles.totalSub, { color: color }]}>{sub}</Text>}
      <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12, marginTop: 4 },
  subTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  totalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  totalCard: { flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  totalIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  totalValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  totalSub: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  totalLabel: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  utilizationCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24, gap: 10 },
  utilizationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  utilizationLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  utilizationPct: { fontSize: 16, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  limitWarning: { fontSize: 12, fontFamily: "Inter_500Medium" },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  rankCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  rankText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  breakdownInfo: { flex: 1, gap: 6 },
  breakdownName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  barTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },
  breakdownValue: { fontSize: 16, fontFamily: "Inter_700Bold", minWidth: 28, textAlign: "right" },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 48, borderWidth: 1, borderRadius: 16, borderStyle: "dashed", paddingHorizontal: 24, marginTop: 16 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
