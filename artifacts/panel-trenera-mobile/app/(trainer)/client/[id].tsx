import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColors } from "@/hooks/useColors";
import { StatsCard } from "@/components/StatsCard";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeLocal(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

function parseDateLocal(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, h || 0, min || 0);
}

function getWeekStartKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function calculateReportStreak(reportDates: string[]): number {
  const weekStarts = Array.from(new Set(reportDates.map((d) => getWeekStartKey(new Date(d))))).sort((a, b) => b.localeCompare(a));
  if (weekStarts.length === 0) return 0;
  let streak = 1;
  let current = new Date(weekStarts[0]);
  for (let i = 1; i < weekStarts.length; i++) {
    const prevWeek = new Date(current);
    prevWeek.setDate(prevWeek.getDate() - 7);
    const prevWeekKey = prevWeek.toISOString().slice(0, 10);
    if (weekStarts[i] === prevWeekKey) {
      streak++;
      current = prevWeek;
    } else {
      break;
    }
  }
  return streak;
}

const COMPARISON_METRICS: { label: string; field: "weight" | "chest" | "waist" | "hips" | "arm" | "leg"; unit: string }[] = [
  { label: "Waga", field: "weight", unit: " kg" },
  { label: "Klatka", field: "chest", unit: " cm" },
  { label: "Talia", field: "waist", unit: " cm" },
  { label: "Biodro", field: "hips", unit: " cm" },
  { label: "Ramię", field: "arm", unit: " cm" },
  { label: "Udo", field: "leg", unit: " cm" },
];

function parseNumericValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function formatDiff(diff: number | null, unit: string): { text: string; color: string } {
  if (diff === null) return { text: "-", color: "" };
  if (Math.abs(diff) < 0.05) return { text: `0${unit}`, color: "" };
  const abs = Math.abs(diff).toFixed(1);
  return diff > 0 ? { text: `+${abs}${unit}`, color: "#16a34a" } : { text: `-${abs}${unit}`, color: "#ef4444" };
}

function calculateComparison(oldReport: WeeklyReport, newReport: WeeklyReport) {
  return COMPARISON_METRICS.map((m) => {
    const oldVal = parseNumericValue(oldReport[m.field]);
    const newVal = parseNumericValue(newReport[m.field]);
    const diff = oldVal !== null && newVal !== null ? newVal - oldVal : null;
    return { ...m, ...formatDiff(diff, m.unit) };
  }).filter((m) => m.text !== "-");
}

