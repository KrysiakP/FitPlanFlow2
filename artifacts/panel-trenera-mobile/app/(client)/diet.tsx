import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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

interface Meal {
  id: string;
  name: string;
  time?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  ingredients?: string | null;
  notes?: string | null;
  orderIndex: number;
}

interface Supplement {
  id: string;
  name: string;
  dosage?: string | null;
  timing?: string | null;
}

interface DietPlan {
  id: string;
  name: string;
  totalCalories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  notes?: string | null;
  meals: Meal[];
  supplements: Supplement[];
}

const WATER_STEP_ML = 250;

export default function DietScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessionCookie } = useAuth();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [waterMl, setWaterMl] = useState(0);
  const [eatenMeals, setEatenMeals] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isRefetching } = useQuery<DietPlan | null>({
    queryKey: ["diet-plan"],
    queryFn: () => apiGet<DietPlan | null>("/api/client/diet", sessionCookie),
    retry: 1,
  });

  const logMutation = useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      const today = new Date().toISOString().split("T")[0];
      const mealCheckmarks = Array.from(eatenMeals).map((mealId) => ({ mealId, completed: true }));
      return apiPost(
        "/api/client/diet/log",
        {
          date: today,
          planId,
          waterLiters: waterMl / 1000,
          mealCheckmarks,
        },
        sessionCookie
      );
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void queryClient.invalidateQueries({ queryKey: ["diet-logs"] });
      Alert.alert("Zapisano!", "Dzisiejszy dziennik diety został zaktualizowany.");
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się zapisać dziennika. Spróbuj ponownie.");
    },
  });

  function toggleMeal(mealId: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEatenMeals((prev) => {
      const next = new Set(prev);
      if (next.has(mealId)) next.delete(mealId);
      else next.add(mealId);
      return next;
    });
  }

  function addWater() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWaterMl((prev) => prev + WATER_STEP_ML);
  }

  function removeWater() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWaterMl((prev) => Math.max(0, prev - WATER_STEP_ML));
  }

  const plan = data ?? null;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Dieta</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : !plan ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="nutrition-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak planu diety</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Twój trener jeszcze nie przypisał Ci planu żywieniowego.
          </Text>
        </View>
      ) : (
        <>
          {/* Macro summary */}
          <View style={[styles.macroCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.planName}>{plan.name}</Text>
            {plan.totalCalories != null && (
              <View style={styles.macroRow}>
                <MacroChip label="Kcal" value={String(plan.totalCalories)} />
                {plan.protein != null && <MacroChip label="Białko" value={`${plan.protein}g`} />}
                {plan.carbs != null && <MacroChip label="Węgle" value={`${plan.carbs}g`} />}
                {plan.fat != null && <MacroChip label="Tłuszcz" value={`${plan.fat}g`} />}
              </View>
            )}
          </View>

          {/* Today's log */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dzisiejszy dziennik</Text>

          {/* Water tracker */}
          <View style={[styles.waterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.waterHeader}>
              <Ionicons name="water-outline" size={20} color="#2563eb" />
              <Text style={[styles.waterTitle, { color: colors.foreground }]}>Woda</Text>
              <Text style={[styles.waterValue, { color: colors.primary }]}>
                {(waterMl / 1000).toFixed(2).replace(/\.?0+$/, "")} L
              </Text>
            </View>
            <View style={styles.waterControls}>
              <Pressable
                onPress={removeWater}
                style={[styles.waterBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                testID="button-water-minus"
              >
                <Ionicons name="remove" size={18} color={colors.foreground} />
              </Pressable>
              <View style={styles.waterBarWrap}>
                <View
                  style={[
                    styles.waterBar,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <View
                    style={[
                      styles.waterFill,
                      {
                        backgroundColor: "#2563eb",
                        width: `${Math.min(100, (waterMl / 2500) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Pressable
                onPress={addWater}
                style={[styles.waterBtn, { backgroundColor: colors.primary }]}
                testID="button-water-plus"
              >
                <Ionicons name="add" size={18} color="#fff" />
              </Pressable>
            </View>
            <Text style={[styles.waterHint, { color: colors.mutedForeground }]}>
              +{WATER_STEP_ML}ml na kliknięcie
            </Text>
          </View>

          {/* Meal checkmarks */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posiłki</Text>
          {(plan.meals ?? [])
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((meal) => {
              const eaten = eatenMeals.has(meal.id);
              return (
                <View
                  key={meal.id}
                  style={[
                    styles.mealCard,
                    {
                      backgroundColor: eaten ? colors.primary + "10" : colors.card,
                      borderColor: eaten ? colors.primary + "50" : colors.border,
                    },
                  ]}
                >
                  <View style={styles.mealHeader}>
                    <View style={[styles.mealIcon, { backgroundColor: colors.primary + "1a" }]}>
                      <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text>
                      {meal.time && (
                        <Text style={[styles.mealTime, { color: colors.mutedForeground }]}>{meal.time}</Text>
                      )}
                    </View>
                    {meal.calories != null && (
                      <Text style={[styles.mealCal, { color: colors.primary }]}>{meal.calories} kcal</Text>
                    )}
                    <Pressable
                      onPress={() => toggleMeal(meal.id)}
                      style={[
                        styles.mealCheck,
                        {
                          backgroundColor: eaten ? colors.primary : "transparent",
                          borderColor: eaten ? colors.primary : colors.border,
                        },
                      ]}
                      testID={`button-meal-eaten-${meal.id}`}
                    >
                      {eaten && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </Pressable>
                  </View>
                  {meal.ingredients && (
                    <Text style={[styles.ingredients, { color: colors.mutedForeground }]}>
                      {meal.ingredients}
                    </Text>
                  )}
                  {meal.notes && (
                    <Text style={[styles.mealNotes, { color: colors.mutedForeground }]}>{meal.notes}</Text>
                  )}
                  {(meal.protein != null || meal.carbs != null || meal.fat != null) && (
                    <View style={styles.mealMacros}>
                      {meal.protein != null && <MacroSmall label="B" value={`${meal.protein}g`} color="#16a34a" />}
                      {meal.carbs != null && <MacroSmall label="W" value={`${meal.carbs}g`} color="#d97706" />}
                      {meal.fat != null && <MacroSmall label="T" value={`${meal.fat}g`} color="#7c3aed" />}
                    </View>
                  )}
                </View>
              );
            })}

          {/* Save log button */}
          <Pressable
            onPress={() => { if (plan) logMutation.mutate({ planId: plan.id }); }}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: logMutation.isPending ? 0.7 : 1 }]}
            disabled={logMutation.isPending}
            testID="button-save-diet-log"
          >
            {logMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Zapisz dziennik</Text>
              </>
            )}
          </Pressable>

          {/* Supplements */}
          {plan.supplements && plan.supplements.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Suplementy</Text>
              {plan.supplements.map((s) => (
                <View
                  key={s.id}
                  style={[styles.suppCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Ionicons name="flask-outline" size={18} color={colors.primary} />
                  <View style={styles.suppInfo}>
                    <Text style={[styles.suppName, { color: colors.foreground }]}>{s.name}</Text>
                    {s.dosage && (
                      <Text style={[styles.suppDetail, { color: colors.mutedForeground }]}>{s.dosage}</Text>
                    )}
                    {s.timing && (
                      <Text style={[styles.suppDetail, { color: colors.mutedForeground }]}>{s.timing}</Text>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function MacroChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={chipStyles.wrap}>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={chipStyles.value}>{value}</Text>
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
  wrap: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  label: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "Inter_500Medium" },
  value: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});

const smallStyles = StyleSheet.create({
  wrap: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 16 },
  loader: { marginTop: 40 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  macroCard: { borderRadius: 16, padding: 20, marginBottom: 24, gap: 14 },
  planName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  macroRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  waterCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  waterHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  waterTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waterValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  waterControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  waterBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  waterBarWrap: { flex: 1 },
  waterBar: { height: 10, borderRadius: 5, overflow: "hidden" },
  waterFill: { height: "100%", borderRadius: 5 },
  waterHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  mealCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10, gap: 10 },
  mealHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  mealTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mealCal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  mealCheck: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  ingredients: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  mealNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  mealMacros: { flexDirection: "row", gap: 8 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginVertical: 16,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  suppCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  suppInfo: { flex: 1, gap: 2 },
  suppName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  suppDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
