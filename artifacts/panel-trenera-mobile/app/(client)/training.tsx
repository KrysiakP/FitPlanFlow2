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
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
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

interface ExerciseLog {
  exerciseId: string;
  reps: number;
  load: string;
}

interface LoggingState {
  reps: string;
  load: string;
}

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  done: boolean;
  logging: boolean;
  loggingState: LoggingState;
  sessionActive: boolean;
  colors: Colors;
  onStartLog: () => void;
  onCancelLog: () => void;
  onChangeReps: (v: string) => void;
  onChangeLoad: (v: string) => void;
  onConfirmLog: () => void;
}

function ExerciseRow({
  exercise,
  index,
  done,
  logging,
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
  if (exercise.sets != null) tags.push({ icon: "repeat-outline", label: `${exercise.sets} serie` });
  if (exercise.reps) tags.push({ icon: "flash-outline", label: `${exercise.reps} pow.` });
  if (exercise.weight) tags.push({ icon: "barbell-outline", label: exercise.weight });
  if (exercise.restTime != null) tags.push({ icon: "timer-outline", label: `${exercise.restTime}s` });

  return (
    <View
      style={[
        styles.exerciseCard,
        {
          backgroundColor: done ? colors.primary + "10" : colors.card,
          borderColor: done ? colors.primary + "50" : colors.border,
        },
      ]}
    >
      <View style={styles.exerciseTop}>
        <Pressable
          onPress={sessionActive ? (done ? undefined : onStartLog) : undefined}
          style={[
            styles.checkbox,
            {
              backgroundColor: done ? colors.primary : "transparent",
              borderColor: done ? colors.primary : colors.border,
              opacity: sessionActive ? 1 : 0.4,
            },
          ]}
          testID={`button-exercise-done-${exercise.id}`}
        >
          {done && <Ionicons name="checkmark" size={14} color="#fff" />}
        </Pressable>

        <View style={styles.exerciseContent}>
          <Text
            style={[
              styles.exerciseName,
              {
                color: done ? colors.mutedForeground : colors.foreground,
                textDecorationLine: done ? "line-through" : "none",
              },
            ]}
          >
            {index + 1}. {exercise.name}
          </Text>
          <View style={styles.tagRow}>
            {tags.map((t, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: colors.accent }]}>
                <Ionicons name={t.icon} size={11} color={colors.mutedForeground} />
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{t.label}</Text>
              </View>
            ))}
          </View>
          {exercise.notes && (
            <Text style={[styles.exerciseNotes, { color: colors.mutedForeground }]}>
              {exercise.notes}
            </Text>
          )}
        </View>
      </View>

      {logging && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.logForm, { borderTopColor: colors.border }]}>
            <Text style={[styles.logFormTitle, { color: colors.foreground }]}>Zaloguj wykonanie</Text>
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
                  testID={`input-reps-${exercise.id}`}
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
                  testID={`input-load-${exercise.id}`}
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
                <Text style={[styles.logBtnText, { color: "#fff" }]}>Zapisz</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bearerToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [loggingExerciseId, setLoggingExerciseId] = useState<string | null>(null);
  const [loggingState, setLoggingState] = useState<LoggingState>({ reps: "", load: "" });
  const [completedLogs, setCompletedLogs] = useState<Record<string, ExerciseLog>>({});

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<PlanAssignment>({
    queryKey: ["client-assignment"],
    queryFn: () => apiGet<PlanAssignment>("/api/client/assignment", bearerToken),
  });

  const logMutation = useMutation({
    mutationFn: async ({ exerciseId, reps, load }: ExerciseLog) => {
      return apiPost(
        `/api/exercises/${exerciseId}/log`,
        { reps, load: load || undefined, setNumber: 1 },
        bearerToken
      );
    },
    onSuccess: (_data, variables) => {
      setCompletedLogs((prev) => ({ ...prev, [variables.exerciseId]: variables }));
      setLoggingExerciseId(null);
      setLoggingState({ reps: "", load: "" });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ["exercise-logs"] });
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się zapisać ćwiczenia. Spróbuj ponownie.");
    },
  });

  const plan = data?.plan;
  const workouts = plan?.workouts ?? [];
  const currentWorkout = workouts.find((w) => w.id === activeWorkout) ?? workouts[0] ?? null;
  const exercises = (currentWorkout?.exercises ?? []).sort((a, b) => a.orderIndex - b.orderIndex);
  const doneCount = exercises.filter((ex) => !!completedLogs[ex.id]).length;
  const allDone = exercises.length > 0 && doneCount === exercises.length;

  function startSession() {
    setCompletedLogs({});
    setLoggingExerciseId(null);
    setSessionActive(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function finishSession() {
    setSessionActive(false);
    setLoggingExerciseId(null);
    setCompletedLogs({});
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Świetna robota!", `Ukończyłeś trening. Zalogowano ${doneCount}/${exercises.length} ćwiczeń.`);
  }

  function handleStartLog(exercise: Exercise) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoggingExerciseId(exercise.id);
    setLoggingState({ reps: exercise.reps ?? "", load: exercise.weight ?? "" });
  }

  function handleConfirmLog(exercise: Exercise) {
    const reps = parseInt(loggingState.reps, 10);
    if (!reps || reps <= 0) {
      Alert.alert("Błąd", "Podaj prawidłową liczbę powtórzeń.");
      return;
    }
    logMutation.mutate({ exerciseId: exercise.id, reps, load: loggingState.load });
  }

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
          {/* Plan header */}
          <View style={[styles.planCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.description && (
              <Text style={styles.planDesc}>{plan.description}</Text>
            )}
          </View>

          {/* Workout tabs */}
          {workouts.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
              {workouts.map((w) => {
                const active = (currentWorkout?.id === w.id);
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => { setActiveWorkout(w.id); setCompletedLogs({}); setLoggingExerciseId(null); }}
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

          {/* Session control */}
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
                style={[
                  styles.sessionBtn,
                  { backgroundColor: sessionActive ? (allDone ? "#16a34a" : colors.primary) : colors.primary },
                ]}
                testID={sessionActive ? "button-finish-session" : "button-start-session"}
              >
                <Text style={styles.sessionBtnText}>
                  {sessionActive ? (allDone ? "Zakończ" : "Przerwij") : "Rozpocznij trening"}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Exercises */}
          {exercises.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ćwiczenia</Text>
              {exercises.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  index={i}
                  done={!!completedLogs[ex.id]}
                  logging={loggingExerciseId === ex.id}
                  loggingState={loggingState}
                  sessionActive={sessionActive}
                  colors={colors}
                  onStartLog={() => handleStartLog(ex)}
                  onCancelLog={() => { setLoggingExerciseId(null); setLoggingState({ reps: "", load: "" }); }}
                  onChangeReps={(v) => setLoggingState((s) => ({ ...s, reps: v }))}
                  onChangeLoad={(v) => setLoggingState((s) => ({ ...s, load: v }))}
                  onConfirmLog={() => handleConfirmLog(ex)}
                />
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

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
  sessionBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  sessionBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 10 },
  exerciseCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  exerciseTop: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 2 },
  exerciseContent: { flex: 1, gap: 6 },
  exerciseName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  exerciseNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  logForm: { borderTopWidth: 1, padding: 14, gap: 10 },
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
