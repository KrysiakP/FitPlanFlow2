import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";

type Colors = ReturnType<typeof useColors>;

interface Exercise {
  id: string;
  name: string;
  sets?: number | null;
  reps?: string | null;
  weight?: string | null;
  restTime?: number | null;
  notes?: string | null;
  orderIndex: number;
}

interface Workout {
  id: string;
  name: string;
  description?: string | null;
  exercises: Exercise[];
}

interface PlanAssignment {
  plan?: {
    id: string;
    name: string;
    description?: string | null;
    workouts: Workout[];
  } | null;
}

interface SetLogEntry {
  reps: number;
  load: string;
}

interface LoggingTarget {
  exerciseId: string;
  setNumber: number;
}

interface LoggingState {
  reps: string;
  load: string;
}

interface SessionBody {
  workoutId: string;
  planId: string;
  exercisesCompleted: number;
  totalExercises: number;
  durationSeconds: number;
}

// Tracks completed sets per exercise: { exerciseId: set of set numbers }
type CompletedSets = Record<string, Set<number>>;
// Tracks logged data per set: { exerciseId: { setNumber: { reps, load } } }
type SetLogs = Record<string, Record<number, SetLogEntry>>;

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  completedSets: CompletedSets;
  setLogs: SetLogs;
  loggingTarget: LoggingTarget | null;
  loggingState: LoggingState;
  sessionActive: boolean;
  colors: Colors;
  onStartLog: (exerciseId: string, setNumber: number) => void;
  onCancelLog: () => void;
  onChangeReps: (v: string) => void;
  onChangeLoad: (v: string) => void;
  onConfirmLog: () => void;
}

