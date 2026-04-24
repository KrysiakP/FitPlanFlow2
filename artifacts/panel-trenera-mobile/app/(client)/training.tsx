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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { ExerciseItem } from "@/components/ExerciseItem";
import { apiGet } from "@/lib/api";

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

export default function TrainingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, sessionCookie } = useAuth();
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<PlanAssignment>({
    queryKey: ["training-plan", user?.id],
    queryFn: () => apiGet<PlanAssignment>(`/api/plan-assignment/${user?.id}`, sessionCookie),
    enabled: !!user?.id,
  });

  const plan = data?.plan;
  const workouts = plan?.workouts ?? [];
  const currentWorkout = workouts.find((w) => w.id === activeWorkout) ?? workouts[0];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Plan treningowy</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : !plan ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            {plan.description && <Text style={styles.planDesc}>{plan.description}</Text>}
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
                    onPress={() => setActiveWorkout(w.id)}
                    style={[
                      styles.workoutTab,
                      {
                        backgroundColor: isActive ? colors.primary : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.workoutTabText, { color: isActive ? "#fff" : colors.mutedForeground }]}
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
                <Text style={[styles.workoutTitle, { color: colors.foreground }]}>
                  {currentWorkout.name}
                </Text>
                {currentWorkout.description && (
                  <Text style={[styles.workoutDesc, { color: colors.mutedForeground }]}>
                    {currentWorkout.description}
                  </Text>
                )}
                <Text style={[styles.exerciseCount, { color: colors.primary }]}>
                  {currentWorkout.exercises?.length ?? 0} ćwiczeń
                </Text>
              </View>

              {(currentWorkout.exercises ?? [])
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((ex, i) => (
                  <ExerciseItem
                    key={ex.id}
                    name={ex.name}
                    sets={ex.sets}
                    reps={ex.reps}
                    weight={ex.weight}
                    restTime={ex.restTime}
                    notes={ex.notes}
                    index={i}
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
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  planHeader: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 6,
  },
  planName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  planDesc: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular" },
  planMeta: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "Inter_500Medium" },
  workoutScroll: { marginBottom: 16 },
  workoutScrollContent: { gap: 8, paddingRight: 8 },
  workoutTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  workoutTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  workoutHeader: { marginBottom: 16, gap: 4 },
  workoutTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  workoutDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  exerciseCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
