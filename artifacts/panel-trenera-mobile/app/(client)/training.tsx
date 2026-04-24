import type { ComponentProps } from "react";
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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

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

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
  done: boolean;
  onToggle: () => void;
  colors: Colors;
}

function ExerciseRow({ exercise, index, done, onToggle, colors }: ExerciseRowProps) {
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
      <Pressable
        onPress={onToggle}
        style={[
          styles.checkbox,
          {
            backgroundColor: done ? colors.primary : "transparent",
            borderColor: done ? colors.primary : colors.border,
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
            <View
              key={i}
              style={[styles.tag, { backgroundColor: done ? colors.accent : colors.accent }]}
            >
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
  );
}

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, sessionCookie } = useAuth();
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [sessionActive, setSessionActive] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<PlanAssignment>({
    queryKey: ["training-plan", user?.id],
    queryFn: () => apiGet<PlanAssignment>(`/api/plan-assignment/${user?.id}`, sessionCookie),
    enabled: !!user?.id,
  });

  const plan = data?.plan;
  const workouts = plan?.workouts ?? [];
  const currentWorkout =
    workouts.find((w) => w.id === activeWorkout) ?? workouts[0] ?? null;

  const exercises = (currentWorkout?.exercises ?? []).sort(
    (a, b) => a.orderIndex - b.orderIndex
  );
  const doneCount = exercises.filter((ex) => completedExercises.has(ex.id)).length;
  const allDone = exercises.length > 0 && doneCount === exercises.length;

  function toggleExercise(id: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startSession() {
    setCompletedExercises(new Set());
    setSessionActive(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function finishSession() {
    setSessionActive(false);
    setCompletedExercises(new Set());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Plan treningowy</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : !plan ? (
        <View
          style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="barbell-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak planu</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Twój trener jeszcze nie przypisał Ci planu treningowego.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.planHeader, { backgroundColor: colors.primary }]}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.description && (
              <Text style={styles.planDesc}>{plan.description}</Text>
            )}
            <Text style={styles.planMeta}>{workouts.length} treningów</Text>
          </View>

          {workouts.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.workoutScroll}
              contentContainerStyle={styles.workoutScrollContent}
            >
              {workouts.map((w) => {
                const isActive = w.id === (activeWorkout ?? workouts[0]?.id);
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      setActiveWorkout(w.id);
                      setCompletedExercises(new Set());
                    }}
                    style={[
                      styles.workoutTab,
                      {
                        backgroundColor: isActive ? colors.primary : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.workoutTabText,
                        { color: isActive ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      {w.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {currentWorkout && (
            <>
              <View style={styles.workoutHeader}>
                <View>
                  <Text style={[styles.workoutTitle, { color: colors.foreground }]}>
                    {currentWorkout.name}
                  </Text>
                  {currentWorkout.description && (
                    <Text style={[styles.workoutDesc, { color: colors.mutedForeground }]}>
                      {currentWorkout.description}
                    </Text>
                  )}
                </View>
                {sessionActive && (
                  <Text style={[styles.progress, { color: colors.primary }]}>
                    {doneCount}/{exercises.length}
                  </Text>
                )}
              </View>

              {!sessionActive ? (
                <Pressable
                  onPress={startSession}
                  style={({ pressed }) => [
                    styles.startBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                  testID="button-start-workout"
                >
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.startBtnText}>Rozpocznij trening</Text>
                </Pressable>
              ) : (
                <View style={styles.sessionRow}>
                  <View
                    style={[
                      styles.sessionProgress,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.sessionProgressFill,
                        {
                          backgroundColor: colors.primary,
                          width: exercises.length > 0
                            ? `${(doneCount / exercises.length) * 100}%`
                            : "0%",
                        },
                      ]}
                    />
                  </View>
                  <Pressable
                    onPress={finishSession}
                    style={({ pressed }) => [
                      styles.finishBtn,
                      {
                        backgroundColor: allDone
                          ? "#16a34a"
                          : colors.card,
                        borderColor: allDone ? "#16a34a" : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    testID="button-finish-workout"
                  >
                    <Ionicons
                      name="checkmark-done"
                      size={16}
                      color={allDone ? "#fff" : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.finishBtnText,
                        { color: allDone ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      Zakończ
                    </Text>
                  </Pressable>
                </View>
              )}

              {exercises.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  index={i}
                  done={completedExercises.has(ex.id)}
                  onToggle={() => toggleExercise(ex.id)}
                  colors={colors}
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
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  planHeader: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 6,
  },
  planName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  planDesc: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  planMeta: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  workoutScroll: { marginBottom: 16 },
  workoutScrollContent: { gap: 8, paddingRight: 8 },
  workoutTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  workoutTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  workoutTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  workoutDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  progress: { fontSize: 16, fontFamily: "Inter_700Bold" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginBottom: 16,
  },
  startBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sessionProgress: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  sessionProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  finishBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  finishBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  exerciseContent: { flex: 1, gap: 8 },
  exerciseName: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  exerciseNotes: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 16,
  },
});