function ExerciseRow({
  exercise,
  index,
  completedSets,
  setLogs,
  loggingTarget,
  loggingState,
  sessionActive,
  colors,
  onStartLog,
  onCancelLog,
  onChangeReps,
  onChangeLoad,
  onConfirmLog,
}: ExerciseRowProps) {
  type Tag = { icon: ComponentProps<typeof Ionicons>["name"]; label: string };
  const tags: Tag[] = [];
  if (exercise.reps) tags.push({ icon: "flash-outline", label: `${exercise.reps} pow.` });
  if (exercise.weight) tags.push({ icon: "barbell-outline", label: exercise.weight });
  if (exercise.restTime != null) tags.push({ icon: "timer-outline", label: `${exercise.restTime}s odpoczynku` });

  const totalSets = exercise.sets ?? 1;
  const doneSets = completedSets[exercise.id]?.size ?? 0;
  const allSetsCompleted = doneSets >= totalSets;

  return (
    <View
      style={[
        styles.exerciseCard,
        {
          backgroundColor: allSetsCompleted ? colors.primary + "10" : colors.card,
          borderColor: allSetsCompleted ? colors.primary + "50" : colors.border,
        },
      ]}
    >
      {/* Exercise header */}
      <View style={styles.exerciseTop}>
        <View
          style={[
            styles.exerciseStatus,
            {
              backgroundColor: allSetsCompleted ? colors.primary : "transparent",
              borderColor: allSetsCompleted ? colors.primary : colors.border,
            },
          ]}
        >
          {allSetsCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>

        <View style={styles.exerciseContent}>
          <Text
            style={[
              styles.exerciseName,
              {
                color: allSetsCompleted ? colors.mutedForeground : colors.foreground,
                textDecorationLine: allSetsCompleted ? "line-through" : "none",
              },
            ]}
          >
            {index + 1}. {exercise.name}
          </Text>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Ionicons name="repeat-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{totalSets} {totalSets === 1 ? "seria" : "serie"}</Text>
            </View>
            {tags.map((t, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: colors.accent }]}>
                <Ionicons name={t.icon} size={11} color={colors.mutedForeground} />
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{t.label}</Text>
              </View>
            ))}
          </View>
          {sessionActive && (
            <Text style={[styles.setsProgress, { color: colors.mutedForeground }]}>
              {doneSets}/{totalSets} {doneSets === 1 ? "seria" : "serii"} ukończona
            </Text>
          )}
          {exercise.notes && (
            <Text style={[styles.exerciseNotes, { color: colors.mutedForeground }]}>
              {exercise.notes}
            </Text>
          )}
        </View>
      </View>

      {/* Per-set rows — visible only when session active */}
      {sessionActive && (
        <View style={[styles.setList, { borderTopColor: colors.border }]}>
          {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
            const isCompleted = completedSets[exercise.id]?.has(setNum) ?? false;
            const isLogging =
              loggingTarget?.exerciseId === exercise.id &&
              loggingTarget.setNumber === setNum;
            const log = setLogs[exercise.id]?.[setNum];

            return (
              <View key={setNum}>
                <Pressable
                  style={[
                    styles.setRow,
                    { borderBottomColor: colors.border },
                    isLogging && { backgroundColor: colors.accent },
                  ]}
                  onPress={!isCompleted && !isLogging ? () => onStartLog(exercise.id, setNum) : undefined}
                  testID={`button-set-${exercise.id}-${setNum}`}
                >
                  <View
                    style={[
                      styles.setCheckbox,
                      {
                        backgroundColor: isCompleted ? colors.primary : "transparent",
                        borderColor: isCompleted ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {isCompleted && <Ionicons name="checkmark" size={10} color="#fff" />}
                  </View>

                  <Text style={[styles.setLabel, { color: isCompleted ? colors.mutedForeground : colors.foreground }]}>
                    Seria {setNum}
                  </Text>

                  {isCompleted && log && (
                    <View style={styles.setLogChips}>
                      <View style={[styles.setChip, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.setChipText, { color: colors.primary }]}>
                          {log.reps} pow.
                        </Text>
                      </View>
                      {log.load ? (
                        <View style={[styles.setChip, { backgroundColor: colors.primary + "15" }]}>
                          <Text style={[styles.setChipText, { color: colors.primary }]}>
                            {log.load}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {!isCompleted && !isLogging && (
                    <View style={styles.setTapHint}>
                      <Ionicons name="add-circle-outline" size={18} color={colors.mutedForeground} />
                    </View>
                  )}
                </Pressable>

                {isLogging && (
                  <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                    <View style={[styles.logForm, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.logFormTitle, { color: colors.foreground }]}>
                        Zaloguj Serię {setNum}
                      </Text>
                      <View style={styles.logInputRow}>
                        <View style={styles.logInputGroup}>
                          <Text style={[styles.logInputLabel, { color: colors.mutedForeground }]}>Powtórzenia</Text>
                          <TextInput
                            style={[styles.logInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                            value={loggingState.reps}
                            onChangeText={onChangeReps}
                            keyboardType="number-pad"
                            placeholder={exercise.reps ?? "np. 12"}
                            placeholderTextColor={colors.mutedForeground}
                            testID={`input-reps-${exercise.id}-${setNum}`}
                            autoFocus
                          />
                        </View>
                        <View style={styles.logInputGroup}>
                          <Text style={[styles.logInputLabel, { color: colors.mutedForeground }]}>Obciążenie</Text>
                          <TextInput
                            style={[styles.logInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                            value={loggingState.load}
                            onChangeText={onChangeLoad}
                            placeholder={exercise.weight ?? "np. 80kg"}
                            placeholderTextColor={colors.mutedForeground}
                            testID={`input-load-${exercise.id}-${setNum}`}
                          />
                        </View>
                      </View>
                      <View style={styles.logActions}>
                        <Pressable
                          style={[styles.logBtn, styles.logBtnCancel, { borderColor: colors.border }]}
                          onPress={onCancelLog}
                          testID={`button-cancel-log-${exercise.id}`}
                        >
                          <Text style={[styles.logBtnText, { color: colors.mutedForeground }]}>Anuluj</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.logBtn, styles.logBtnConfirm, { backgroundColor: colors.primary }]}
                          onPress={onConfirmLog}
                          testID={`button-confirm-log-${exercise.id}`}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={[styles.logBtnText, { color: "#fff" }]}>Zapisz serię</Text>
                        </Pressable>
                      </View>
                    </View>
                  </KeyboardAvoidingView>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface RestTimerProps {
  seconds: number;
  totalSeconds: number;
  onSkip: () => void;
  colors: Colors;
}

function RestTimer({ seconds, totalSeconds, onSkip, colors }: RestTimerProps) {
  const progress = totalSeconds > 0 ? seconds / totalSeconds : 0;

  return (
    <View style={[restStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[restStyles.title, { color: colors.foreground }]}>Czas odpoczynku</Text>
      <View style={restStyles.circleWrap}>
        <View style={[restStyles.circleBg, { backgroundColor: colors.accent }]}>
          <View style={restStyles.circleInner}>
            <Text style={[restStyles.time, { color: seconds <= 5 ? "#ef4444" : colors.primary }]}>
              {formatTimer(seconds)}
            </Text>
            <Text style={[restStyles.timeLabel, { color: colors.mutedForeground }]}>pozostało</Text>
          </View>
        </View>
      </View>
      <View style={[restStyles.progressBar, { backgroundColor: colors.border }]}>
        <View style={restStyles.progressFlex}>
          <View style={{ flex: progress, backgroundColor: colors.primary, borderRadius: 4 }} />
          <View style={{ flex: Math.max(0, 1 - progress) }} />
        </View>
      </View>
      <Pressable
        style={[restStyles.skipBtn, { borderColor: colors.border }]}
        onPress={onSkip}
        testID="button-skip-rest"
      >
        <Ionicons name="play-forward-outline" size={16} color={colors.mutedForeground} />
        <Text style={[restStyles.skipText, { color: colors.mutedForeground }]}>Pomiń odpoczynek</Text>
      </Pressable>
    </View>
  );
}

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Per-set tracking
  const [completedSets, setCompletedSets] = useState<CompletedSets>({});
  const [setLogs, setSetLogs] = useState<SetLogs>({});
  const [loggingTarget, setLoggingTarget] = useState<LoggingTarget | null>(null);
  const [loggingState, setLoggingState] = useState<LoggingState>({ reps: "", load: "" });

  // Rest timer
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotalSeconds, setRestTotalSeconds] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<PlanAssignment>({
    queryKey: ["client-assignment"],
    queryFn: () => apiGet<PlanAssignment>("/api/client/assignment"),
  });

  function resetSessionState() {
    setSessionActive(false);
    setSessionStartTime(null);
    setCompletedSets({});
    setSetLogs({});
    setLoggingTarget(null);
    setLoggingState({ reps: "", load: "" });
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    setIsResting(false);
    setRestSeconds(0);
  }

  const sessionMutation = useMutation({
    mutationFn: (body: SessionBody) => apiPost("/api/workout-sessions", body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["workout-sessions"] });
      resetSessionState();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Świetna robota!",
        `Ukończyłeś trening. Zalogowano ${variables.exercisesCompleted}/${variables.totalExercises} ćwiczeń.`
      );
    },
    onError: (_err, variables) => {
      resetSessionState();
      Alert.alert(
        "Błąd zapisu sesji",
        `Trening zakończony, ale nie udało się zapisać sesji (${variables.exercisesCompleted}/${variables.totalExercises} ćwiczeń).`,
        [{ text: "OK" }]
      );
    },
  });

  const logMutation = useMutation({
    mutationFn: async ({ exerciseId, setNumber, reps, load }: { exerciseId: string; setNumber: number; reps: number; load: string }) => {
      return apiPost(`/api/exercises/${exerciseId}/log`, { reps, load: load || undefined, setNumber });
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się zapisać serii. Spróbuj ponownie.");
    },
  });

  function startRestTimer(seconds: number) {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestSeconds(seconds);
    setRestTotalSeconds(seconds);
    setIsResting(true);
    restIntervalRef.current = setInterval(() => {
      setRestSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current!);
          restIntervalRef.current = null;
          setIsResting(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRestTimer() {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
    setIsResting(false);
    setRestSeconds(0);
  }

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, []);

  const plan = data?.plan;
  const workouts = plan?.workouts ?? [];
  const currentWorkout = workouts.find((w) => w.id === activeWorkout) ?? workouts[0] ?? null;
  const exercises = (currentWorkout?.exercises ?? []).sort((a, b) => a.orderIndex - b.orderIndex);

  const doneCount = exercises.filter((ex) => {
    const totalSets = ex.sets ?? 1;
    return (completedSets[ex.id]?.size ?? 0) >= totalSets;
  }).length;

  const allDone = exercises.length > 0 && doneCount === exercises.length;

  function startSession() {
    setCompletedSets({});
    setSetLogs({});
    setLoggingTarget(null);
    stopRestTimer();
    setSessionStartTime(Date.now());
    setSessionActive(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function finishSession() {
    const durationSeconds = sessionStartTime
      ? Math.round((Date.now() - sessionStartTime) / 1000)
      : 0;
    const done = doneCount;
    const total = exercises.length;

    if (currentWorkout && plan) {
      sessionMutation.mutate({
        workoutId: currentWorkout.id,
        planId: plan.id,
        exercisesCompleted: done,
        totalExercises: total,
        durationSeconds,
      });
    } else {
      resetSessionState();
      Alert.alert("Trening zakończony", `Zalogowano ${done}/${total} ćwiczeń.`);
    }
  }

  function handleStartLog(exerciseId: string, setNumber: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    setLoggingTarget({ exerciseId, setNumber });
    setLoggingState({ reps: exercise?.reps ?? "", load: exercise?.weight ?? "" });
    if (isResting) stopRestTimer();
  }

  function handleConfirmLog() {
    if (!loggingTarget) return;
    const { exerciseId, setNumber } = loggingTarget;
    const reps = parseInt(loggingState.reps, 10);
    if (!reps || reps <= 0) {
      Alert.alert("Błąd", "Podaj prawidłową liczbę powtórzeń.");
      return;
    }
    const load = loggingState.load;
    const exercise = exercises.find((ex) => ex.id === exerciseId);

    logMutation.mutate(
      { exerciseId, setNumber, reps, load },
      {
        onSuccess: () => {
          setCompletedSets((prev) => {
            const next = { ...prev };
            if (!next[exerciseId]) next[exerciseId] = new Set();
            const updated = new Set(next[exerciseId]);
            updated.add(setNumber);
            next[exerciseId] = updated;
            return next;
          });
          setSetLogs((prev) => ({
            ...prev,
            [exerciseId]: { ...(prev[exerciseId] ?? {}), [setNumber]: { reps, load } },
          }));
          setLoggingTarget(null);
          setLoggingState({ reps: "", load: "" });
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          void queryClient.invalidateQueries({ queryKey: ["exercise-logs"] });

          if (exercise?.restTime && exercise.restTime > 0) {
            startRestTimer(exercise.restTime);
          }
        },
      }
    );
  }

  const isSaving = sessionMutation.isPending;

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
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Trening</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : !plan ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak planu treningowego</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Twój trener jeszcze nie przypisał Ci planu treningowego.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.planCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.description && (
              <Text style={styles.planDesc}>{plan.description}</Text>
            )}
          </View>

          {workouts.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
              {workouts.map((w) => {
                const active = (currentWorkout?.id === w.id);
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      setActiveWorkout(w.id);
                      setCompletedSets({});
                      setSetLogs({});
                      setLoggingTarget(null);
                      stopRestTimer();
                    }}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    testID={`button-workout-tab-${w.id}`}
                  >
                    <Text style={[styles.tabText, { color: active ? "#fff" : colors.foreground }]}>
                      {w.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {currentWorkout && (
            <View style={[styles.sessionBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.sessionWorkoutName, { color: colors.foreground }]}>
                  {currentWorkout.name}
                </Text>
                {sessionActive && (
                  <Text style={[styles.sessionProgress, { color: colors.mutedForeground }]}>
                    {doneCount}/{exercises.length} ćwiczeń
                  </Text>
                )}
              </View>
              <Pressable
                onPress={sessionActive ? finishSession : startSession}
                disabled={isSaving}
                style={[
                  styles.sessionBtn,
                  {
                    backgroundColor: isSaving
                      ? colors.mutedForeground
                      : sessionActive
                        ? (allDone ? "#16a34a" : colors.primary)
                        : colors.primary,
                  },
                ]}
                testID={sessionActive ? "button-finish-session" : "button-start-session"}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sessionBtnText}>
                    {sessionActive ? (allDone ? "Zakończ" : "Przerwij") : "Rozpocznij trening"}
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {isResting && (
            <RestTimer
              seconds={restSeconds}
              totalSeconds={restTotalSeconds}
              onSkip={stopRestTimer}
              colors={colors}
            />
          )}

          {exercises.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ćwiczenia</Text>
              {exercises.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  index={i}
                  completedSets={completedSets}
                  setLogs={setLogs}
                  loggingTarget={loggingTarget}
                  loggingState={loggingState}
                  sessionActive={sessionActive}
                  colors={colors}
                  onStartLog={handleStartLog}
                  onCancelLog={() => {
                    setLoggingTarget(null);
                    setLoggingState({ reps: "", load: "" });
                  }}
                  onChangeReps={(v) => setLoggingState((s) => ({ ...s, reps: v }))}
                  onChangeLoad={(v) => setLoggingState((s) => ({ ...s, load: v }))}
                  onConfirmLog={handleConfirmLog}
                />
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const restStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  circleWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  circleInner: {
    alignItems: "center",
    gap: 2,
  },
  time: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  progressFlex: {
    flex: 1,
    flexDirection: "row",
    height: 6,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 16 },
  loader: { marginTop: 40 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  planCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  planName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  planDesc: { color: "rgba(255,255,255,0.75)", fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4 },
  tabScroll: { marginBottom: 12 },
  tab: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sessionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  sessionWorkoutName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sessionProgress: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sessionBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 100, alignItems: "center" },
  sessionBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 10 },
  exerciseCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  exerciseTop: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  exerciseStatus: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 2 },
  exerciseContent: { flex: 1, gap: 6 },
  exerciseName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  setsProgress: { fontSize: 12, fontFamily: "Inter_400Regular" },
  exerciseNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  setList: { borderTopWidth: 1 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  setCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  setLabel: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  setLogChips: { flexDirection: "row", gap: 6 },
  setChip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  setChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  setTapHint: { marginLeft: "auto" },
  logForm: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  logFormTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  logInputRow: { flexDirection: "row", gap: 10 },
  logInputGroup: { flex: 1, gap: 4 },
  logInputLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  logInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  logActions: { flexDirection: "row", gap: 8 },
  logBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  logBtnCancel: { borderWidth: 1 },
  logBtnConfirm: {},
  logBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