function ProgressComparisonSection({ reports, colors }: { reports: WeeklyReport[]; colors: ReturnType<typeof useColors> }) {
  if (reports.length < 2) return null;

  const newest = reports[0];
  const previous = reports[1];
  const first = reports[reports.length - 1];

  const total = calculateComparison(first, newest);
  const recent = calculateComparison(previous, newest);

  function renderRow(comparison: ReturnType<typeof calculateComparison>, title: string, from: string, to: string, testIdPrefix: string) {
    if (comparison.length === 0) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{title}</Text>
          <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
            {formatDate(from)} → {formatDate(to)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {comparison.map((metric) => (
            <View
              key={`${testIdPrefix}-${metric.field}`}
              style={[styles.comparisonCard, { backgroundColor: colors.accent }]}
              testID={`${testIdPrefix}-${metric.field}`}
            >
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginBottom: 2 }}>{metric.label}</Text>
              <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: metric.color || colors.foreground }}>
                {metric.text}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.comparisonCardOuter, { backgroundColor: colors.card, borderColor: colors.primary + "33" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground }}>Porównanie progresu</Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 14 }}>
        Przegląd zmian między raportami ({reports.length} raportów)
      </Text>
      {renderRow(total, "Całkowity progres (pierwszy → najnowszy)", first.reportDate, newest.reportDate, "total-progress")}
      {previous.id !== first.id && renderRow(recent, "Ostatni progres (poprzedni → najnowszy)", previous.reportDate, newest.reportDate, "recent-progress")}

      {first.photoUrl && newest.photoUrl && first.id !== newest.id && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 8 }}>
            Zdjęcia: przed / po
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Image source={{ uri: first.photoUrl }} style={styles.comparisonPhoto} testID="image-progress-before" />
              <Text style={{ fontSize: 11, color: colors.mutedForeground, textAlign: "center", marginTop: 4 }}>
                {formatDate(first.reportDate)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Image source={{ uri: newest.photoUrl }} style={styles.comparisonPhoto} testID="image-progress-after" />
              <Text style={{ fontSize: 11, color: colors.mutedForeground, textAlign: "center", marginTop: 4 }}>
                {formatDate(newest.reportDate)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

interface WeeklyReport {
  id: string;
  reportDate: string;
  weight?: string | null;
  saturation?: string | null;
  chest?: string | null;
  waist?: string | null;
  hips?: string | null;
  arm?: string | null;
  leg?: string | null;
  cardio?: string | null;
  supplements?: string | null;
  mood?: string | null;
  thoughts?: string | null;
  photoUrl?: string | null;
  viewedByTrainer?: boolean | null;
  createdAt: string;
}

interface ClientPlan {
  id: string;
  name: string;
  description?: string | null;
}

interface ClientDietPlan {
  id: string;
  name: string;
  description?: string | null;
}

interface ClientFromList {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
  phone?: string | null;
  goal?: string | null;
  assignment?: { plan?: ClientPlan | null } | null;
}

interface TrainingPlan {
  id: string;
  name: string;
  description?: string | null;
}


interface ClientProgressData {
  id: string;
  weight?: string | null;
  height?: string | null;
  goal?: string | null;
  mood?: string | null;
  completedWorkouts?: number | null;
  notes?: string | null;
  lastUpdated?: string | null;
}

interface SessionBooking {
  id: string;
  clientId: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string | null;
  status: string;
}

interface ExerciseLogEntry {
  id: string;
  exerciseId: string;
  reps: number;
  load?: string | null;
  loggedAt: string;
}

interface WorkoutSession {
  id: string;
  workoutId: string;
  planId: string;
  workoutName: string | null;
  exercisesCompleted: number;
  totalExercises: number;
  durationSeconds: number;
  completedAt: string;
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("pl-PL"); } catch { return d; }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}min ${s}s` : `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

function formatDateTime(d: string) {
  try {
    const date = new Date(d);
    return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" }) +
      ", " + date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  } catch { return d; }
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [remindModalVisible, setRemindModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [notesText, setNotesText] = useState("");
  const [activeTab, setActiveTab] = useState<"plans" | "diet" | "progress" | "reports">("plans");
  const [createPlanModalVisible, setCreatePlanModalVisible] = useState(false);
  const [createDietModalVisible, setCreateDietModalVisible] = useState(false);
  const [dietToDelete, setDietToDelete] = useState<ClientDietPlan | null>(null);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");
  const [newDietName, setNewDietName] = useState("");
  const [newDietDesc, setNewDietDesc] = useState("");

  const { data: progress, isLoading: loadingProgress, refetch, isRefetching } = useQuery<ClientProgressData>({
    queryKey: ["client-progress", id],
    queryFn: () => apiGet<ClientProgressData>(`/api/trainer/clients/${id}/progress`),
    enabled: !!id,
  });

  const { data: clientsList } = useQuery<ClientFromList[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<ClientFromList[]>("/api/trainer/clients"),
    enabled: !!id,
  });
  const clientData = clientsList?.find((c) => c.id === id);
  const assignment = clientData?.assignment ?? null;

  const { data: plans } = useQuery<TrainingPlan[]>({
    queryKey: ["training-plans"],
    queryFn: () => apiGet<TrainingPlan[]>("/api/plans"),
    enabled: assignModalVisible,
  });

  const { data: dietPlans, isLoading: loadingDietPlans } = useQuery<ClientDietPlan[]>({
    queryKey: ["trainer-diet-plans", id],
    queryFn: () => apiGet<ClientDietPlan[]>(`/api/diets/plans?clientId=${id}`),
    enabled: !!id && (activeTab === "diet" || createDietModalVisible),
  });

  const assignedPlanId = clientData?.assignment?.plan?.id ?? null;

  interface PlanDetail {
    id: string;
    name: string;
    description?: string | null;
    workouts: Array<{ id: string; name: string; description?: string | null; orderIndex: number; exercises: Array<{ id: string; name: string }> }>;
  }

  const { data: planDetail, isLoading: loadingPlanDetail } = useQuery<PlanDetail>({
    queryKey: ["plan-detail", assignedPlanId],
    queryFn: () => apiGet<PlanDetail>(`/api/plans/${assignedPlanId}`),
    enabled: !!assignedPlanId && activeTab === "plans",
  });

  const { data: allTrainerSessions } = useQuery<SessionBooking[]>({
    queryKey: ["trainer-sessions"],
    queryFn: () => apiGet<SessionBooking[]>("/api/trainer/sessions"),
    enabled: !!id,
  });
  const clientSessions = (allTrainerSessions ?? [])
    .filter((s) => s.clientId === id)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("18:00");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [sessionLocation, setSessionLocation] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const createSessionMutation = useMutation({
    mutationFn: () => {
      const scheduledAt = new Date(`${sessionDate}T${sessionTime}:00`);
      return apiPost("/api/sessions", {
        clientId: id,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: parseInt(sessionDuration, 10) || 60,
        location: sessionLocation.trim() || null,
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["trainer-sessions"] });
      setSessionModalVisible(false);
      setSessionDate("");
      setSessionTime("18:00");
      setSessionDuration("60");
      setSessionLocation("");
    },
    onError: () => Alert.alert("Błąd", "Nie udało się zaplanować sesji. Sprawdź poprawność daty i godziny."),
  });

  const cancelSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiDelete(`/api/sessions/${sessionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainer-sessions"] });
    },
    onError: () => Alert.alert("Błąd", "Nie udało się anulować sesji."),
  });

  const { data: trainerNotesData } = useQuery<{ notes: string | null }>({
    queryKey: ["trainer-notes", id],
    queryFn: () => apiGet<{ notes: string | null }>(`/api/trainer/clients/${id}/notes`),
    enabled: !!id,
  });

  const { data: clientReports, isLoading: loadingReports } = useQuery<WeeklyReport[]>({
    queryKey: ["client-weekly-reports", id],
    queryFn: () => apiGet<WeeklyReport[]>(`/api/clients/${id}/reports`),
    enabled: !!id,
  });

  const { data: workoutSessions, isLoading: loadingWorkoutSessions } = useQuery<WorkoutSession[]>({
    queryKey: ["client-workout-sessions", id],
    queryFn: () => apiGet<WorkoutSession[]>(`/api/trainer/clients/${id}/workout-sessions`),
    enabled: !!id && activeTab === "progress",
  });

  const { data: exerciseLogs } = useQuery<ExerciseLogEntry[]>({
    queryKey: ["client-exercise-logs", id],
    queryFn: () => apiGet<ExerciseLogEntry[]>(`/api/trainer/clients/${id}/exercise-logs`),
    enabled: !!id && activeTab === "progress",
  });

  const { data: exercisesLibrary } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["exercises-library"],
    queryFn: () => apiGet<{ id: string; name: string }[]>("/api/exercises/library"),
    enabled: activeTab === "progress",
  });

  const personalRecords = (() => {
    if (!exerciseLogs || !exercisesLibrary) return [];
    const nameById = new Map(exercisesLibrary.map((e) => [e.id, e.name]));
    const bestByExercise = new Map<string, { load: number; reps: number; loggedAt: string }>();
    for (const log of exerciseLogs) {
      const loadNum = parseNumericValue(log.load);
      if (loadNum === null) continue;
      const existing = bestByExercise.get(log.exerciseId);
      if (!existing || loadNum > existing.load) {
        bestByExercise.set(log.exerciseId, { load: loadNum, reps: log.reps, loggedAt: log.loggedAt });
      }
    }
    return Array.from(bestByExercise.entries())
      .map(([exerciseId, best]) => ({ exerciseId, name: nameById.get(exerciseId) ?? "Ćwiczenie", ...best }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  const markViewedMutation = useMutation({
    mutationFn: (reportId: string) => apiPost(`/api/reports/${reportId}/mark-as-viewed`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-weekly-reports", id] });
      qc.invalidateQueries({ queryKey: ["trainer-unread-reports"] });
    },
    onError: () => {
      console.error("Failed to mark report as viewed");
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) =>
      apiPatch(`/api/trainer/clients/${id}/notes`, { notes }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["trainer-notes", id] });
      setNotesModalVisible(false);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się zapisać notatek.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ planId }: { planId: string }) =>
      apiPost("/api/assignments/bulk", { planId, clientIds: [id] }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["trainer-clients"] });
      qc.invalidateQueries({ queryKey: ["plan-detail"] });
      setAssignModalVisible(false);
    },
  });

  const createAndAssignMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const plan = await apiPost<{ id: string; name: string }>("/api/plans", { name, description });
      await apiPost("/api/assignments/bulk", { planId: plan.id, clientIds: [id] });
      return plan;
    },
    onSuccess: (plan) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["trainer-clients"] });
      qc.invalidateQueries({ queryKey: ["training-plans"] });
      setCreatePlanModalVisible(false);
      setNewPlanName("");
      setNewPlanDesc("");
      router.push(`/plan/${plan.id}`);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się utworzyć planu. Spróbuj ponownie."),
  });

  const deleteDietMutation = useMutation({
    mutationFn: (dietId: string) => apiDelete(`/api/diets/plans/${dietId}`),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["trainer-diet-plans", id] });
      qc.invalidateQueries({ queryKey: ["trainer-diet-plans"] });
      setDietToDelete(null);
    },
    onError: () => {
      setDietToDelete(null);
      Alert.alert("Błąd", "Nie udało się usunąć planu diety. Spróbuj ponownie.");
    },
  });

  const createDietMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) =>
      apiPost<{ id: string }>("/api/diets/plans", {
        name,
        description,
        clientId: id,
        targetCalories: 2000,
        targetProtein: 150,
        targetFat: 56,
        targetCarbs: 225,
        mealsPerDay: 3,
        mode: "full_plan",
        status: "draft",
      }),
    onSuccess: (diet) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["trainer-diet-plans", id] });
      setCreateDietModalVisible(false);
      setNewDietName("");
      setNewDietDesc("");
      router.push(`/diet/${diet.id}`);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się utworzyć planu diety. Spróbuj ponownie."),
  });

  const remindMutation = useMutation({
    mutationFn: (msg: string) =>
      apiPost(`/api/trainer/clients/${id}/remind`, msg.trim() ? { message: msg.trim() } : {}),
    onSuccess: (result: unknown) => {
      const sent = (result as { sent?: number })?.sent ?? 0;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRemindModalVisible(false);
      setCustomMessage("");
      Alert.alert(
        "Przypomnienie wysłane",
        sent > 0
          ? "Podopieczny otrzymał powiadomienie push o treningu."
          : "Podopieczny nie ma skonfigurowanych powiadomień push.",
      );
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się wysłać przypomnienia.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => apiPost(`/api/clients/${id}/archive`, {}),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["trainer-clients"] });
      Alert.alert("Współpraca zakończona", "Relacja z podopiecznym została zarchiwizowana.");
      router.back();
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się zakończyć współpracy.");
    },
  });

  function confirmArchiveClient() {
    Alert.alert(
      "Czy na pewno chcesz zakończyć współpracę?",
      `Ta akcja zarchiwizuje relację z ${clientData?.firstName ?? ""} ${clientData?.lastName ?? ""}. Będziesz mógł nadal przeglądać historię współpracy, ale nie będziesz mógł dodawać nowych planów treningowych ani dietetycznych.`,
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Zakończ współpracę", style: "destructive", onPress: () => archiveMutation.mutate() },
      ]
    );
  }

  const latestProgress = progress ?? null;

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 30 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]} testID="button-back">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Podopieczni</Text>
        </Pressable>

        {clientData && (
          <View style={styles.clientHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.clientName, { color: colors.foreground }]}>
                {clientData.firstName} {clientData.lastName}
              </Text>
              {(clientData.phone || clientData.goal) && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                  {clientData.phone && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="call-outline" size={13} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{clientData.phone}</Text>
                    </View>
                  )}
                  {clientData.goal && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="trophy-outline" size={13} color={colors.mutedForeground} />
                      <Text style={{ fontSize: 13, color: colors.mutedForeground }} numberOfLines={1}>{clientData.goal}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <Pressable
              onPress={() => { if (!remindMutation.isPending) setRemindModalVisible(true); }}
              disabled={remindMutation.isPending}
              style={({ pressed }) => [
                styles.remindBtn,
                { borderColor: colors.border, opacity: (remindMutation.isPending || pressed) ? 0.6 : 1 }
              ]}
              testID="button-send-reminder"
            >
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              <Text style={[styles.remindBtnText, { color: colors.primary }]}>Przypomnij</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.sessionsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: clientSessions.length > 0 ? 10 : 0 }}>
            <Text style={[styles.sessionsSectionTitle, { color: colors.foreground }]}>Nadchodzące sesje</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => router.push(`/wspolny-trening?clientId=${id}`)}
                style={({ pressed }) => [styles.scheduleBtn, { backgroundColor: colors.primary + "1a", opacity: pressed ? 0.8 : 1 }]}
                testID="button-shared-workout"
              >
                <Ionicons name="barbell-outline" size={14} color={colors.primary} />
                <Text style={[styles.scheduleBtnText, { color: colors.primary }]}>Trenuj razem</Text>
              </Pressable>
              <Pressable
                onPress={() => setSessionModalVisible(true)}
                style={({ pressed }) => [styles.scheduleBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                testID="button-schedule-session"
              >
                <Ionicons name="calendar-outline" size={14} color="#fff" />
                <Text style={styles.scheduleBtnText}>Zaplanuj</Text>
              </Pressable>
            </View>
          </View>
          {clientSessions.map((session) => (
            <View key={session.id} style={[styles.sessionRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                  {formatDateTime(session.scheduledAt)}
                </Text>
                <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                  {session.durationMinutes} min{session.location ? ` • ${session.location}` : ""}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert("Anuluj sesję", "Czy na pewno chcesz anulować tę sesję?", [
                    { text: "Nie", style: "cancel" },
                    { text: "Tak, anuluj", style: "destructive", onPress: () => cancelSessionMutation.mutate(session.id) },
                  ])
                }
                testID={`button-cancel-session-${session.id}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={[styles.tabBar, { borderColor: colors.border }]}>
          {(
            [
              { key: "diet", label: "Dieta" },
              { key: "plans", label: "Treningi" },
              { key: "progress", label: "Postepy" },
              { key: "reports", label: "Raporty" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            const badgeCount =
              tab.key === "reports"
                ? (clientReports ?? []).filter((r) => !r.viewedByTrainer).length
                : 0;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={({ pressed }) => [
                  styles.tabItem,
                  isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                testID={`button-tab-${tab.key}`}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.primary : colors.mutedForeground },
                    isActive && { fontFamily: "Inter_700Bold" },
                  ]}
                >
                  {tab.label}
                </Text>
                {badgeCount > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.tabBadgeText}>{badgeCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {activeTab === "plans" && (
          <>
            {/* No plan assigned */}
            {!assignment?.plan ? (
              <View style={styles.noPlanBox}>
                <View style={[styles.noPlanIcon, { backgroundColor: colors.primary + "12" }]}>
                  <Ionicons name="barbell-outline" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.noPlanTitle, { color: colors.foreground }]}>Brak planu treningowego</Text>
                <Text style={[styles.noPlanDesc, { color: colors.mutedForeground }]}>
                  Utwórz plan treningowy dla tego podopiecznego lub przypisz istniejący.
                </Text>
                <Pressable
                  onPress={() => setCreatePlanModalVisible(true)}
                  style={({ pressed }) => [styles.createPlanBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  testID="button-create-plan"
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.createPlanBtnText}>Utwórz plan treningowy</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAssignModalVisible(true)}
                  style={({ pressed }) => [styles.assignExistingBtn, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
                  testID="button-assign-existing-plan"
                >
                  <Ionicons name="swap-horizontal-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.assignExistingBtnText, { color: colors.foreground }]}>Przypisz istniejący plan</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* Plan header card */}
                <Pressable
                  onPress={() => router.push(`/plan/${assignment.plan!.id}`)}
                  style={({ pressed }) => [styles.planBigCard, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
                  testID="button-open-plan"
                >
                  <View style={styles.planBigCardLeft}>
                    <View style={styles.planBigCardIcon}>
                      <Ionicons name="barbell-outline" size={22} color="rgba(255,255,255,0.85)" />
                    </View>
                    <View style={styles.planBigCardInfo}>
                      <Text style={styles.planBigCardName} numberOfLines={1}>{assignment.plan!.name}</Text>
                      {assignment.plan!.description && (
                        <Text style={styles.planBigCardDesc} numberOfLines={1}>{assignment.plan!.description}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.planBigCardRight}>
                    <Text style={styles.planBigCardEditLabel}>Edytuj plan</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                  </View>
                </Pressable>

                {/* Workouts list */}
                <View style={styles.workoutsHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Treningi</Text>
                  <Pressable
                    onPress={() => router.push(`/plan/${assignment.plan!.id}`)}
                    style={({ pressed }) => [styles.addWorkoutBtn, { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                    testID="button-add-workout"
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                    <Text style={[styles.addWorkoutBtnText, { color: colors.primary }]}>Dodaj trening</Text>
                  </Pressable>
                </View>

                {loadingPlanDetail ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
                ) : (planDetail?.workouts ?? []).length === 0 ? (
                  <Pressable
                    onPress={() => router.push(`/plan/${assignment.plan!.id}`)}
                    style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak treningów. Dodaj pierwszy trening.</Text>
                  </Pressable>
                ) : (
                  [...(planDetail?.workouts ?? [])].sort((a, b) => a.orderIndex - b.orderIndex).map((workout, idx) => (
                    <Pressable
                      key={workout.id}
                      onPress={() => router.push(`/plan/${assignment.plan!.id}`)}
                      style={({ pressed }) => [
                        styles.workoutRow,
                        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                      ]}
                      testID={`button-workout-${workout.id}`}
                    >
                      <View style={[styles.workoutNumBadge, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.workoutNumText, { color: colors.primary }]}>{idx + 1}</Text>
                      </View>
                      <View style={styles.workoutRowInfo}>
                        <Text style={[styles.workoutRowName, { color: colors.foreground }]}>{workout.name}</Text>
                        <Text style={[styles.workoutRowSub, { color: colors.mutedForeground }]}>
                          {workout.exercises.length} {workout.exercises.length === 1 ? "ćwiczenie" : workout.exercises.length < 5 ? "ćwiczenia" : "ćwiczeń"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  ))
                )}

                {/* Change plan */}
                <Pressable
                  onPress={() => setAssignModalVisible(true)}
                  style={({ pressed }) => [styles.changePlanLink, { opacity: pressed ? 0.7 : 1 }]}
                  testID="button-change-plan"
                >
                  <Ionicons name="swap-horizontal-outline" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.changePlanLinkText, { color: colors.mutedForeground }]}>Zmień aktywny plan</Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {activeTab === "diet" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dieta</Text>
            {loadingDietPlans ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (dietPlans ?? []).length === 0 ? (
              <View style={styles.noPlanBox}>
                <View style={[styles.noPlanIcon, { backgroundColor: colors.primary + "12" }]}>
                  <Ionicons name="nutrition-outline" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.noPlanTitle, { color: colors.foreground }]}>Brak planu diety</Text>
                <Text style={[styles.noPlanDesc, { color: colors.mutedForeground }]}>
                  Utwórz plan diety dla tego podopiecznego lub przypisz istniejący.
                </Text>
                <Pressable
                  onPress={() => setCreateDietModalVisible(true)}
                  style={({ pressed }) => [styles.createPlanBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  testID="button-create-diet"
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.createPlanBtnText}>Utwórz plan diety</Text>
                </Pressable>
              </View>
            ) : (
              (dietPlans ?? []).map((diet) => (
                <Pressable
                  key={diet.id}
                  onPress={() => router.push(`/diet/${diet.id}`)}
                  style={({ pressed }) => [
                    styles.workoutRow,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                  testID={`button-diet-${diet.id}`}
                >
                  <View style={[styles.workoutNumBadge, { backgroundColor: colors.primary + "15" }]}>
                    <Ionicons name="nutrition-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={styles.workoutRowInfo}>
                    <Text style={[styles.workoutRowName, { color: colors.foreground }]}>{diet.name}</Text>
                    <Text style={[styles.workoutRowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {diet.description ?? "Otwórz plan diety"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setDietToDelete(diet);
                    }}
                    style={[styles.dietDeleteBtn, { backgroundColor: "#ef44441a" }]}
                    testID={`button-delete-diet-${diet.id}`}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </Pressable>
              ))
            )}
          </>
        )}

        {activeTab === "progress" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Aktualne dane</Text>
            {loadingProgress ? (
              <ActivityIndicator color={colors.primary} />
            ) : latestProgress ? (
              <>
                {latestProgress.lastUpdated && (
                  <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                    Zaktualizowano: {formatDate(latestProgress.lastUpdated)}
                  </Text>
                )}
                <View style={styles.statsRow}>
                  {latestProgress.weight != null && (
                    <StatsCard label="Waga" value={latestProgress.weight} iconName="scale-outline" color={colors.primary} />
                  )}
                  {latestProgress.height != null && (
                    <StatsCard label="Wzrost" value={latestProgress.height} iconName="body-outline" color="#d97706" />
                  )}
                  {latestProgress.completedWorkouts != null && (
                    <StatsCard label="Treningi" value={latestProgress.completedWorkouts} iconName="barbell-outline" color="#16a34a" />
                  )}
                </View>
                {latestProgress.goal != null && (
                  <View style={[styles.progressRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="trophy-outline" size={14} color={colors.primary} />
                    <Text style={[styles.progressDate, { color: colors.mutedForeground }]}>Cel:</Text>
                    <Text style={[styles.progressValue, { color: colors.foreground, flex: 1 }]}>{latestProgress.goal}</Text>
                  </View>
                )}
                {latestProgress.mood != null && (
                  <View style={[styles.progressRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="happy-outline" size={14} color={colors.primary} />
                    <Text style={[styles.progressDate, { color: colors.mutedForeground }]}>Samopoczucie:</Text>
                    <Text style={[styles.progressValue, { color: colors.foreground, flex: 1 }]}>{latestProgress.mood}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak danych postępów</Text>
              </View>
            )}

            {personalRecords.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rekordy życiowe</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {personalRecords.map((pr) => (
                    <View
                      key={pr.exerciseId}
                      style={[styles.prCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      testID={`card-pr-${pr.exerciseId}`}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Ionicons name="trophy" size={14} color="#f59e0b" />
                        <Text style={[styles.prName, { color: colors.foreground }]} numberOfLines={1}>{pr.name}</Text>
                      </View>
                      <Text style={[styles.prValue, { color: colors.foreground }]}>
                        {pr.load}kg × {pr.reps}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 2 }}>
                        {formatDate(pr.loggedAt)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historia treningów</Text>
            {loadingWorkoutSessions ? (
              <ActivityIndicator color={colors.primary} />
            ) : (workoutSessions ?? []).length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak odbytych treningów</Text>
              </View>
            ) : (
              (workoutSessions ?? []).slice(0, 20).map((session) => (
                <View key={session.id} style={[styles.progressRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "column", alignItems: "flex-start", gap: 6 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, width: "100%" }}>
                    <Ionicons name="barbell-outline" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1 }}>
                      {session.workoutName ?? "Trening"}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                      {formatDateTime(session.completedAt)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 16, paddingLeft: 24 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="checkmark-circle-outline" size={13} color="#16a34a" />
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                        {session.exercisesCompleted}/{session.totalExercises} ćwiczeń
                      </Text>
                    </View>
                    {session.durationSeconds > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="time-outline" size={13} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                          {formatDuration(session.durationSeconds)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>Notatki prywatne</Text>
              <Pressable
                onPress={() => {
                  setNotesText(trainerNotesData?.notes ?? "");
                  setNotesModalVisible(true);
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                testID="button-edit-notes"
              >
                <Text style={{ fontSize: 14, color: colors.primary }}>
                  {trainerNotesData?.notes ? "Edytuj" : "Dodaj"}
                </Text>
              </Pressable>
            </View>
            {trainerNotesData?.notes ? (
              <View style={[styles.progressRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 14, color: colors.foreground, flexShrink: 1 }} testID="text-trainer-notes">
                  {trainerNotesData.notes}
                </Text>
              </View>
            ) : (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak notatek</Text>
              </View>
            )}
          </>
        )}

        {activeTab === "reports" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Raporty tygodniowe</Text>
            {!loadingReports && (clientReports ?? []).length > 0 && calculateReportStreak((clientReports ?? []).map((r) => r.reportDate)) >= 2 && (
              <View style={[styles.streakBadge, { backgroundColor: "#f9731618", borderColor: "#f9731640" }]} testID="badge-report-streak">
                <Ionicons name="flame" size={18} color="#f97316" />
                <Text style={[styles.streakText, { color: "#f97316" }]}>
                  {calculateReportStreak((clientReports ?? []).map((r) => r.reportDate))} tygodni z rzędu z raportem
                </Text>
              </View>
            )}
            {!loadingReports && (clientReports ?? []).length >= 2 && (
              <ProgressComparisonSection
                reports={[...(clientReports ?? [])].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())}
                colors={colors}
              />
            )}
            {loadingReports ? (
              <ActivityIndicator color={colors.primary} />
            ) : (clientReports ?? []).length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak raportów tygodniowych</Text>
              </View>
            ) : (
              [...(clientReports ?? [])].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()).map((report) => (
                <TrainerReportCard
                  key={report.id}
                  report={report}
                  colors={colors}
                  onMarkViewed={() => markViewedMutation.mutate(report.id)}
                />
              ))
            )}
          </>
        )}

        {clientData && (
          <>
            <View style={[styles.dangerDivider, { backgroundColor: colors.border }]} />
            <Pressable
              onPress={confirmArchiveClient}
              disabled={archiveMutation.isPending}
              style={({ pressed }) => [
                styles.archiveBtn,
                { borderColor: colors.destructive + "44", backgroundColor: colors.destructive + "0f", opacity: (pressed || archiveMutation.isPending) ? 0.7 : 1 },
              ]}
              testID="button-archive-client"
            >
              {archiveMutation.isPending ? (
                <ActivityIndicator color={colors.destructive} size="small" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color={colors.destructive} />
                  <Text style={[styles.archiveBtnText, { color: colors.destructive }]}>Zakończ współpracę</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal
        visible={sessionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!createSessionMutation.isPending) setSessionModalVisible(false); }}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Zaplanuj sesję</Text>
              <Pressable
                onPress={() => { if (!createSessionMutation.isPending) setSessionModalVisible(false); }}
                testID="button-close-session-modal"
              >
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.fieldLabelSmall, { color: colors.mutedForeground }]}>Data</Text>
            <Pressable
              onPress={() => setShowDatePicker((v) => !v)}
              style={[
                styles.remindInput,
                { backgroundColor: colors.background, borderColor: colors.border, minHeight: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
              ]}
              testID="input-session-date"
            >
              <Text style={{ color: sessionDate ? colors.foreground : colors.mutedForeground, fontSize: 15, fontFamily: "Inter_400Regular" }}>
                {sessionDate ? formatDateLocal(parseDateLocal(sessionDate, sessionTime)) : "Wybierz datę..."}
              </Text>
              <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={sessionDate ? parseDateLocal(sessionDate, sessionTime) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(_event, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setSessionDate(formatDateLocal(date));
                }}
              />
            )}

            <Text style={[styles.fieldLabelSmall, { color: colors.mutedForeground }]}>Godzina</Text>
            <Pressable
              onPress={() => setShowTimePicker((v) => !v)}
              style={[
                styles.remindInput,
                { backgroundColor: colors.background, borderColor: colors.border, minHeight: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
              ]}
              testID="input-session-time"
            >
              <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_400Regular" }}>
                {sessionTime}
              </Text>
              <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={parseDateLocal(sessionDate || formatDateLocal(new Date()), sessionTime)}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_event, date) => {
                  setShowTimePicker(Platform.OS === "ios");
                  if (date) setSessionTime(formatTimeLocal(date));
                }}
              />
            )}

            <Text style={[styles.fieldLabelSmall, { color: colors.mutedForeground }]}>Czas trwania (min)</Text>
            <TextInput
              style={[styles.remindInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 0 }]}
              value={sessionDuration}
              onChangeText={setSessionDuration}
              placeholder="60"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              maxLength={3}
              testID="input-session-duration"
            />

            <Text style={[styles.fieldLabelSmall, { color: colors.mutedForeground }]}>Miejsce (opcjonalnie)</Text>
            <TextInput
              style={[styles.remindInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 0 }]}
              value={sessionLocation}
              onChangeText={setSessionLocation}
              placeholder="np. Siłownia Fit Club"
              placeholderTextColor={colors.mutedForeground}
              testID="input-session-location"
            />

            <Pressable
              onPress={() => {
                if (!sessionDate || !sessionTime) {
                  Alert.alert("Brak danych", "Podaj datę i godzinę sesji.");
                  return;
                }
                createSessionMutation.mutate();
              }}
              disabled={createSessionMutation.isPending}
              style={({ pressed }) => [
                styles.remindSendBtn,
                { backgroundColor: colors.primary, opacity: (createSessionMutation.isPending || pressed) ? 0.75 : 1 },
              ]}
              testID="button-confirm-schedule-session"
            >
              {createSessionMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="calendar-outline" size={16} color="#fff" />
              )}
              <Text style={styles.remindSendBtnText}>
                {createSessionMutation.isPending ? "Zapisywanie…" : "Zaplanuj sesję"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={remindModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!remindMutation.isPending) { setRemindModalVisible(false); setCustomMessage(""); } }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Wyślij przypomnienie</Text>
              <Pressable
                onPress={() => { if (!remindMutation.isPending) { setRemindModalVisible(false); setCustomMessage(""); } }}
                testID="button-close-remind-modal"
              >
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.remindModalHint, { color: colors.mutedForeground }]}>
              Opcjonalnie wpisz treść wiadomości. Jeśli pole będzie puste, zostanie użyta wiadomość domyślna z nazwą planu.
            </Text>

            <TextInput
              style={[
                styles.remindInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="np. Pamiętaj o treningu na nogi dziś o 18:00!"
              placeholderTextColor={colors.mutedForeground}
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={3}
              maxLength={200}
              testID="input-reminder-message"
            />

            <Pressable
              onPress={() => { if (!remindMutation.isPending) remindMutation.mutate(customMessage); }}
              disabled={remindMutation.isPending}
              style={({ pressed }) => [
                styles.remindSendBtn,
                { backgroundColor: colors.primary, opacity: (remindMutation.isPending || pressed) ? 0.75 : 1 },
              ]}
              testID="button-confirm-send-reminder"
            >
              {remindMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send-outline" size={16} color="#fff" />
              )}
              <Text style={styles.remindSendBtnText}>
                {remindMutation.isPending ? "Wysyłanie…" : "Wyślij przypomnienie"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={notesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!updateNotesMutation.isPending) setNotesModalVisible(false); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Notatki prywatne</Text>
              <Pressable
                onPress={() => { if (!updateNotesMutation.isPending) setNotesModalVisible(false); }}
                testID="button-close-notes-modal"
              >
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.remindModalHint, { color: colors.mutedForeground }]}>
              Widoczne tylko dla Ciebie. Możesz zapisać kontuzje, preferencje, obserwacje itp.
            </Text>
            <TextInput
              style={[
                styles.remindInput,
                { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 100 },
              ]}
              placeholder="Twoje notatki o kliencie..."
              placeholderTextColor={colors.mutedForeground}
              value={notesText}
              onChangeText={setNotesText}
              multiline
              numberOfLines={5}
              maxLength={2000}
              testID="input-trainer-notes"
            />
            <Pressable
              onPress={() => { if (!updateNotesMutation.isPending) updateNotesMutation.mutate(notesText); }}
              disabled={updateNotesMutation.isPending}
              style={({ pressed }) => [
                styles.remindSendBtn,
                { backgroundColor: colors.primary, opacity: (updateNotesMutation.isPending || pressed) ? 0.75 : 1 },
              ]}
              testID="button-save-notes"
            >
              {updateNotesMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="save-outline" size={16} color="#fff" />
              )}
              <Text style={styles.remindSendBtnText}>
                {updateNotesMutation.isPending ? "Zapisywanie…" : "Zapisz notatki"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete diet confirmation modal */}
      <Modal visible={!!dietToDelete} transparent animationType="fade" onRequestClose={() => setDietToDelete(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDietToDelete(null)}>
          <Pressable style={[styles.confirmSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#ef44441a" }]}>
              <Ionicons name="trash-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Usuń plan diety</Text>
            <Text style={[styles.confirmDesc, { color: colors.mutedForeground }]}>
              Czy na pewno chcesz usunąć plan{"\n"}
              <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
                {dietToDelete?.name}
              </Text>
              ?{"\n"}Tej operacji nie można cofnąć.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setDietToDelete(null)}
                style={[styles.confirmCancelBtn, { borderColor: colors.border }]}
                testID="button-cancel-delete-diet"
              >
                <Text style={[styles.confirmCancelText, { color: colors.mutedForeground }]}>Anuluj</Text>
              </Pressable>
              <Pressable
                onPress={() => dietToDelete && deleteDietMutation.mutate(dietToDelete.id)}
                disabled={deleteDietMutation.isPending}
                style={[styles.confirmDeleteBtn, { opacity: deleteDietMutation.isPending ? 0.7 : 1 }]}
                testID="button-confirm-delete-diet"
              >
                {deleteDietMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Usuń</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create plan modal */}
      <Modal
        visible={createDietModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!createDietMutation.isPending) setCreateDietModalVisible(false); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nowy plan diety</Text>
              <Pressable onPress={() => { if (!createDietMutation.isPending) setCreateDietModalVisible(false); }} testID="button-close-create-diet-modal">
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.remindModalHint, { color: colors.mutedForeground }]}>
              Plan diety zostanie utworzony dla tego podopiecznego. Następnie możesz go edytować.
            </Text>
            <TextInput
              style={[styles.remindInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 48 }]}
              placeholder="Nazwa planu, np. Redukcja"
              placeholderTextColor={colors.mutedForeground}
              value={newDietName}
              onChangeText={setNewDietName}
              autoFocus
              testID="input-new-diet-name"
            />
            <TextInput
              style={[styles.remindInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Opis (opcjonalnie)"
              placeholderTextColor={colors.mutedForeground}
              value={newDietDesc}
              onChangeText={setNewDietDesc}
              multiline
              numberOfLines={2}
              testID="input-new-diet-desc"
            />
            <Pressable
              onPress={() => {
                if (newDietName.trim()) {
                  createDietMutation.mutate({ name: newDietName.trim(), description: newDietDesc.trim() || undefined });
                }
              }}
              disabled={createDietMutation.isPending || !newDietName.trim()}
              style={({ pressed }) => [
                styles.remindSendBtn,
                { backgroundColor: colors.primary, opacity: (createDietMutation.isPending || !newDietName.trim() || pressed) ? 0.7 : 1 },
              ]}
              testID="button-confirm-create-diet"
            >
              {createDietMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="nutrition-outline" size={16} color="#fff" />
              )}
              <Text style={styles.remindSendBtnText}>
                {createDietMutation.isPending ? "Tworzenie..." : "Utwórz plan diety"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={createPlanModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!createAndAssignMutation.isPending) setCreatePlanModalVisible(false); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nowy plan treningowy</Text>
              <Pressable onPress={() => { if (!createAndAssignMutation.isPending) setCreatePlanModalVisible(false); }} testID="button-close-create-plan-modal">
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.remindModalHint, { color: colors.mutedForeground }]}>
              Plan zostanie utworzony i przypisany do tego podopiecznego. Następnie możesz dodać treningi.
            </Text>
            <TextInput
              style={[styles.remindInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 48 }]}
              placeholder="Nazwa planu, np. Budowanie masy"
              placeholderTextColor={colors.mutedForeground}
              value={newPlanName}
              onChangeText={setNewPlanName}
              autoFocus
              testID="input-new-plan-name"
            />
            <TextInput
              style={[styles.remindInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Opis (opcjonalnie)"
              placeholderTextColor={colors.mutedForeground}
              value={newPlanDesc}
              onChangeText={setNewPlanDesc}
              multiline
              numberOfLines={2}
              testID="input-new-plan-desc"
            />
            <Pressable
              onPress={() => {
                if (newPlanName.trim()) {
                  createAndAssignMutation.mutate({ name: newPlanName.trim(), description: newPlanDesc.trim() || undefined });
                }
              }}
              disabled={createAndAssignMutation.isPending || !newPlanName.trim()}
              style={({ pressed }) => [
                styles.remindSendBtn,
                { backgroundColor: colors.primary, opacity: (createAndAssignMutation.isPending || !newPlanName.trim() || pressed) ? 0.7 : 1 },
              ]}
              testID="button-confirm-create-plan"
            >
              {createAndAssignMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
              )}
              <Text style={styles.remindSendBtnText}>
                {createAndAssignMutation.isPending ? "Tworzenie..." : "Utwórz i przejdź do edytora"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Wybierz plan</Text>
              <Pressable onPress={() => setAssignModalVisible(false)} testID="button-close-assign-modal">
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {!plans ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : plans.length === 0 ? (
              <View style={{ alignItems: "center", marginVertical: 24, gap: 12 }}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center" }]}>
                  Brak planów. Utwórz plan w zakładce Treningi.
                </Text>
                <Pressable
                  onPress={() => { setAssignModalVisible(false); setCreatePlanModalVisible(true); }}
                  style={({ pressed }) => [styles.remindSendBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, paddingHorizontal: 20 }]}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.remindSendBtnText}>Utwórz nowy plan</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.planList} showsVerticalScrollIndicator={false}>
                {plans.map((plan) => {
                  const isCurrent = plan.id === assignment?.plan?.id;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => {
                        if (assignMutation.isPending || isCurrent) return;
                        Alert.alert(
                          "Zmienić plan treningowy?",
                          `Podopieczny zobaczy plan „${plan.name}” zamiast obecnego. Ta zmiana jest natychmiastowa.`,
                          [
                            { text: "Anuluj", style: "cancel" },
                            { text: "Zmień plan", onPress: () => assignMutation.mutate({ planId: plan.id }) },
                          ]
                        );
                      }}
                      style={({ pressed }) => [
                        styles.planRow,
                        {
                          backgroundColor: isCurrent ? colors.primary + "18" : colors.background,
                          borderColor: isCurrent ? colors.primary : colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                      testID={`button-plan-${plan.id}`}
                    >
                      <View style={styles.planRowLeft}>
                        <Text style={[styles.planRowName, { color: colors.foreground }]}>{plan.name}</Text>
                        {plan.description && (
                          <Text style={[styles.planRowDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {plan.description}
                          </Text>
                        )}
                      </View>
                      {isCurrent && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      {assignMutation.isPending && assignMutation.variables?.planId === plan.id && (
                        <ActivityIndicator size="small" color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {assignMutation.isError && (
              <Text style={styles.errorText}>
                {(assignMutation.error as Error)?.message ?? "Błąd przypisywania planu"}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  clientHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" },
  clientName: { fontSize: 22, fontFamily: "Inter_700Bold", flex: 1 },
  remindBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  remindBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  dangerDivider: { height: 1, marginTop: 28, marginBottom: 16 },
  comparisonCardOuter: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  comparisonCard: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minWidth: "30%", flexGrow: 1 },
  comparisonPhoto: { width: "100%", aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: "#0002" },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  streakText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  prCard: { borderRadius: 12, borderWidth: 1, padding: 12, minWidth: "31%", flexGrow: 1 },
  prName: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  prValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sessionsSection: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  sessionsSectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  scheduleBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  scheduleBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sessionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  fieldLabelSmall: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6, marginTop: 10 },
  archiveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 13 },
  archiveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  planCard: { borderRadius: 16, padding: 18, marginBottom: 20, gap: 8 },
  planName: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  planDesc: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular" },
  dateLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 10, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  emptyBox: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", marginBottom: 16 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  progressDate: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  progressValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  planList: { maxHeight: 400 },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  planRowLeft: { flex: 1, gap: 4 },
  planRowName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planRowDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 13, color: "#e53935", fontFamily: "Inter_400Regular", marginTop: 8 },
  remindModalHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 18 },
  remindInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  remindSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  remindSendBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  unreadBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  unreadBadgeText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  tabBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  // Treningi tab — no plan
  noPlanBox: { alignItems: "center", gap: 12, paddingVertical: 36, paddingHorizontal: 8 },
  noPlanIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  noPlanTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  noPlanDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, marginBottom: 4 },
  createPlanBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, width: "100%" },
  createPlanBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  assignExistingBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, width: "100%" },
  assignExistingBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  // Treningi tab — plan assigned
  planBigCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16, padding: 16, marginBottom: 20, gap: 12 },
  planBigCardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  planBigCardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  planBigCardInfo: { flex: 1 },
  planBigCardName: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  planBigCardDesc: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "Inter_400Regular" },
  planBigCardRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  planBigCardEditLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_500Medium" },
  workoutsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  addWorkoutBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  addWorkoutBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  workoutRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  workoutNumBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  workoutNumText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  workoutRowInfo: { flex: 1 },
  workoutRowName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  workoutRowSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  changePlanLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, paddingVertical: 12 },
  changePlanLinkText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  reportCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  reportCardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  reportCardDate: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reportCardRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  reportNewDot: { width: 8, height: 8, borderRadius: 4 },
  reportCardBody: { borderTopWidth: 1, padding: 14, gap: 8 },
  reportMetricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reportMetric: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", minWidth: 70 },
  reportMetricLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  reportMetricValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  reportDetailRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  reportDetailLabel: { fontSize: 13, fontFamily: "Inter_500Medium", minWidth: 110 },
  reportDetailValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  reportPhoto: { width: "100%", height: 200, borderRadius: 10 },
  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  lightboxImage: { width: "100%", height: "100%" },
  dietDeleteBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center", marginLeft: 2 },
  confirmSheet: { borderRadius: 20, margin: 24, padding: 24, alignItems: "center", gap: 12 },
  confirmIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  confirmTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  confirmDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  confirmActions: { flexDirection: "row", gap: 12, marginTop: 8, width: "100%" },
  confirmCancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  confirmCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  confirmDeleteBtn: { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: "center", backgroundColor: "#ef4444" },
  confirmDeleteText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

function TrainerReportCard({
  report,
  colors,
  onMarkViewed,
}: {
  report: WeeklyReport;
  colors: ReturnType<typeof useColors>;
  onMarkViewed: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);

  const measurements = [
    { label: "Klatka", value: report.chest },
    { label: "Talia", value: report.waist },
    { label: "Biodro", value: report.hips },
    { label: "Ramię", value: report.arm },
    { label: "Udo", value: report.leg },
  ].filter((m) => m.value);

  const isNew = !report.viewedByTrainer;

  return (
    <View style={[styles.reportCard, { backgroundColor: colors.card, borderColor: isNew ? colors.primary : colors.border }]} testID={`card-weekly-report-${report.id}`}>
      <Pressable
        onPress={() => {
          const willExpand = !expanded;
          setExpanded(willExpand);
          if (willExpand && isNew) {
            onMarkViewed();
          }
        }}
        style={styles.reportCardHeader}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.reportCardDate, { color: colors.foreground }]}>
            {formatDate(report.reportDate)}
          </Text>
          {report.weight && (
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 1 }}>
              Waga: {report.weight}
            </Text>
          )}
        </View>
        <View style={styles.reportCardRight}>
          {isNew && <View style={[styles.reportNewDot, { backgroundColor: colors.primary }]} />}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.reportCardBody, { borderTopColor: colors.border }]}>
          {report.saturation && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Nasycenie:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>{report.saturation}</Text>
            </View>
          )}
          {measurements.length > 0 && (
            <View style={styles.reportMetricGrid}>
              {measurements.map((m) => (
                <View key={m.label} style={[styles.reportMetric, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.reportMetricLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                  <Text style={[styles.reportMetricValue, { color: colors.foreground }]}>{m.value} cm</Text>
                </View>
              ))}
            </View>
          )}
          {report.cardio && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Cardio:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>{report.cardio}</Text>
            </View>
          )}
          {report.supplements && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Suplementacja:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>{report.supplements}</Text>
            </View>
          )}
          {report.mood && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Samopoczucie:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>{report.mood}</Text>
            </View>
          )}
          {report.thoughts && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Przemyślenia:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>{report.thoughts}</Text>
            </View>
          )}
          {report.photoUrl ? (
            <View style={{ marginTop: 4 }}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>Zdjęcie:</Text>
              <Pressable onPress={() => setPhotoLightboxOpen(true)} testID={`button-report-photo-${report.id}`}>
                <Image
                  source={{ uri: report.photoUrl }}
                  style={styles.reportPhoto}
                  resizeMode="cover"
                  testID={`img-report-photo-${report.id}`}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      )}

      {report.photoUrl && (
        <Modal
          visible={photoLightboxOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPhotoLightboxOpen(false)}
        >
          <Pressable
            style={styles.lightboxOverlay}
            onPress={() => setPhotoLightboxOpen(false)}
            testID={`button-close-report-photo-${report.id}`}
          >
            <Image
              source={{ uri: report.photoUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
