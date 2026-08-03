import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";

interface ClientPlan {
  id: string;
  name: string;
}

interface ClientFromList {
  id: string;
  firstName: string;
  lastName: string;
  assignment?: { plan?: ClientPlan | null } | null;
}

interface PlanExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  load?: string | null;
}

interface PlanWorkout {
  id: string;
  name: string;
  orderIndex: number;
  exercises: PlanExercise[];
}

interface PlanDetail {
  id: string;
  name: string;
  workouts: PlanWorkout[];
}

export default function TrainerLedWorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [loggedSets, setLoggedSets] = useState<Record<string, number>>({});
  const [editingSet, setEditingSet] = useState<{ exerciseId: string; setNumber: number } | null>(null);
  const [editReps, setEditReps] = useState("");
  const [editLoad, setEditLoad] = useState("");

  const { data: clients, isLoading: loadingClients } = useQuery<ClientFromList[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<ClientFromList[]>("/api/trainer/clients"),
  });

  const client = clients?.find((c) => c.id === clientId);
  const planId = client?.assignment?.plan?.id ?? null;

  const { data: planDetail, isLoading: loadingPlan } = useQuery<PlanDetail>({
    queryKey: ["plan-detail", planId],
    queryFn: () => apiGet<PlanDetail>(`/api/plans/${planId}`),
    enabled: !!planId,
  });

  const activeWorkout = useMemo(
    () => planDetail?.workouts.find((w) => w.id === activeWorkoutId) ?? null,
    [planDetail, activeWorkoutId]
  );

  const totalSets = useMemo(
    () => (activeWorkout?.exercises ?? []).reduce((sum, ex) => sum + ex.sets, 0),
    [activeWorkout]
  );
  const completedSets = useMemo(
    () => Object.values(loggedSets).reduce((sum, n) => sum + n, 0),
    [loggedSets]
  );

  const [restoringSession, setRestoringSession] = useState(false);

  const logSetMutation = useMutation({
    mutationFn: ({ exerciseId, reps, load, setNumber }: { exerciseId: string; reps: number; load: string; setNumber: number }) =>
      apiPost(`/api/exercises/${exerciseId}/log`, {
        clientId,
        reps,
        load: load || undefined,
        setNumber,
      }),
    onSuccess: (_data, variables) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLoggedSets((prev) => ({ ...prev, [variables.exerciseId]: (prev[variables.exerciseId] ?? 0) + 1 }));
      // Only close the editor if it's still showing the set we just confirmed —
      // the trainer may have already opened a different exercise's editor while
      // this request was in flight, and that one shouldn't be force-closed.
      setEditingSet((current) =>
        current?.exerciseId === variables.exerciseId && current?.setNumber === variables.setNumber
          ? null
          : current
      );
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się zapisać serii.");
    },
  });

  const finishSessionMutation = useMutation({
    mutationFn: () => {
      const durationSeconds = sessionStartedAt ? Math.round((Date.now() - sessionStartedAt) / 1000) : 0;
      return apiPost("/api/workout-sessions", {
        clientId,
        workoutId: activeWorkout!.id,
        planId,
        exercisesCompleted: (activeWorkout?.exercises ?? []).filter((ex) => (loggedSets[ex.id] ?? 0) >= ex.sets).length,
        totalExercises: activeWorkout?.exercises.length ?? 0,
        durationSeconds,
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["client-workout-sessions", clientId] });
      Alert.alert("Zapisano", "Wspólny trening został zapisany. Podopieczny zobaczy zaktualizowany postęp.");
      setSessionActive(false);
      setSessionStartedAt(null);
      setLoggedSets({});
      setActiveWorkoutId(null);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się zapisać sesji treningowej.");
    },
  });

  async function startSession(workoutId: string) {
    const workout = planDetail?.workouts.find((w) => w.id === workoutId);
    setActiveWorkoutId(workoutId);
    setSessionActive(true);
    setSessionStartedAt(Date.now());
    setLoggedSets({});
    if (!workout || workout.exercises.length === 0) return;

    // Restore sets already logged today, so re-entering a workout (after leaving
    // and coming back) doesn't show already-done sets as unchecked and invite
    // logging them twice.
    setRestoringSession(true);
    try {
      const todayKey = new Date().toDateString();
      const results = await Promise.all(
        workout.exercises.map(async (ex) => {
          try {
            const logs = await apiGet<{ setNumber: number; loggedAt: string }[]>(
              `/api/exercises/${ex.id}/logs?clientId=${clientId}`
            );
            const todayCount = logs.filter((l) => new Date(l.loggedAt).toDateString() === todayKey).length;
            return [ex.id, todayCount] as const;
          } catch {
            return [ex.id, 0] as const;
          }
        })
      );
      setLoggedSets(Object.fromEntries(results));
    } finally {
      setRestoringSession(false);
    }
  }

  function openSetEditor(exerciseId: string, setNumber: number, defaultReps: number, defaultLoad?: string | null) {
    setEditingSet({ exerciseId, setNumber });
    setEditReps(String(defaultReps));
    setEditLoad(defaultLoad ?? "");
  }

  function confirmSet() {
    if (!editingSet) return;
    const reps = parseInt(editReps, 10);
    if (!reps || reps <= 0) {
      Alert.alert("Błąd", "Podaj liczbę powtórzeń.");
      return;
    }
    logSetMutation.mutate({
      exerciseId: editingSet.exerciseId,
      reps,
      load: editLoad.trim(),
      setNumber: editingSet.setNumber,
    });
  }

  const isLoading = loadingClients || (!!planId && loadingPlan);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: topPad + 8, backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => {
            if (!sessionActive) {
              router.back();
              return;
            }
            Alert.alert(
              "Wyjść ze wspólnego treningu?",
              "Zalogowane serie zostały zapisane, ale podsumowanie tej sesji nie trafi do historii, jeśli wyjdziesz teraz bez zakończenia treningu.",
              [
                { text: "Wróć do treningu", style: "cancel" },
                {
                  text: "Zakończ i wyjdź",
                  onPress: () => finishSessionMutation.mutate(undefined, { onSuccess: () => router.back() }),
                },
                { text: "Wyjdź bez zapisywania podsumowania", style: "destructive", onPress: () => router.back() },
              ]
            );
          }}
          style={({ pressed }) => [{ marginRight: 4 }, { opacity: pressed ? 0.6 : 1 }]}
          testID="button-back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>
          Wspólny trening{client ? ` — ${client.firstName}` : ""}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !planId || !planDetail ? (
        <View style={styles.centered}>
          <Ionicons name="barbell-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Ten podopieczny nie ma przypisanego planu treningowego.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {!sessionActive ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Wybierz trening z planu "{planDetail.name}"
              </Text>
              {planDetail.workouts
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((w) => (
                  <Pressable
                    key={w.id}
                    onPress={() => startSession(w.id)}
                    style={({ pressed }) => [
                      styles.workoutCard,
                      { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                    testID={`button-start-shared-workout-${w.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.workoutName, { color: colors.foreground }]}>{w.name}</Text>
                      <Text style={[styles.workoutMeta, { color: colors.mutedForeground }]}>
                        {w.exercises.length} ćwiczeń
                      </Text>
                    </View>
                    <Ionicons name="play-circle" size={28} color={colors.primary} />
                  </Pressable>
                ))}
            </>
          ) : (
            activeWorkout && (
              <>
                <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.workoutName, { color: colors.foreground }]}>{activeWorkout.name}</Text>
                  {restoringSession ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <ActivityIndicator size="small" color={colors.mutedForeground} />
                      <Text style={[styles.workoutMeta, { color: colors.mutedForeground }]}>
                        Sprawdzam wcześniej zalogowane serie...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.workoutMeta, { color: colors.mutedForeground }]}>
                      {completedSets}/{totalSets} serii zalogowanych
                    </Text>
                  )}
                </View>

                {activeWorkout.exercises.map((ex) => {
                  const done = loggedSets[ex.id] ?? 0;
                  return (
                    <View key={ex.id} style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.exerciseName, { color: colors.foreground }]}>{ex.name}</Text>
                      <Text style={[styles.workoutMeta, { color: colors.mutedForeground, marginBottom: 8 }]}>
                        Cel: {ex.sets} × {ex.reps}{ex.load ? ` · ${ex.load}` : ""}
                      </Text>
                      <View style={styles.setRow}>
                        {Array.from({ length: ex.sets }).map((_, i) => {
                          const setNumber = i + 1;
                          const isDone = setNumber <= done;
                          return (
                            <Pressable
                              key={setNumber}
                              disabled={isDone}
                              onPress={() => openSetEditor(ex.id, setNumber, ex.reps, ex.load)}
                              style={[
                                styles.setChip,
                                { backgroundColor: isDone ? colors.primary : colors.background, borderColor: isDone ? colors.primary : colors.border },
                              ]}
                              testID={`button-log-set-${ex.id}-${setNumber}`}
                            >
                              <Text style={{ color: isDone ? "#fff" : colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                                {isDone ? "✓" : setNumber}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {editingSet?.exerciseId === ex.id && (
                        <View style={styles.editRow}>
                          <TextInput
                            style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                            value={editReps}
                            onChangeText={setEditReps}
                            keyboardType="numeric"
                            placeholder="Powt."
                            placeholderTextColor={colors.mutedForeground}
                            testID={`input-set-reps-${ex.id}`}
                          />
                          <TextInput
                            style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                            value={editLoad}
                            onChangeText={setEditLoad}
                            placeholder="Obciążenie"
                            placeholderTextColor={colors.mutedForeground}
                            testID={`input-set-load-${ex.id}`}
                          />
                          <Pressable
                            onPress={confirmSet}
                            disabled={logSetMutation.isPending}
                            style={[styles.confirmSetBtn, { backgroundColor: colors.primary }]}
                            testID={`button-confirm-set-${ex.id}`}
                          >
                            {logSetMutation.isPending ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Ionicons name="checkmark" size={18} color="#fff" />
                            )}
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}

                <Pressable
                  onPress={() => finishSessionMutation.mutate()}
                  disabled={finishSessionMutation.isPending}
                  style={[styles.finishBtn, { backgroundColor: colors.primary, opacity: finishSessionMutation.isPending ? 0.7 : 1 }]}
                  testID="button-finish-shared-workout"
                >
                  {finishSessionMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                  )}
                  <Text style={styles.finishBtnText}>Zakończ trening</Text>
                </Pressable>
              </>
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingHorizontal: 32 },
  stickyHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8 },
  pageTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  workoutCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  workoutName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  workoutMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  progressCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  exerciseCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  exerciseName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  setRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  setChip: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  editRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  editInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular" },
  confirmSetBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  finishBtn: { flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  finishBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
