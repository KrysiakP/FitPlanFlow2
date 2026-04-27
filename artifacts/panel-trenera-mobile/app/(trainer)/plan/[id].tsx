import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

interface ExerciseLibraryItem {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultLoad?: string | null;
  defaultRestTime?: number | null;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  load?: string | null;
  restTime?: number | null;
  description?: string | null;
  videoUrl?: string | null;
  orderIndex: number;
}

interface Workout {
  id: string;
  name: string;
  description?: string | null;
  orderIndex: number;
  exercises: Exercise[];
}

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  workouts: Workout[];
}

type AddExerciseMode =
  | { type: "library"; workoutId: string }
  | { type: "manual"; workoutId: string }
  | null;

type EditExerciseState = {
  exercise: Exercise;
  workoutId: string;
} | null;

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [editingPlanName, setEditingPlanName] = useState(false);
  const [planNameDraft, setPlanNameDraft] = useState("");

  const [addWorkoutVisible, setAddWorkoutVisible] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState("");

  const [addExerciseMode, setAddExerciseMode] = useState<AddExerciseMode>(null);
  const [librarySearch, setLibrarySearch] = useState("");

  const [manualName, setManualName] = useState("");
  const [manualSets, setManualSets] = useState("3");
  const [manualReps, setManualReps] = useState("10");
  const [manualLoad, setManualLoad] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualVideoUrl, setManualVideoUrl] = useState("");

  const [editExercise, setEditExercise] = useState<EditExerciseState>(null);
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editLoad, setEditLoad] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");

  const navigation = useNavigation();

  const { data: plan, isLoading, refetch, isRefetching } = useQuery<Plan>({
    queryKey: ["plan", id],
    queryFn: () => apiGet<Plan>(`/api/plans/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (plan?.name) {
      navigation.setOptions({ title: plan.name });
    }
  }, [plan?.name]);

  const { data: library = [] } = useQuery<ExerciseLibraryItem[]>({
    queryKey: ["exercise-library"],
    queryFn: () => apiGet<ExerciseLibraryItem[]>("/api/exercises/library"),
  });

  const updatePlanMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiPut(`/api/plans/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan", id] });
      qc.invalidateQueries({ queryKey: ["training-plans"] });
      setEditingPlanName(false);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się zaktualizować planu."),
  });

  const addWorkoutMutation = useMutation<Workout, Error, string>({
    mutationFn: (name: string) =>
      apiPost<Workout>(`/api/plans/${id}/workouts`, { name, orderIndex: plan?.workouts.length ?? 0 }),
    onSuccess: (newWorkout) => {
      qc.invalidateQueries({ queryKey: ["plan", id] });
      qc.invalidateQueries({ queryKey: ["training-plans"] });
      setAddWorkoutVisible(false);
      setNewWorkoutName("");
      setExpandedWorkouts((prev) => new Set([...prev, newWorkout.id]));
    },
    onError: () => Alert.alert("Błąd", "Nie udało się dodać treningu."),
  });

  const deleteWorkoutMutation = useMutation({
    mutationFn: (workoutId: string) => apiDelete(`/api/workouts/${workoutId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan", id] });
      qc.invalidateQueries({ queryKey: ["training-plans"] });
    },
    onError: () => Alert.alert("Błąd", "Nie udało się usunąć treningu."),
  });

  const addExerciseMutation = useMutation({
    mutationFn: ({ workoutId, exercise }: { workoutId: string; exercise: object }) =>
      apiPost(`/api/workouts/${workoutId}/exercises`, [exercise]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan", id] });
      setAddExerciseMode(null);
      setManualName("");
      setManualSets("3");
      setManualReps("10");
      setManualLoad("");
      setManualDesc("");
      setManualVideoUrl("");
      setLibrarySearch("");
    },
    onError: (e) => Alert.alert("Błąd", e.message || "Nie udało się dodać ćwiczenia."),
  });

  const updateExerciseMutation = useMutation({
    mutationFn: ({ exerciseId, data }: { exerciseId: string; data: object }) =>
      apiPut(`/api/exercises/${exerciseId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan", id] });
      setEditExercise(null);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się zaktualizować ćwiczenia."),
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: (exerciseId: string) => apiDelete(`/api/exercises/${exerciseId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan", id] });
    },
    onError: () => Alert.alert("Błąd", "Nie udało się usunąć ćwiczenia."),
  });

  function toggleWorkout(workoutId: string) {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      if (next.has(workoutId)) next.delete(workoutId);
      else next.add(workoutId);
      return next;
    });
  }

  function confirmDeleteWorkout(workout: Workout) {
    Alert.alert(
      "Usuń trening",
      `Czy na pewno chcesz usunąć trening "${workout.name}"?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteWorkoutMutation.mutate(workout.id);
          },
        },
      ]
    );
  }

  function confirmDeleteExercise(exercise: Exercise) {
    Alert.alert(
      "Usuń ćwiczenie",
      `Czy na pewno chcesz usunąć "${exercise.name}"?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            deleteExerciseMutation.mutate(exercise.id);
          },
        },
      ]
    );
  }

  function openEditExercise(exercise: Exercise, workoutId: string) {
    setEditExercise({ exercise, workoutId });
    setEditSets(String(exercise.sets));
    setEditReps(String(exercise.reps));
    setEditLoad(exercise.load ?? "");
    setEditDesc(exercise.description ?? "");
    setEditVideoUrl(exercise.videoUrl ?? "");
  }

  function handleSaveExercise() {
    if (!editExercise) return;
    const sets = parseInt(editSets, 10);
    const reps = parseInt(editReps, 10);
    if (isNaN(sets) || sets < 1 || isNaN(reps) || reps < 1) {
      Alert.alert("Błąd", "Serie i powtórzenia muszą być liczbami większymi od 0.");
      return;
    }
    updateExerciseMutation.mutate({
      exerciseId: editExercise.exercise.id,
      data: {
        sets,
        reps,
        load: editLoad.trim() || null,
        description: editDesc.trim() || null,
        videoUrl: editVideoUrl.trim() || null,
      },
    });
  }

  function handleAddFromLibrary(item: ExerciseLibraryItem) {
    if (!addExerciseMode || addExerciseMode.type !== "library") return;
    const workoutId = addExerciseMode.workoutId;
    const workout = plan?.workouts.find((w) => w.id === workoutId);
    addExerciseMutation.mutate({
      workoutId,
      exercise: {
        name: item.name,
        sets: item.defaultSets ?? 3,
        reps: item.defaultReps ?? 10,
        load: item.defaultLoad ?? "",
        restTime: item.defaultRestTime ?? 60,
        description: item.description ?? "",
        orderIndex: workout?.exercises.length ?? 0,
      },
    });
  }

  function handleAddManual() {
    if (!addExerciseMode || addExerciseMode.type !== "manual") return;
    const name = manualName.trim();
    if (!name) { Alert.alert("Błąd", "Podaj nazwę ćwiczenia."); return; }
    const sets = parseInt(manualSets, 10);
    const reps = parseInt(manualReps, 10);
    if (isNaN(sets) || sets < 1 || isNaN(reps) || reps < 1) {
      Alert.alert("Błąd", "Serie i powtórzenia muszą być liczbami większymi od 0."); return;
    }
    const workoutId = addExerciseMode.workoutId;
    const workout = plan?.workouts.find((w) => w.id === workoutId);
    addExerciseMutation.mutate({
      workoutId,
      exercise: {
        name,
        sets,
        reps,
        load: manualLoad.trim() || "",
        restTime: 60,
        description: manualDesc.trim() || "",
        videoUrl: manualVideoUrl.trim() || "",
        orderIndex: workout?.exercises.length ?? 0,
      },
    });
  }

  const filteredLibrary = library.filter((ex) =>
    ex.name.toLowerCase().includes(librarySearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground }}>Nie znaleziono planu.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.planInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {editingPlanName ? (
            <View style={{ gap: 10 }}>
              <TextInput
                style={[styles.planNameInput, { color: colors.foreground, borderColor: colors.primary }]}
                value={planNameDraft}
                onChangeText={setPlanNameDraft}
                autoFocus
                testID="input-edit-plan-name"
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.btnSmallSecondary, { borderColor: colors.border }]}
                  onPress={() => setEditingPlanName(false)}
                >
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 14 }}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnSmallPrimary, { backgroundColor: colors.primary }]}
                  onPress={() => updatePlanMutation.mutate({ name: planNameDraft.trim() || plan.name, description: plan.description ?? undefined })}
                  disabled={updatePlanMutation.isPending}
                >
                  {updatePlanMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Zapisz</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.planNameRow}
              onPress={() => {
                setPlanNameDraft(plan.name);
                setEditingPlanName(true);
              }}
              testID="button-edit-plan-name"
            >
              <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
              <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {plan.description ? (
            <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>{plan.description}</Text>
          ) : null}
          <View style={[styles.planStats, { borderTopColor: colors.border }]}>
            <Ionicons name="layers-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.planStatsText, { color: colors.mutedForeground }]}>
              {plan.workouts.length} {plan.workouts.length === 1 ? "trening" : "treningów"}
            </Text>
            <Text style={[styles.planStatsSep, { color: colors.border }]}>•</Text>
            <Ionicons name="barbell-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.planStatsText, { color: colors.mutedForeground }]}>
              {plan.workouts.reduce((s, w) => s + w.exercises.length, 0)} ćwiczeń
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Treningi</Text>
          <TouchableOpacity
            style={[styles.btnAddWorkout, { backgroundColor: colors.primary }]}
            onPress={() => setAddWorkoutVisible(true)}
            testID="button-add-workout"
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.btnAddWorkoutText}>Dodaj trening</Text>
          </TouchableOpacity>
        </View>

        {plan.workouts.length === 0 ? (
          <View style={[styles.emptyWorkouts, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="barbell-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Brak treningów — dodaj pierwszy trening do planu
            </Text>
          </View>
        ) : (
          plan.workouts.map((workout) => {
            const isExpanded = expandedWorkouts.has(workout.id);
            return (
              <View
                key={workout.id}
                style={[styles.workoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <TouchableOpacity
                  style={styles.workoutHeader}
                  onPress={() => toggleWorkout(workout.id)}
                  activeOpacity={0.75}
                  testID={`button-toggle-workout-${workout.id}`}
                >
                  <View style={[styles.workoutIconWrap, { backgroundColor: colors.primary + "1a" }]}>
                    <Ionicons name="fitness-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.workoutName, { color: colors.foreground }]}>{workout.name}</Text>
                    <Text style={[styles.workoutSubtext, { color: colors.mutedForeground }]}>
                      {workout.exercises.length} {workout.exercises.length === 1 ? "ćwiczenie" : "ćwiczeń"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDeleteWorkout(workout)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    testID={`button-delete-workout-${workout.id}`}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.destructive} />
                  </TouchableOpacity>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.workoutBody, { borderTopColor: colors.border }]}>
                    {workout.exercises.length === 0 ? (
                      <Text style={[styles.emptyExercises, { color: colors.mutedForeground }]}>
                        Brak ćwiczeń — dodaj ćwiczenie do tego treningu
                      </Text>
                    ) : (
                      workout.exercises.map((ex, idx) => (
                        <View
                          key={ex.id}
                          style={[
                            styles.exerciseRow,
                            idx < workout.exercises.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                          ]}
                          testID={`row-exercise-${ex.id}`}
                        >
                          <View style={[styles.exOrderBadge, { backgroundColor: colors.primary + "1a" }]}>
                            <Text style={[styles.exOrderText, { color: colors.primary }]}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.exName, { color: colors.foreground }]}>{ex.name}</Text>
                            <Text style={[styles.exDetails, { color: colors.mutedForeground }]}>
                              {ex.sets} serie × {ex.reps} powtórzeń
                              {ex.load ? ` • ${ex.load}` : ""}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => openEditExercise(ex, workout.id)}
                            style={styles.iconBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            testID={`button-edit-exercise-${ex.id}`}
                          >
                            <Ionicons name="create-outline" size={17} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmDeleteExercise(ex)}
                            style={styles.iconBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            testID={`button-delete-exercise-${ex.id}`}
                          >
                            <Ionicons name="trash-outline" size={17} color={colors.destructive} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}

                    <View style={[styles.addExerciseBtns, { borderTopColor: workout.exercises.length > 0 ? colors.border : "transparent" }]}>
                      <TouchableOpacity
                        style={[styles.addExBtn, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "40" }]}
                        onPress={() => {
                          setAddExerciseMode({ type: "library", workoutId: workout.id });
                          setLibrarySearch("");
                        }}
                        testID={`button-add-from-library-${workout.id}`}
                      >
                        <Ionicons name="library-outline" size={15} color={colors.primary} />
                        <Text style={[styles.addExBtnText, { color: colors.primary }]}>Z biblioteki</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.addExBtn, { backgroundColor: colors.accent, borderColor: colors.border }]}
                        onPress={() => {
                          setAddExerciseMode({ type: "manual", workoutId: workout.id });
                          setManualName("");
                          setManualSets("3");
                          setManualReps("10");
                          setManualLoad("");
                        }}
                        testID={`button-add-manual-exercise-${workout.id}`}
                      >
                        <Ionicons name="add-circle-outline" size={15} color={colors.foreground} />
                        <Text style={[styles.addExBtnText, { color: colors.foreground }]}>Ręcznie</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={addWorkoutVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddWorkoutVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.kavSheet}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddWorkoutVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Nowy trening</Text>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nazwa treningu</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="np. Trening A — górna partia"
              placeholderTextColor={colors.mutedForeground}
              value={newWorkoutName}
              onChangeText={setNewWorkoutName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                const name = newWorkoutName.trim();
                if (name) addWorkoutMutation.mutate(name);
              }}
              testID="input-new-workout-name"
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.btnSecondary, { borderColor: colors.border }]} onPress={() => { setAddWorkoutVisible(false); setNewWorkoutName(""); }}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: addWorkoutMutation.isPending ? 0.7 : 1 }]}
                onPress={() => {
                  const name = newWorkoutName.trim();
                  if (!name) { Alert.alert("Błąd", "Podaj nazwę treningu."); return; }
                  addWorkoutMutation.mutate(name);
                }}
                disabled={addWorkoutMutation.isPending}
                testID="button-confirm-add-workout"
              >
                {addWorkoutMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Dodaj</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={addExerciseMode?.type === "library"}
        transparent
        animationType="slide"
        onRequestClose={() => setAddExerciseMode(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddExerciseMode(null)} />
          <View style={[styles.sheetTall, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Wybierz ćwiczenie</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginBottom: 8 }]}
              placeholder="Szukaj ćwiczenia..."
              placeholderTextColor={colors.mutedForeground}
              value={librarySearch}
              onChangeText={setLibrarySearch}
              autoFocus
              testID="input-library-search"
            />
            {filteredLibrary.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                  {library.length === 0 ? "Brak ćwiczeń w bibliotece" : "Brak wyników"}
                </Text>
              </View>
            ) : (
              <FlatList
                style={{ flexGrow: 0 }}
                data={filteredLibrary}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.libraryItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleAddFromLibrary(item)}
                    testID={`button-library-item-${item.id}`}
                    disabled={addExerciseMutation.isPending}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.libName, { color: colors.foreground }]}>{item.name}</Text>
                      {item.category ? (
                        <Text style={[styles.libCategory, { color: colors.mutedForeground }]}>{item.category}</Text>
                      ) : null}
                    </View>
                    {item.defaultSets && item.defaultReps ? (
                      <Text style={[styles.libDefaults, { color: colors.mutedForeground }]}>
                        {item.defaultSets}×{item.defaultReps}
                      </Text>
                    ) : null}
                    {addExerciseMutation.isPending ? null : <Ionicons name="add-circle-outline" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={[styles.btnSecondary, { borderColor: colors.border, marginTop: 8 }]} onPress={() => setAddExerciseMode(null)}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={addExerciseMode?.type === "manual"}
        transparent
        animationType="slide"
        onRequestClose={() => setAddExerciseMode(null)}
      >
        <KeyboardAvoidingView
          style={styles.kavSheet}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddExerciseMode(null)} />
          <View style={[styles.sheetScrollable, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24, maxHeight: "88%" }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Dodaj ćwiczenie</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nazwa ćwiczenia *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="np. Wyciskanie sztangi"
              placeholderTextColor={colors.mutedForeground}
              value={manualName}
              onChangeText={setManualName}
              autoFocus
              returnKeyType="next"
              testID="input-manual-exercise-name"
            />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Serie</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={manualSets}
                  onChangeText={setManualSets}
                  keyboardType="numeric"
                  returnKeyType="next"
                  testID="input-manual-sets"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Powtórzenia</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={manualReps}
                  onChangeText={setManualReps}
                  keyboardType="numeric"
                  returnKeyType="next"
                  testID="input-manual-reps"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Obciążenie</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="np. 60 kg"
                  placeholderTextColor={colors.mutedForeground}
                  value={manualLoad}
                  onChangeText={setManualLoad}
                  returnKeyType="next"
                  testID="input-manual-load"
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Opis (opcjonalnie)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Opis techniki, uwagi do wykonania..."
              placeholderTextColor={colors.mutedForeground}
              value={manualDesc}
              onChangeText={setManualDesc}
              multiline
              numberOfLines={3}
              returnKeyType="next"
              testID="input-manual-desc"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Link do YouTube (opcjonalnie)</Text>
            <View style={[styles.youtubeInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="logo-youtube" size={18} color="#FF0000" />
              <TextInput
                style={[styles.youtubeInput, { color: colors.foreground }]}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={colors.mutedForeground}
                value={manualVideoUrl}
                onChangeText={setManualVideoUrl}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                testID="input-manual-video-url"
              />
            </View>

            </ScrollView>
            <View style={[styles.sheetActions, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.btnSecondary, { borderColor: colors.border }]} onPress={() => setAddExerciseMode(null)}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: addExerciseMutation.isPending ? 0.7 : 1 }]}
                onPress={handleAddManual}
                disabled={addExerciseMutation.isPending}
                testID="button-confirm-add-manual"
              >
                {addExerciseMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Dodaj</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!editExercise}
        transparent
        animationType="slide"
        onRequestClose={() => setEditExercise(null)}
      >
        <KeyboardAvoidingView
          style={styles.kavSheet}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditExercise(null)} />
          <View style={[styles.sheetScrollable, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24, maxHeight: "88%" }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {editExercise?.exercise.name}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Serie</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={editSets}
                  onChangeText={setEditSets}
                  keyboardType="numeric"
                  returnKeyType="next"
                  testID="input-edit-sets"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Powtórzenia</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={editReps}
                  onChangeText={setEditReps}
                  keyboardType="numeric"
                  returnKeyType="next"
                  testID="input-edit-reps"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Obciążenie</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="np. 60 kg"
                  placeholderTextColor={colors.mutedForeground}
                  value={editLoad}
                  onChangeText={setEditLoad}
                  returnKeyType="next"
                  testID="input-edit-load"
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Opis (opcjonalnie)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Opis techniki, uwagi do wykonania..."
              placeholderTextColor={colors.mutedForeground}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              numberOfLines={3}
              returnKeyType="next"
              testID="input-edit-desc"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Link do YouTube (opcjonalnie)</Text>
            <View style={[styles.youtubeInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="logo-youtube" size={18} color="#FF0000" />
              <TextInput
                style={[styles.youtubeInput, { color: colors.foreground }]}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={colors.mutedForeground}
                value={editVideoUrl}
                onChangeText={setEditVideoUrl}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                testID="input-edit-video-url"
              />
            </View>

            </ScrollView>
            <View style={[styles.sheetActions, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.btnSecondary, { borderColor: colors.border }]} onPress={() => setEditExercise(null)}>
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: updateExerciseMutation.isPending ? 0.7 : 1 }]}
                onPress={handleSaveExercise}
                disabled={updateExerciseMutation.isPending}
                testID="button-save-exercise"
              >
                {updateExerciseMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Zapisz</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  planInfoCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 4, gap: 8 },
  planNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { fontSize: 20, fontFamily: "Inter_700Bold", flex: 1 },
  planDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  planStats: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 10, marginTop: 2, borderTopWidth: 1 },
  planStatsText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  planStatsSep: { fontSize: 13, marginHorizontal: 2 },
  planNameInput: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 18, fontFamily: "Inter_700Bold" },
  btnSmallSecondary: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  btnSmallPrimary: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 2 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  btnAddWorkout: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  btnAddWorkoutText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  emptyWorkouts: { borderRadius: 14, borderWidth: 1, padding: 28, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  workoutCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  workoutHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  workoutIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  workoutName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  workoutSubtext: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  iconBtn: { padding: 4 },
  workoutBody: { borderTopWidth: 1, paddingTop: 4 },
  exerciseRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  exOrderBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  exOrderText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  exName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  exDetails: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  addExerciseBtns: { flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1 },
  addExBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  addExBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyExercises: { padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  kavSheet: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 12, gap: 10 },
  sheetScrollable: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12 },
  sheetTall: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 12, gap: 8, maxHeight: "80%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 2 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 72, textAlignVertical: "top" },
  youtubeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  youtubeInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnPrimary: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  libraryItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  libName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  libCategory: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  libDefaults: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
