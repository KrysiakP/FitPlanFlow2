import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

interface ExerciseLogItem {
  id: string;
  loggedAt: string;
}

interface WorkoutSessionItem {
  id: string;
  workoutId: string;
  planId: string;
  exercisesCompleted: number;
  totalExercises: number;
  durationSeconds: number | null;
  completedAt: string;
}

type Colors = ReturnType<typeof useColors>;
type IoniconsName = ComponentProps<typeof Ionicons>["name"];

interface ProgressEntry {
  id: string;
  date: string;
  weight?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  notes?: string | null;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s > 0 ? `${s}s` : ""}`.trim();
  return `${s}s`;
}

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<ProgressEntry | null>({
    queryKey: ["client-progress", user?.id],
    queryFn: () => apiGet<ProgressEntry | null>("/api/client/progress"),
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: logsData } = useQuery<ExerciseLogItem[]>({
    queryKey: ["exercise-logs-all", user?.id],
    queryFn: () => apiGet<ExerciseLogItem[]>("/api/exercise-logs"),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const { data: sessionsData } = useQuery<WorkoutSessionItem[]>({
    queryKey: ["workout-sessions", user?.id],
    queryFn: () => apiGet<WorkoutSessionItem[]>("/api/workout-sessions"),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  const entries = data ? [data] : [];
  const latest = data ?? null;
  const sessions = sessionsData ?? [];

  const workoutActivity = (() => {
    const days: { label: string; key: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pl-PL", { weekday: "short" }).slice(0, 2);
      days.push({ label: i % 2 === 0 ? label : "", key, count: 0 });
    }
    (logsData ?? []).forEach((log) => {
      const key = new Date(log.loggedAt).toISOString().slice(0, 10);
      const day = days.find((d) => d.key === key);
      if (day) day.count += 1;
    });
    return days;
  })();
  const maxCount = Math.max(...workoutActivity.map((d) => d.count), 1);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 },
      ]}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Postępy</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Aktywność treningowa (14 dni)
          </Text>
          <View style={[chartStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={chartStyles.bars}>
              {workoutActivity.map((day) => (
                <View key={day.key} style={chartStyles.barCol}>
                  <View style={chartStyles.barWrap}>
                    <View
                      style={[
                        chartStyles.bar,
                        {
                          backgroundColor: day.count > 0 ? colors.primary : colors.border,
                          height: Math.max(4, (day.count / maxCount) * 80),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[chartStyles.barLabel, { color: colors.mutedForeground }]}>
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={[chartStyles.legend, { borderTopColor: colors.border }]}>
              <View style={[chartStyles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[chartStyles.legendText, { color: colors.mutedForeground }]}>
                Liczba zalogowanych ćwiczeń
              </Text>
            </View>
          </View>

          {!latest && (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="trending-up-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak pomiarów</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Twój trener może dodać pomiary do Twojego profilu.
              </Text>
            </View>
          )}

          {latest && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Ostatni pomiar
              </Text>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                {formatDate(latest.date)}
              </Text>
              <View style={styles.metricsGrid}>
                {latest.weight != null && (
                  <MetricCard
                    label="Waga"
                    value={`${latest.weight} kg`}
                    icon="scale-outline"
                    color={colors.primary}
                    colors={colors}
                  />
                )}
                {latest.bodyFat != null && (
                  <MetricCard
                    label="Tkanka tłuszcz."
                    value={`${latest.bodyFat}%`}
                    icon="body-outline"
                    color="#d97706"
                    colors={colors}
                  />
                )}
                {latest.muscleMass != null && (
                  <MetricCard
                    label="Masa mięśni."
                    value={`${latest.muscleMass} kg`}
                    icon="barbell-outline"
                    color="#16a34a"
                    colors={colors}
                  />
                )}
                {latest.chest != null && (
                  <MetricCard
                    label="Klatka"
                    value={`${latest.chest} cm`}
                    icon="resize-outline"
                    color="#7c3aed"
                    colors={colors}
                  />
                )}
                {latest.waist != null && (
                  <MetricCard
                    label="Talia"
                    value={`${latest.waist} cm`}
                    icon="resize-outline"
                    color="#db2777"
                    colors={colors}
                  />
                )}
                {latest.hips != null && (
                  <MetricCard
                    label="Biodra"
                    value={`${latest.hips} cm`}
                    icon="resize-outline"
                    color="#0891b2"
                    colors={colors}
                  />
                )}
              </View>
            </>
          )}

          {entries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.historyHeader}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.historyDate, { color: colors.foreground }]}>
                  {formatDate(entry.date)}
                </Text>
              </View>
              <View style={styles.historyMeasures}>
                {entry.weight != null && (
                  <HistoryChip label="Waga" value={`${entry.weight}kg`} colors={colors} />
                )}
                {entry.bodyFat != null && (
                  <HistoryChip label="TT" value={`${entry.bodyFat}%`} colors={colors} />
                )}
                {entry.muscleMass != null && (
                  <HistoryChip label="MM" value={`${entry.muscleMass}kg`} colors={colors} />
                )}
              </View>
              {entry.notes && (
                <Text style={[styles.historyNotes, { color: colors.mutedForeground }]}>
                  {entry.notes}
                </Text>
              )}
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historia treningów</Text>
          {sessions.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="barbell-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak ukończonych treningów</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Ukończone treningi pojawią się tutaj po zakończeniu sesji.
              </Text>
            </View>
          ) : (
            sessions.map((session) => {
              const pct = session.totalExercises > 0
                ? Math.round((session.exercisesCompleted / session.totalExercises) * 100)
                : 0;
              const duration = formatDuration(session.durationSeconds);
              const isComplete = session.exercisesCompleted === session.totalExercises;
              return (
                <View
                  key={session.id}
                  style={[sessionStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  testID={`card-session-${session.id}`}
                >
                  <View style={sessionStyles.header}>
                    <View style={[sessionStyles.iconWrap, { backgroundColor: isComplete ? "#16a34a1a" : colors.primary + "1a" }]}>
                      <Ionicons
                        name={isComplete ? "checkmark-circle-outline" : "partly-sunny-outline"}
                        size={20}
                        color={isComplete ? "#16a34a" : colors.primary}
                      />
                    </View>
                    <View style={sessionStyles.info}>
                      <Text style={[sessionStyles.date, { color: colors.foreground }]}>
                        {formatDate(session.completedAt)}
                      </Text>
                      <Text style={[sessionStyles.time, { color: colors.mutedForeground }]}>
                        {formatTime(session.completedAt)}
                        {duration ? `  ·  ${duration}` : ""}
                      </Text>
                    </View>
                    <View style={[sessionStyles.badge, { backgroundColor: isComplete ? "#16a34a1a" : colors.accent }]}>
                      <Text style={[sessionStyles.badgeText, { color: isComplete ? "#16a34a" : colors.mutedForeground }]}>
                        {pct}%
                      </Text>
                    </View>
                  </View>
                  <View style={[sessionStyles.progressBar, { backgroundColor: colors.border }]}>
                    <View style={sessionStyles.progressFlex}>
                      <View style={{ flex: pct, backgroundColor: isComplete ? "#16a34a" : colors.primary, borderRadius: 4 }} />
                      <View style={{ flex: Math.max(0, 100 - pct) }} />
                    </View>
                  </View>
                  <Text style={[sessionStyles.exercises, { color: colors.mutedForeground }]}>
                    {session.exercisesCompleted}/{session.totalExercises} ćwiczeń ukończonych
                  </Text>
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: IoniconsName;
  color: string;
  colors: Colors;
}

function MetricCard({ label, value, icon, color, colors }: MetricCardProps) {
  return (
    <View style={[metricStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[metricStyles.icon, { backgroundColor: color + "1a" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[metricStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[metricStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

interface HistoryChipProps {
  label: string;
  value: string;
  colors: Colors;
}

function HistoryChip({ label, value, colors }: HistoryChipProps) {
  return (
    <View style={[hStyles.chip, { backgroundColor: colors.accent }]}>
      <Text style={[hStyles.text, { color: colors.mutedForeground }]}>
        {label}: {value}
      </Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    alignItems: "center",
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  value: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});

const sessionStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  date: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFlex: {
    flex: 1,
    flexDirection: "row" as const,
    height: 6,
  },
  exercises: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});

const chartStyles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24 },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 96, gap: 4 },
  barCol: { flex: 1, alignItems: "center" },
  barWrap: { flex: 1, justifyContent: "flex-end", width: "100%" },
  bar: { borderRadius: 4, width: "100%" },
  barLabel: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 4, height: 12 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

const hStyles = StyleSheet.create({
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 16 },
  loader: { marginTop: 40 },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 8 },
  dateLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  historyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyDate: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  historyMeasures: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  historyNotes: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
});
