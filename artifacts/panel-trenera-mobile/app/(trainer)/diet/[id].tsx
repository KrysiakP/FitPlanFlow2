import {
  ActivityIndicator,
  Alert,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api";

interface DietPlan {
  id: string;
  name: string;
  status: "draft" | "active" | "completed";
  clientId: string | null;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  mode: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface DietMeal {
  id: string;
  planId: string;
  name: string;
  description?: string | null;
  dayOfWeek: number;
  orderIndex: number;
  suggestedTime?: string | null;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  mealType?: string | null;
  ingredients?: string | null;
}

interface DietSupplement {
  id: string;
  dietPlanId: string;
  name: string;
  dose?: string | null;
  unit?: string | null;
  timing?: string | null;
  frequency?: string | null;
  notes?: string | null;
  brand?: string | null;
}

const DAYS = [
  { value: 1, label: "Poniedziałek", short: "Pn" },
  { value: 2, label: "Wtorek", short: "Wt" },
  { value: 3, label: "Środa", short: "Śr" },
  { value: 4, label: "Czwartek", short: "Cz" },
  { value: 5, label: "Piątek", short: "Pt" },
  { value: 6, label: "Sobota", short: "So" },
  { value: 7, label: "Niedziela", short: "Nd" },
];

const TIMING_OPTIONS = ["rano", "przed treningiem", "z posiłkiem", "pomiędzy posiłkami", "po treningu", "wieczór"];
const UNIT_OPTIONS = ["mg", "g", "ml", "kaps.", "tabletki", "łyżki"];

type MealRepeat = "none" | "all_week";

type MealFormState = {
  name: string;
  suggestedTime: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  description: string;
  repeat: MealRepeat;
};

type SupplementFormState = {
  name: string;
  dose: string;
  unit: string;
  timing: string;
  frequency: string;
  notes: string;
};

const emptyMealForm = (): MealFormState => ({
  name: "",
  suggestedTime: "",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
  description: "",
  repeat: "none",
});

const emptySupplementForm = (): SupplementFormState => ({
  name: "",
  dose: "",
  unit: "mg",
  timing: "",
  frequency: "daily",
  notes: "",
});

export default function DietPlanDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [activeDay, setActiveDay] = useState(1);

  // Meal modal state
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<DietMeal | null>(null);
  const [mealForm, setMealForm] = useState<MealFormState>(emptyMealForm());

  // Supplement modal state
  const [suppModalVisible, setSuppModalVisible] = useState(false);
  const [editingSupp, setEditingSupp] = useState<DietSupplement | null>(null);
  const [suppForm, setSuppForm] = useState<SupplementFormState>(emptySupplementForm());
  const [showTimingPicker, setShowTimingPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const { data: plan, isLoading: isPlanLoading, refetch: refetchPlan, isRefetching } = useQuery<DietPlan>({
    queryKey: ["diet-plan-detail", id],
    queryFn: () => apiGet<DietPlan>(`/api/diets/plans/${id}`),
    enabled: !!id,
  });

  const { data: meals = [], refetch: refetchMeals } = useQuery<DietMeal[]>({
    queryKey: ["diet-plan-meals", id],
    queryFn: () => apiGet<DietMeal[]>(`/api/diets/plans/${id}/meals`),
    enabled: !!id,
  });

  const { data: supplements = [], refetch: refetchSupplements } = useQuery<DietSupplement[]>({
    queryKey: ["diet-plan-supplements", id],
    queryFn: () => apiGet<DietSupplement[]>(`/api/diet-plans/${id}/supplements`),
    enabled: !!id,
  });

  function refetchAll() {
    void refetchPlan();
    void refetchMeals();
    void refetchSupplements();
  }

  // Meal mutations
  const addMealMutation = useMutation({
    mutationFn: (body: object) => apiPost(`/api/diets/plans/${id}/meals`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diet-plan-meals", id] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMealModalVisible(false);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się dodać posiłku."),
  });

  const editMealMutation = useMutation({
    mutationFn: ({ mealId, body }: { mealId: string; body: object }) =>
      apiPut(`/api/diets/meals/${mealId}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diet-plan-meals", id] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMealModalVisible(false);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się zaktualizować posiłku."),
  });

  const deleteMealMutation = useMutation({
    mutationFn: (mealId: string) => apiDelete(`/api/diets/meals/${mealId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diet-plan-meals", id] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się usunąć posiłku."),
  });

  // Supplement mutations
  const addSuppMutation = useMutation({
    mutationFn: (body: object) => apiPost(`/api/diet-plans/${id}/supplements`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diet-plan-supplements", id] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuppModalVisible(false);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się dodać suplementu."),
  });

  const editSuppMutation = useMutation({
    mutationFn: ({ suppId, body }: { suppId: string; body: object }) =>
      apiPatch(`/api/diet-supplements/${suppId}`, { dietPlanId: id, ...body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diet-plan-supplements", id] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuppModalVisible(false);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się zaktualizować suplementu."),
  });

  const deleteSuppMutation = useMutation({
    mutationFn: (suppId: string) => apiDelete(`/api/diet-supplements/${suppId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["diet-plan-supplements", id] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => Alert.alert("Błąd", "Nie udało się usunąć suplementu."),
  });

  function openAddMeal() {
    setEditingMeal(null);
    setMealForm(emptyMealForm());
    setMealModalVisible(true);
  }

  function openEditMeal(meal: DietMeal) {
    setEditingMeal(meal);
    setMealForm({
      name: meal.name,
      suggestedTime: meal.suggestedTime ?? "",
      calories: meal.calories != null ? String(meal.calories) : "",
      protein: meal.protein != null ? String(meal.protein) : "",
      fat: meal.fat != null ? String(meal.fat) : "",
      carbs: meal.carbs != null ? String(meal.carbs) : "",
      description: meal.description ?? "",
      repeat: "none",
    });
    setMealModalVisible(true);
  }

  function buildMealBody(dayOfWeek: number, orderIndex: number) {
    return {
      name: mealForm.name.trim(),
      description: mealForm.description.trim() || null,
      dayOfWeek,
      orderIndex,
      suggestedTime: mealForm.suggestedTime.trim() || null,
      calories: mealForm.calories ? Number(mealForm.calories) : null,
      protein: mealForm.protein ? Number(mealForm.protein) : null,
      fat: mealForm.fat ? Number(mealForm.fat) : null,
      carbs: mealForm.carbs ? Number(mealForm.carbs) : null,
      planId: id,
    };
  }

  function handleSaveMeal() {
    if (!mealForm.name.trim()) {
      Alert.alert("Błąd", "Podaj nazwę posiłku.");
      return;
    }

    if (editingMeal) {
      editMealMutation.mutate({
        mealId: editingMeal.id,
        body: buildMealBody(editingMeal.dayOfWeek, editingMeal.orderIndex),
      });
      return;
    }

    if (mealForm.repeat === "all_week") {
      // Post to all 7 days sequentially – fire all together, close after first success
      let successCount = 0;
      const total = DAYS.length;
      const invalidate = () => {
        void queryClient.invalidateQueries({ queryKey: ["diet-plan-meals", id] });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setMealModalVisible(false);
      };
      DAYS.forEach((d) => {
        const orderIdx = meals.filter((m) => m.dayOfWeek === d.value).length + 1;
        apiPost(`/api/diets/plans/${id}/meals`, buildMealBody(d.value, orderIdx))
          .then(() => {
            successCount++;
            if (successCount === total) invalidate();
          })
          .catch(() => {});
      });
      // Close and invalidate early so UX feels snappy
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["diet-plan-meals", id] });
        setMealModalVisible(false);
      }, 600);
    } else {
      const orderIdx = meals.filter((m) => m.dayOfWeek === activeDay).length + 1;
      addMealMutation.mutate(buildMealBody(activeDay, orderIdx));
    }
  }

  function confirmDeleteMeal(mealId: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Usuń posiłek", "Czy na pewno chcesz usunąć ten posiłek?", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => deleteMealMutation.mutate(mealId) },
    ]);
  }

  function openAddSupp() {
    setEditingSupp(null);
    setSuppForm(emptySupplementForm());
    setSuppModalVisible(true);
  }

  function openEditSupp(s: DietSupplement) {
    setEditingSupp(s);
    setSuppForm({
      name: s.name,
      dose: s.dose ?? "",
      unit: s.unit ?? "mg",
      timing: s.timing ?? "",
      frequency: s.frequency ?? "daily",
      notes: s.notes ?? "",
    });
    setSuppModalVisible(true);
  }

  function handleSaveSupp() {
    if (!suppForm.name.trim()) {
      Alert.alert("Błąd", "Podaj nazwę suplementu.");
      return;
    }
    const body = {
      name: suppForm.name.trim(),
      dose: suppForm.dose.trim() || null,
      unit: suppForm.unit || "mg",
      timing: suppForm.timing || null,
      frequency: suppForm.frequency || "daily",
      notes: suppForm.notes.trim() || null,
      orderIndex: editingSupp
        ? supplements.findIndex((s) => s.id === editingSupp.id)
        : supplements.length,
    };
    if (editingSupp) {
      editSuppMutation.mutate({ suppId: editingSupp.id, body });
    } else {
      addSuppMutation.mutate(body);
    }
  }

  function confirmDeleteSupp(suppId: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Usuń suplement", "Czy na pewno chcesz usunąć ten suplement?", [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => deleteSuppMutation.mutate(suppId) },
    ]);
  }

  const dayMeals = meals
    .filter((m) => m.dayOfWeek === activeDay)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const dayTotals = dayMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories ?? 0),
      protein: acc.protein + (meal.protein ?? 0),
      fat: acc.fat + (meal.fat ?? 0),
      carbs: acc.carbs + (meal.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const isMealPending = addMealMutation.isPending || editMealMutation.isPending;
  const isSuppPending = addSuppMutation.isPending || editSuppMutation.isPending;

  if (isPlanLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Plan nie został znaleziony.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetchAll} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan header */}
        <View style={[styles.planHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.planHeaderTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
              <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>
                {plan.mode ? (plan.mode === "full_plan" ? "Pełny plan" : plan.mode) : "Plan diety"}
              </Text>
            </View>
          </View>

          {/* Plan target macros */}
          <View style={[styles.macroGrid, { borderTopColor: colors.border }]}>
            <MacroChip label="Cel kcal" value={String(plan.targetCalories ?? 0)} color={colors.primary} />
            <MacroChip label="Białko" value={`${plan.targetProtein ?? 0}g`} color="#16a34a" />
            <MacroChip label="Tłuszcz" value={`${plan.targetFat ?? 0}g`} color="#7c3aed" />
            <MacroChip label="Węgle" value={`${plan.targetCarbs ?? 0}g`} color="#d97706" />
          </View>

          {/* Quick-add buttons */}
          <View style={[styles.planActions, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={openAddMeal}
              style={[styles.actionBtn, { backgroundColor: colors.primary + "1a", flex: 1 }]}
              testID="button-add-meal-top"
            >
              <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Dodaj posiłek</Text>
            </Pressable>
            <Pressable
              onPress={openAddSupp}
              style={[styles.actionBtn, { backgroundColor: colors.primary + "1a", flex: 1 }]}
              testID="button-add-supplement-top"
            >
              <Ionicons name="flask-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Dodaj suplement</Text>
            </Pressable>
          </View>
        </View>

        {/* Day tabs */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posiłki</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs} contentContainerStyle={{ gap: 8 }}>
          {DAYS.map((d) => {
            const active = activeDay === d.value;
            const count = meals.filter((m) => m.dayOfWeek === d.value).length;
            return (
              <Pressable
                key={d.value}
                onPress={() => setActiveDay(d.value)}
                style={[
                  styles.dayTab,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                testID={`tab-day-${d.value}`}
              >
                <Text style={[styles.dayTabShort, { color: active ? "#fff" : colors.mutedForeground }]}>{d.short}</Text>
                {count > 0 && (
                  <View style={[styles.dayTabBadge, { backgroundColor: active ? "rgba(255,255,255,0.3)" : colors.primary + "20" }]}>
                    <Text style={[styles.dayTabBadgeText, { color: active ? "#fff" : colors.primary }]}>{count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Day label row */}
        <View style={styles.dayLabelRow}>
          <View>
            <Text style={[styles.dayLabel, { color: colors.foreground }]}>
              {DAYS.find((d) => d.value === activeDay)?.label}
            </Text>
            {dayTotals.calories > 0 && (
              <Text style={[styles.daySubLabel, { color: colors.mutedForeground }]}>
                {dayTotals.calories} kcal · B {dayTotals.protein}g · T {dayTotals.fat}g · W {dayTotals.carbs}g
              </Text>
            )}
          </View>
          <Pressable
            onPress={openAddMeal}
            style={[styles.addMealBtn, { backgroundColor: colors.primary }]}
            testID="button-add-meal"
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addMealBtnText}>Posiłek</Text>
          </Pressable>
        </View>

        {/* Meals list */}
        {dayMeals.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="restaurant-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyDayText, { color: colors.mutedForeground }]}>Brak posiłków w tym dniu</Text>
            <Pressable
              onPress={openAddMeal}
              style={[styles.addMealBtn, { backgroundColor: colors.primary, marginTop: 4 }]}
              testID="button-add-meal-empty"
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.addMealBtnText}>Dodaj posiłek</Text>
            </Pressable>
          </View>
        ) : (
          dayMeals.map((meal) => (
            <View key={meal.id} style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`card-meal-${meal.id}`}>
              <View style={styles.mealCardTop}>
                <View style={[styles.mealIcon, { backgroundColor: colors.primary + "1a" }]}>
                  <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.mealInfo}>
                  <Text style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text>
                  {meal.suggestedTime ? (
                    <Text style={[styles.mealTime, { color: colors.mutedForeground }]}>{meal.suggestedTime}</Text>
                  ) : meal.mealType ? (
                    <Text style={[styles.mealTime, { color: colors.mutedForeground }]}>{meal.mealType}</Text>
                  ) : null}
                </View>
                {meal.calories != null && (
                  <Text style={[styles.mealCal, { color: colors.primary }]}>{meal.calories} kcal</Text>
                )}
                <View style={styles.mealActions}>
                  <Pressable
                    onPress={() => openEditMeal(meal)}
                    style={[styles.iconBtn, { backgroundColor: colors.primary + "1a" }]}
                    testID={`button-edit-meal-${meal.id}`}
                  >
                    <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDeleteMeal(meal.id)}
                    style={[styles.iconBtn, { backgroundColor: colors.destructive + "1a" }]}
                    testID={`button-delete-meal-${meal.id}`}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>
              {meal.description ? (
                <Text style={[styles.mealDesc, { color: colors.mutedForeground }]}>{meal.description}</Text>
              ) : null}
              {meal.ingredients ? (
                <Text style={[styles.mealDesc, { color: colors.mutedForeground }]}>{meal.ingredients}</Text>
              ) : null}
              {(meal.protein != null || meal.carbs != null || meal.fat != null) && (
                <View style={styles.mealMacros}>
                  {meal.protein != null && <MacroSmall label="B" value={`${meal.protein}g`} color="#16a34a" />}
                  {meal.carbs != null && <MacroSmall label="W" value={`${meal.carbs}g`} color="#d97706" />}
                  {meal.fat != null && <MacroSmall label="T" value={`${meal.fat}g`} color="#7c3aed" />}
                </View>
              )}
            </View>
          ))
        )}

        {/* Supplements section */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Suplementy</Text>
          <Pressable
            onPress={openAddSupp}
            style={[styles.addMealBtn, { backgroundColor: colors.primary }]}
            testID="button-add-supplement"
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addMealBtnText}>Dodaj</Text>
          </Pressable>
        </View>

        {supplements.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="flask-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyDayText, { color: colors.mutedForeground }]}>Brak suplementów</Text>
          </View>
        ) : (
          supplements.map((s) => (
            <View key={s.id} style={[styles.suppCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`card-supplement-${s.id}`}>
              <View style={[styles.suppIcon, { backgroundColor: colors.primary + "1a" }]}>
                <Ionicons name="flask-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.suppInfo}>
                <Text style={[styles.suppName, { color: colors.foreground }]}>{s.name}</Text>
                <View style={styles.suppMeta}>
                  {s.dose && s.unit && (
                    <Text style={[styles.suppDetail, { color: colors.mutedForeground }]}>{s.dose} {s.unit}</Text>
                  )}
                  {s.timing && (
                    <Text style={[styles.suppDetail, { color: colors.mutedForeground }]}>{s.timing}</Text>
                  )}
                  {s.notes && (
                    <Text style={[styles.suppDetail, { color: colors.mutedForeground }]}>{s.notes}</Text>
                  )}
                </View>
              </View>
              <View style={styles.mealActions}>
                <Pressable
                  onPress={() => openEditSupp(s)}
                  style={[styles.iconBtn, { backgroundColor: colors.primary + "1a" }]}
                  testID={`button-edit-supplement-${s.id}`}
                >
                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={() => confirmDeleteSupp(s.id)}
                  style={[styles.iconBtn, { backgroundColor: colors.destructive + "1a" }]}
                  testID={`button-delete-supplement-${s.id}`}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Meal form modal */}
      <Modal visible={mealModalVisible} transparent animationType="slide" onRequestClose={() => setMealModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMealModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingMeal ? "Edytuj posiłek" : "Nowy posiłek"}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nazwa *</Text>
              <TextInput
                value={mealForm.name}
                onChangeText={(v) => setMealForm((p) => ({ ...p, name: v }))}
                placeholder="np. Śniadanie"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                testID="input-meal-name"
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Pora dnia (opcjonalnie)</Text>
              <TextInput
                value={mealForm.suggestedTime}
                onChangeText={(v) => setMealForm((p) => ({ ...p, suggestedTime: v }))}
                placeholder="np. 08:00"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                testID="input-meal-time"
              />

              <View style={styles.macroInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Kcal</Text>
                  <TextInput
                    value={mealForm.calories}
                    onChangeText={(v) => setMealForm((p) => ({ ...p, calories: v }))}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    testID="input-meal-calories"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Białko (g)</Text>
                  <TextInput
                    value={mealForm.protein}
                    onChangeText={(v) => setMealForm((p) => ({ ...p, protein: v }))}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    testID="input-meal-protein"
                  />
                </View>
              </View>

              <View style={styles.macroInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tłuszcz (g)</Text>
                  <TextInput
                    value={mealForm.fat}
                    onChangeText={(v) => setMealForm((p) => ({ ...p, fat: v }))}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    testID="input-meal-fat"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Węgle (g)</Text>
                  <TextInput
                    value={mealForm.carbs}
                    onChangeText={(v) => setMealForm((p) => ({ ...p, carbs: v }))}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    testID="input-meal-carbs"
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Opis / Składniki (opcjonalnie)</Text>
              <TextInput
                value={mealForm.description}
                onChangeText={(v) => setMealForm((p) => ({ ...p, description: v }))}
                placeholder="np. Owsianka z owocami..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                testID="input-meal-description"
              />

              {/* Repeat option – only when adding, not editing */}
              {!editingMeal && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Dodaj do</Text>
                  <View style={styles.repeatRow}>
                    {([
                      { value: "none", label: "Tego dnia" },
                      { value: "all_week", label: "Całego tygodnia" },
                    ] as { value: MealRepeat; label: string }[]).map((opt) => {
                      const active = mealForm.repeat === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => setMealForm((p) => ({ ...p, repeat: opt.value }))}
                          style={[
                            styles.repeatChip,
                            {
                              backgroundColor: active ? colors.primary : colors.background,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                          testID={`chip-repeat-${opt.value}`}
                        >
                          {active && <Ionicons name="checkmark" size={13} color="#fff" />}
                          <Text style={[styles.repeatChipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {mealForm.repeat === "all_week" && (
                    <View style={[styles.repeatHint, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
                      <Text style={[styles.repeatHintText, { color: colors.primary }]}>
                        Posiłek zostanie dodany do każdego dnia tygodnia (Pn–Nd).
                      </Text>
                    </View>
                  )}
                </>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setMealModalVisible(false)}
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  testID="button-cancel-meal"
                >
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Anuluj</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveMeal}
                  disabled={isMealPending}
                  style={[styles.createBtn, { backgroundColor: colors.primary, opacity: isMealPending ? 0.7 : 1 }]}
                  testID="button-save-meal"
                >
                  {isMealPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.createBtnText}>
                      {editingMeal ? "Zapisz" : mealForm.repeat === "all_week" ? "Dodaj do tygodnia" : "Dodaj posiłek"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Supplement form modal */}
      <Modal visible={suppModalVisible} transparent animationType="slide" onRequestClose={() => setSuppModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSuppModalVisible(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingSupp ? "Edytuj suplement" : "Nowy suplement"}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nazwa *</Text>
              <TextInput
                value={suppForm.name}
                onChangeText={(v) => setSuppForm((p) => ({ ...p, name: v }))}
                placeholder="np. Witamina D3"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                testID="input-supplement-name"
              />

              <View style={styles.macroInputRow}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Dawka</Text>
                  <TextInput
                    value={suppForm.dose}
                    onChangeText={(v) => setSuppForm((p) => ({ ...p, dose: v }))}
                    placeholder="np. 2000"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    testID="input-supplement-dose"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Jednostka</Text>
                  <Pressable
                    onPress={() => setShowUnitPicker(true)}
                    style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                    testID="button-unit-picker"
                  >
                    <Text style={[styles.pickerBtnText, { color: colors.foreground }]}>{suppForm.unit || "mg"}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Pora przyjmowania</Text>
              <Pressable
                onPress={() => setShowTimingPicker(true)}
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                testID="button-timing-picker"
              >
                <Text style={{ color: suppForm.timing ? colors.foreground : colors.mutedForeground, fontSize: 15, fontFamily: "Inter_400Regular" }}>
                  {suppForm.timing || "Wybierz porę..."}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
              </Pressable>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notatki (opcjonalnie)</Text>
              <TextInput
                value={suppForm.notes}
                onChangeText={(v) => setSuppForm((p) => ({ ...p, notes: v }))}
                placeholder="np. Przyjmować z posiłkiem..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                testID="input-supplement-notes"
              />

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setSuppModalVisible(false)}
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  testID="button-cancel-supplement"
                >
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Anuluj</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveSupp}
                  disabled={isSuppPending}
                  style={[styles.createBtn, { backgroundColor: colors.primary, opacity: isSuppPending ? 0.7 : 1 }]}
                  testID="button-save-supplement"
                >
                  {isSuppPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.createBtnText}>{editingSupp ? "Zapisz" : "Dodaj suplement"}</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Timing picker modal */}
      <Modal visible={showTimingPicker} transparent animationType="slide" onRequestClose={() => setShowTimingPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTimingPicker(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Pora przyjmowania</Text>
            {TIMING_OPTIONS.map((t) => (
              <Pressable
                key={t}
                onPress={() => { setSuppForm((p) => ({ ...p, timing: t })); setShowTimingPicker(false); }}
                style={[styles.clientItem, { borderBottomColor: colors.border, backgroundColor: suppForm.timing === t ? colors.primary + "10" : "transparent" }]}
                testID={`option-timing-${t}`}
              >
                <Text style={[styles.clientItemText, { color: colors.foreground }]}>{t}</Text>
                {suppForm.timing === t && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Unit picker modal */}
      <Modal visible={showUnitPicker} transparent animationType="slide" onRequestClose={() => setShowUnitPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowUnitPicker(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Jednostka</Text>
            {UNIT_OPTIONS.map((u) => (
              <Pressable
                key={u}
                onPress={() => { setSuppForm((p) => ({ ...p, unit: u })); setShowUnitPicker(false); }}
                style={[styles.clientItem, { borderBottomColor: colors.border, backgroundColor: suppForm.unit === u ? colors.primary + "10" : "transparent" }]}
                testID={`option-unit-${u}`}
              >
                <Text style={[styles.clientItemText, { color: colors.foreground }]}>{u}</Text>
                {suppForm.unit === u && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={chipStyles.wrap}>
      <Text style={[chipStyles.label, { color: color + "99" }]}>{label}</Text>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

function MacroSmall({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[smallStyles.wrap, { backgroundColor: color + "1a" }]}>
      <Text style={[smallStyles.text, { color }]}>{label}: {value}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  wrap: { alignItems: "center", flex: 1 },
  label: { fontSize: 10, fontFamily: "Inter_500Medium" },
  value: { fontSize: 14, fontFamily: "Inter_700Bold" },
});

const smallStyles = StyleSheet.create({
  wrap: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 20 },
  planHeader: { borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  planHeaderTop: { padding: 16 },
  planName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  planMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  macroGrid: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 4 },
  planActions: { flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 },
  dayTabs: { marginBottom: 16 },
  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  dayTabShort: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dayTabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  dayTabBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  dayLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 },
  dayLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  daySubLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  addMealBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addMealBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyDay: { borderRadius: 12, borderWidth: 1, paddingVertical: 28, alignItems: "center", gap: 8, marginBottom: 16 },
  emptyDayText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  mealCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8 },
  mealCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  mealIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  mealTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mealCal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  mealActions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  mealDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  mealMacros: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  suppCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  suppIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  suppInfo: { flex: 1, gap: 2 },
  suppName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  suppMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  suppDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  repeatRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  repeatChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  repeatChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  repeatHint: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, padding: 10, marginTop: 4, marginBottom: 4 },
  repeatHintText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4, marginTop: 8 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top" },
  macroInputRow: { flexDirection: "row", gap: 10 },
  pickerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  pickerBtnText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  createBtn: { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  createBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  clientItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
  clientItemText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
