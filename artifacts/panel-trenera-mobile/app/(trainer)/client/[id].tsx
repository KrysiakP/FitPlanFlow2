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
import { useColors } from "@/hooks/useColors";
import { StatsCard } from "@/components/StatsCard";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface MedicalTest {
  id: string;
  testName: string;
  testType?: string | null;
  testDate: string;
  orderingProvider?: string | null;
  resultValue?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
  notes?: string | null;
}

const TEST_TYPE_LABELS: Record<string, string> = {
  blood: "Badanie krwi",
  hormone: "Badanie hormonalne",
  cardio: "Badanie kardiologiczne",
  other: "Inne",
};

function getTestTypeLabel(type?: string | null): string {
  return TEST_TYPE_LABELS[type ?? ""] ?? "Inne";
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
  const [activeTab, setActiveTab] = useState<"plans" | "diet" | "progress" | "reports" | "tests">("plans");
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

  const { data: medicalTests, isLoading: loadingMedicalTests } = useQuery<MedicalTest[]>({
    queryKey: ["client-medical-tests", id],
    queryFn: () => apiGet<MedicalTest[]>(`/api/clients/${id}/medical-tests`),
    enabled: !!id,
  });

  const { data: workoutSessions, isLoading: loadingWorkoutSessions } = useQuery<WorkoutSession[]>({
    queryKey: ["client-workout-sessions", id],
    queryFn: () => apiGet<WorkoutSession[]>(`/api/trainer/clients/${id}/workout-sessions`),
    enabled: !!id && activeTab === "progress",
  });

  const markViewedMutation = useMutation({
    mutationFn: (reportId: string) => apiPost(`/api/reports/${reportId}/mark-as-viewed`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-weekly-reports", id] });
      qc.invalidateQueries({ queryKey: ["trainer-unread-reports"] });
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
      router.push(`/(trainer)/plan/${plan.id}`);
    },
    onError: () => Alert.alert("Blad", "Nie udalo sie utworzyc planu. Sprobuj ponownie."),
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
      router.push(`/(trainer)/diet/${diet.id}`);
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

  const latestProgress = progress ?? null;

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: insets.bottom + 30 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="button-back">
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

        <View style={[styles.tabBar, { borderColor: colors.border }]}>
          {(
            [
              { key: "diet", label: "Dieta" },
              { key: "plans", label: "Treningi" },
              { key: "progress", label: "Postepy" },
              { key: "reports", label: "Raporty" },
              { key: "tests", label: "Badania" },
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
                  Utworz plan treningowy dla tego podopiecznego lub przypisz istniejacy.
                </Text>
                <Pressable
                  onPress={() => setCreatePlanModalVisible(true)}
                  style={({ pressed }) => [styles.createPlanBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  testID="button-create-plan"
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.createPlanBtnText}>Utworz plan treningowy</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAssignModalVisible(true)}
                  style={({ pressed }) => [styles.assignExistingBtn, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
                  testID="button-assign-existing-plan"
                >
                  <Ionicons name="swap-horizontal-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.assignExistingBtnText, { color: colors.foreground }]}>Przypisz istniejacy plan</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* Plan header card */}
                <Pressable
                  onPress={() => router.push(`/(trainer)/plan/${assignment.plan!.id}`)}
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
                    onPress={() => router.push(`/(trainer)/plan/${assignment.plan!.id}`)}
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
                    onPress={() => router.push(`/(trainer)/plan/${assignment.plan!.id}`)}
                    style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak treningow. Dodaj pierwszy trening.</Text>
                  </Pressable>
                ) : (
                  [...(planDetail?.workouts ?? [])].sort((a, b) => a.orderIndex - b.orderIndex).map((workout, idx) => (
                    <Pressable
                      key={workout.id}
                      onPress={() => router.push(`/(trainer)/plan/${assignment.plan!.id}`)}
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
                          {workout.exercises.length} {workout.exercises.length === 1 ? "cwiczenie" : workout.exercises.length < 5 ? "cwiczenia" : "cwiczen"}
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
                  <Text style={[styles.changePlanLinkText, { color: colors.mutedForeground }]}>Zmien aktywny plan</Text>
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
                  onPress={() => router.push(`/(trainer)/diet/${diet.id}`)}
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

        {activeTab === "tests" && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Badania medyczne</Text>
            {loadingMedicalTests ? (
              <ActivityIndicator color={colors.primary} />
            ) : (medicalTests ?? []).length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak badań medycznych</Text>
              </View>
            ) : (
              [...(medicalTests ?? [])].sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()).map((test) => (
                <TrainerMedicalTestCard key={test.id} test={test} colors={colors} />
              ))
            )}
          </>
        )}
      </ScrollView>

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
              Plan zostanie utworzony i przypisany do tego podopiecznego. Nastepnie mozesz dodac treningi.
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
                {createAndAssignMutation.isPending ? "Tworzenie..." : "Utworz i przejdz do edytora"}
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
                  Brak planow. Utwórz plan w zakladce Treningi.
                </Text>
                <Pressable
                  onPress={() => { setAssignModalVisible(false); setCreatePlanModalVisible(true); }}
                  style={({ pressed }) => [styles.remindSendBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, paddingHorizontal: 20 }]}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.remindSendBtnText}>Utworz nowy plan</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.planList} showsVerticalScrollIndicator={false}>
                {plans.map((plan) => {
                  const isCurrent = plan.id === assignment?.plan?.id;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => { if (!assignMutation.isPending) assignMutation.mutate({ planId: plan.id }); }}
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

function TrainerMedicalTestCard({
  test,
  colors,
}: {
  test: MedicalTest;
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      testID={`card-medical-test-trainer-${test.id}`}
    >
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.reportCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reportCardDate, { color: colors.foreground }]}>{test.testName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {new Date(test.testDate).toLocaleDateString("pl-PL")}
            </Text>
            <View style={{ backgroundColor: colors.primary + "18", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, color: colors.primary, fontFamily: "Inter_500Medium" }}>
                {getTestTypeLabel(test.testType)}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </Pressable>

      {expanded && (
        <View style={[styles.reportCardBody, { borderTopColor: colors.border }]}>
          {test.resultValue != null && test.resultValue !== "" && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Wynik:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>
                {test.resultValue}{test.unit ? ` ${test.unit}` : ""}
              </Text>
            </View>
          )}
          {test.referenceRange != null && test.referenceRange !== "" && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Zakres ref.:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>{test.referenceRange}</Text>
            </View>
          )}
          {test.orderingProvider != null && test.orderingProvider !== "" && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Lekarz:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>{test.orderingProvider}</Text>
            </View>
          )}
          {test.notes != null && test.notes !== "" && (
            <View style={styles.reportDetailRow}>
              <Text style={[styles.reportDetailLabel, { color: colors.mutedForeground }]}>Notatki:</Text>
              <Text style={[styles.reportDetailValue, { color: colors.foreground }]}>{test.notes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

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
              <Image
                source={{ uri: report.photoUrl }}
                style={styles.reportPhoto}
                resizeMode="cover"
                testID={`img-report-photo-${report.id}`}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
