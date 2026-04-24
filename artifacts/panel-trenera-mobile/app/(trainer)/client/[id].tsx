import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { StatsCard } from "@/components/StatsCard";
import { apiGet } from "@/lib/api";

interface ClientDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
}

interface PlanAssignment {
  plan?: { id: string; name: string; description?: string | null } | null;
}

interface ProgressEntry {
  id: string;
  date: string;
  weight?: number | null;
  bodyFat?: number | null;
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("pl-PL"); } catch { return d; }
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bearerToken } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: progress, isLoading: loadingProgress, refetch, isRefetching } = useQuery<ProgressEntry[]>({
    queryKey: ["client-progress", id],
    queryFn: () => apiGet<ProgressEntry[]>(`/api/client-progress/${id}`, bearerToken),
    enabled: !!id,
  });

  const { data: assignment, isLoading: loadingPlan } = useQuery<PlanAssignment>({
    queryKey: ["plan-assignment", id],
    queryFn: () => apiGet<PlanAssignment>(`/api/plan-assignment/${id}`, bearerToken),
    enabled: !!id,
  });

  const latestProgress = progress?.[0];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 30 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn} testID="button-back">
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Klienci</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Aktywny plan</Text>
      {loadingPlan ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={[styles.planCard, { backgroundColor: colors.primary }]}>
          <Ionicons name="barbell" size={20} color="rgba(255,255,255,0.8)" />
          <Text style={styles.planName}>
            {assignment?.plan?.name ?? "Brak przypisanego planu"}
          </Text>
          {assignment?.plan?.description && (
            <Text style={styles.planDesc}>{assignment.plan.description}</Text>
          )}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ostatni pomiar</Text>
      {loadingProgress ? (
        <ActivityIndicator color={colors.primary} />
      ) : latestProgress ? (
        <>
          <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>{formatDate(latestProgress.date)}</Text>
          <View style={styles.statsRow}>
            {latestProgress.weight != null && (
              <StatsCard label="Waga (kg)" value={latestProgress.weight} iconName="scale-outline" color={colors.primary} />
            )}
            {latestProgress.bodyFat != null && (
              <StatsCard label="Tkanka (%)" value={latestProgress.bodyFat} iconName="body-outline" color="#d97706" />
            )}
          </View>
        </>
      ) : (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak pomiarów</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historia postępów</Text>
      {(progress ?? []).slice(0, 10).map((e) => (
        <View key={e.id} style={[styles.progressRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={[styles.progressDate, { color: colors.foreground }]}>{formatDate(e.date)}</Text>
          {e.weight != null && <Text style={[styles.progressValue, { color: colors.mutedForeground }]}>{e.weight} kg</Text>}
          {e.bodyFat != null && <Text style={[styles.progressValue, { color: colors.mutedForeground }]}>{e.bodyFat}% TT</Text>}
        </View>
      ))}
      {(progress ?? []).length === 0 && !loadingProgress && (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak historii pomiarów</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  planCard: { borderRadius: 16, padding: 18, marginBottom: 20, gap: 8 },
  planName: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  planDesc: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular" },
  dateLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 10 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  emptyBox: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", marginBottom: 16 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  progressDate: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  progressValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
