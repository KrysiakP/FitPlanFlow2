import {
  ActivityIndicator,
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
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  dayOfWeek?: number | null;
}

interface DietPlan {
  id: string;
  name: string;
  mode: string | null;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  meals: Meal[];
}

interface MealCheckmark {
  mealId: string;
  completed: boolean;
  eatenCalories?: number | null;
  eatenProtein?: number | null;
  eatenFat?: number | null;
  eatenCarbs?: number | null;
}

interface TodayLog {
  id: string;
  waterLiters: string | number;
  actualCalories?: number | null;
  actualProtein?: number | null;
  actualFat?: number | null;
  actualCarbs?: number | null;
  checkmarks: MealCheckmark[];
}

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

const PL_MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const DAYS = [
  { value: 1, short: "Pn", label: "Poniedziałek" },
  { value: 2, short: "Wt", label: "Wtorek" },
  { value: 3, short: "Śr", label: "Środa" },
  { value: 4, short: "Cz", label: "Czwartek" },
  { value: 5, short: "Pt", label: "Piątek" },
  { value: 6, short: "So", label: "Sobota" },
  { value: 7, short: "Nd", label: "Niedziela" },
];

function getMondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDates(): Record<number, Date> {
  const monday = getMondayOfCurrentWeek();
  const result: Record<number, Date> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result[i + 1] = d;
  }
  return result;
}

function getTodayDow(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

const WEEK_DATES = getWeekDates();
const WATER_STEP_ML = 250;

function toNum(s: string): number | null {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function DietScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // ---- shared state ----
  const [waterMl, setWaterMl] = useState(0);
  const [savedOk, setSavedOk] = useState(false);

  // ---- macro_only state ----
  const [dailyKcal, setDailyKcal] = useState("");
  const [dailyProtein, setDailyProtein] = useState("");
  const [dailyFat, setDailyFat] = useState("");
  const [dailyCarbs, setDailyCarbs] = useState("");

  // ---- full_plan state ----
  const [activeDay, setActiveDay] = useState(getTodayDow());
  // mealState: mealId -> { checked, kcal, protein, fat, carbs, expanded }
  const [mealState, setMealState] = useState<Record<string, {
    checked: boolean; expanded: boolean;
    kcal: string; protein: string; fat: string; carbs: string;
  }>>({});

  // ---- queries ----
  const { data: plan, isLoading: planLoading, refetch, isRefetching } = useQuery<DietPlan | null>({
    queryKey: ["client-diet-plan"],
    queryFn: async () => {
      try { return await apiGet<DietPlan>("/api/client/diet"); }
      catch { return null; }
    },
    retry: false,
  });

  const { data: todayLog } = useQuery<TodayLog | null>({
    queryKey: ["client-diet-today"],
    queryFn: async () => {
      try { return await apiGet<TodayLog | null>("/api/client/diet/today"); }
      catch { return null; }
    },
    enabled: !!plan,
  });

  // Pre-fill form from today's existing log
  useEffect(() => {
    if (!todayLog) return;
    setWaterMl(Math.round(Number(todayLog.waterLiters ?? 0) * 1000));
    if (todayLog.actualCalories != null) setDailyKcal(String(todayLog.actualCalories));
    if (todayLog.actualProtein != null) setDailyProtein(String(todayLog.actualProtein));
    if (todayLog.actualFat != null) setDailyFat(String(todayLog.actualFat));
    if (todayLog.actualCarbs != null) setDailyCarbs(String(todayLog.actualCarbs));

    if (todayLog.checkmarks?.length) {
      setMealState((prev) => {
        const next = { ...prev };
        for (const cm of todayLog.checkmarks) {
          next[cm.mealId] = {
            ...(next[cm.mealId] ?? { expanded: false }),
            checked: cm.completed,
            kcal: cm.eatenCalories != null ? String(cm.eatenCalories) : (next[cm.mealId]?.kcal ?? ""),
            protein: cm.eatenProtein != null ? String(cm.eatenProtein) : (next[cm.mealId]?.protein ?? ""),
            fat: cm.eatenFat != null ? String(cm.eatenFat) : (next[cm.mealId]?.fat ?? ""),
            carbs: cm.eatenCarbs != null ? String(cm.eatenCarbs) : (next[cm.mealId]?.carbs ?? ""),
            expanded: next[cm.mealId]?.expanded ?? false,
          };
        }
        return next;
      });
    }
  }, [todayLog]);

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error("no plan");
      const today = new Date().toISOString().split("T")[0];

      // Build mealCheckmarks from full_plan state
      const checkmarks = Object.entries(mealState).map(([mealId, s]) => ({
        mealId,
        completed: s.checked,
        eatenCalories: toNum(s.kcal),
        eatenProtein: toNum(s.protein),
        eatenFat: toNum(s.fat),
        eatenCarbs: toNum(s.carbs),
      }));

      // For full_plan: sum up all meal macros as daily totals if not set manually
      let actualKcal = toNum(dailyKcal);
      let actualProtein = toNum(dailyProtein);
      let actualFat = toNum(dailyFat);
      let actualCarbs = toNum(dailyCarbs);

      if (plan.mode === "full_plan") {
        const sumKcal = checkmarks.reduce((a, c) => a + (c.eatenCalories ?? 0), 0);
        const sumProtein = checkmarks.reduce((a, c) => a + (c.eatenProtein ?? 0), 0);
        const sumFat = checkmarks.reduce((a, c) => a + (c.eatenFat ?? 0), 0);
        const sumCarbs = checkmarks.reduce((a, c) => a + (c.eatenCarbs ?? 0), 0);
        if (sumKcal > 0) actualKcal = sumKcal;
        if (sumProtein > 0) actualProtein = sumProtein;
        if (sumFat > 0) actualFat = sumFat;
        if (sumCarbs > 0) actualCarbs = sumCarbs;
      }

      return apiPost("/api/client/diet/log", {
        planId: plan.id,
        date: today,
        waterLiters: waterMl / 1000,
        actualCalories: actualKcal,
        actualProtein: actualProtein,
        actualFat: actualFat,
        actualCarbs: actualCarbs,
        mealCheckmarks: plan.mode === "full_plan" ? checkmarks : [],
      });
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
      void queryClient.invalidateQueries({ queryKey: ["client-diet-today"] });
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  // ---- helpers ----
  const toggleMeal = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMealState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { kcal: "", protein: "", fat: "", carbs: "", expanded: false }), checked: !prev[id]?.checked },
    }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMealState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { kcal: "", protein: "", fat: "", carbs: "", checked: false }), expanded: !prev[id]?.expanded },
    }));
  }, []);

  const setMealField = useCallback((id: string, field: "kcal" | "protein" | "fat" | "carbs", value: string) => {
    setMealState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { kcal: "", protein: "", fat: "", carbs: "", checked: false, expanded: true }), [field]: value },
    }));
  }, []);

  // ---- computed ----
  const dayMeals = (plan?.meals ?? [])
    .filter((m) => m.dayOfWeek == null || m.dayOfWeek === activeDay)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const loggedKcal = Object.values(mealState).reduce((a, s) => a + (toNum(s.kcal) ?? 0), 0);
  const loggedProtein = Object.values(mealState).reduce((a, s) => a + (toNum(s.protein) ?? 0), 0);
  const loggedFat = Object.values(mealState).reduce((a, s) => a + (toNum(s.fat) ?? 0), 0);
  const loggedCarbs = Object.values(mealState).reduce((a, s) => a + (toNum(s.carbs) ?? 0), 0);

  if (planLoading) {
    return (
      <View style={[styles.root, styles.centerContent, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!plan) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Dieta</Text>
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="nutrition-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak planu diety</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Twój trener jeszcze nie przypisał Ci planu żywieniowego.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const isMacroOnly = plan.mode !== "full_plan";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Dieta</Text>

      {/* Header card */}
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={[styles.modePill, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons name={isMacroOnly ? "bar-chart-outline" : "restaurant-outline"} size={12} color="#fff" />
            <Text style={styles.modePillText}>{isMacroOnly ? "Tylko makro" : "Pełna dieta"}</Text>
          </View>
        </View>
        <Text style={styles.headerLabel}>Dzienny cel</Text>
        <View style={styles.macroRow}>
          <MacroChip label="Kcal" value={String(plan.targetCalories)} />
          <MacroChip label="Białko" value={`${plan.targetProtein}g`} />
          <MacroChip label="Tłuszcz" value={`${plan.targetFat}g`} />
          <MacroChip label="Węgle" value={`${plan.targetCarbs}g`} />
        </View>
      </View>

      {/* ================================================================
          MACRO_ONLY MODE — daily intake form
      ================================================================= */}
      {isMacroOnly && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Co zjadłeś dziś?</Text>
          <View style={[styles.intakeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MacroInputRow
              label="Kalorie"
              unit="kcal"
              value={dailyKcal}
              onChange={setDailyKcal}
              target={plan.targetCalories}
              color={colors.primary}
              colors={colors}
            />
            <MacroInputRow
              label="Białko"
              unit="g"
              value={dailyProtein}
              onChange={setDailyProtein}
              target={plan.targetProtein}
              color="#16a34a"
              colors={colors}
            />
            <MacroInputRow
              label="Tłuszcz"
              unit="g"
              value={dailyFat}
              onChange={setDailyFat}
              target={plan.targetFat}
              color="#7c3aed"
              colors={colors}
            />
            <MacroInputRow
              label="Węgle"
              unit="g"
              value={dailyCarbs}
              onChange={setDailyCarbs}
              target={plan.targetCarbs}
              color="#d97706"
              colors={colors}
              isLast
            />
          </View>
        </>
      )}

      {/* ================================================================
          FULL_PLAN MODE — day tabs + meal list
      ================================================================= */}
      {!isMacroOnly && (
        <>
          {/* Running totals progress */}
          {loggedKcal > 0 && (
            <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: colors.foreground }]}>Podsumowanie dnia</Text>
                <Text style={[styles.progressTotal, { color: colors.primary }]}>{loggedKcal} kcal</Text>
              </View>
              <MacroBar label="Białko" eaten={loggedProtein} target={plan.targetProtein} color="#16a34a" colors={colors} />
              <MacroBar label="Tłuszcz" eaten={loggedFat} target={plan.targetFat} color="#7c3aed" colors={colors} />
              <MacroBar label="Węgle" eaten={loggedCarbs} target={plan.targetCarbs} color="#d97706" colors={colors} />
            </View>
          )}

          {/* Day tabs */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posiłki</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs} contentContainerStyle={{ gap: 8 }}>
            {DAYS.map((d) => {
              const active = activeDay === d.value;
              const isToday = d.value === getTodayDow();
              const dateNum = WEEK_DATES[d.value]?.getDate();
              const hasLog = (plan.meals ?? [])
                .filter((m) => m.dayOfWeek == null || m.dayOfWeek === d.value)
                .some((m) => mealState[m.id]?.checked || toNum(mealState[m.id]?.kcal ?? "") != null);
              return (
                <Pressable
                  key={d.value}
                  onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveDay(d.value); }}
                  style={[
                    styles.dayTab,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : isToday ? colors.primary + "60" : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dayTabShort, { color: active ? "#fff" : isToday ? colors.primary : colors.mutedForeground }]}>
                    {d.short}
                  </Text>
                  <Text style={[styles.dayTabDate, { color: active ? "rgba(255,255,255,0.75)" : isToday ? colors.primary : colors.mutedForeground + "80" }]}>
                    {dateNum}
                  </Text>
                  {hasLog && (
                    <View style={[styles.dayDot, { backgroundColor: active ? "#fff" : colors.primary }]} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Meal cards */}
          {dayMeals.length === 0 ? (
            <View style={[styles.emptyMeals, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="restaurant-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyMealsText, { color: colors.mutedForeground }]}>
                Brak posiłków na ten dzień
              </Text>
            </View>
          ) : (
            dayMeals.map((meal) => {
              const ms = mealState[meal.id] ?? { checked: false, expanded: false, kcal: "", protein: "", fat: "", carbs: "" };
              const hasEaten = ms.kcal || ms.protein || ms.fat || ms.carbs;
              return (
                <View
                  key={meal.id}
                  style={[
                    styles.mealCard,
                    {
                      backgroundColor: ms.checked ? colors.primary + "0d" : colors.card,
                      borderColor: ms.checked ? colors.primary + "50" : colors.border,
                    },
                  ]}
                >
                  {/* Meal header */}
                  <View style={styles.mealHeader}>
                    <Pressable
                      onPress={() => toggleMeal(meal.id)}
                      style={[
                        styles.mealCheck,
                        {
                          backgroundColor: ms.checked ? colors.primary : "transparent",
                          borderColor: ms.checked ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {ms.checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </Pressable>
                    <View style={styles.mealInfo}>
                      <Text style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text>
                      {meal.time && (
                        <Text style={[styles.mealTime, { color: colors.mutedForeground }]}>{meal.time}</Text>
                      )}
                    </View>
                    {meal.calories != null && (
                      <Text style={[styles.mealTargetKcal, { color: colors.mutedForeground }]}>cel: {meal.calories} kcal</Text>
                    )}
                    <Pressable
                      onPress={() => toggleExpand(meal.id)}
                      style={[styles.expandBtn, { backgroundColor: (ms.expanded || hasEaten) ? colors.primary + "15" : colors.accent }]}
                    >
                      <Ionicons
                        name={ms.expanded ? "chevron-up" : "pencil-outline"}
                        size={15}
                        color={(ms.expanded || hasEaten) ? colors.primary : colors.mutedForeground}
                      />
                    </Pressable>
                  </View>

                  {/* Ingredients & notes */}
                  {meal.ingredients && (
                    <Text style={[styles.ingredients, { color: colors.mutedForeground }]}>{meal.ingredients}</Text>
                  )}
                  {meal.notes && (
                    <Text style={[styles.mealNotes, { color: colors.mutedForeground }]}>{meal.notes}</Text>
                  )}

                  {/* Target macros */}
                  {(meal.protein != null || meal.carbs != null || meal.fat != null) && (
                    <View style={styles.targetMacros}>
                      {meal.protein != null && <MacroSmall label="B" value={`${meal.protein}g`} color="#16a34a" />}
                      {meal.carbs != null && <MacroSmall label="W" value={`${meal.carbs}g`} color="#d97706" />}
                      {meal.fat != null && <MacroSmall label="T" value={`${meal.fat}g`} color="#7c3aed" />}
                    </View>
                  )}

                  {/* Eaten intake (expandable) */}
                  {ms.expanded && (
                    <View style={[styles.intakeExpanded, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={[styles.intakeExpandedTitle, { color: colors.mutedForeground }]}>Co zjadłeś?</Text>
                      <View style={styles.intakeGrid}>
                        <MiniInput label="Kcal" value={ms.kcal} onChange={(v) => setMealField(meal.id, "kcal", v)} colors={colors} />
                        <MiniInput label="Białko (g)" value={ms.protein} onChange={(v) => setMealField(meal.id, "protein", v)} colors={colors} />
                        <MiniInput label="Tłuszcz (g)" value={ms.fat} onChange={(v) => setMealField(meal.id, "fat", v)} colors={colors} />
                        <MiniInput label="Węgle (g)" value={ms.carbs} onChange={(v) => setMealField(meal.id, "carbs", v)} colors={colors} />
                      </View>
                    </View>
                  )}

                  {/* Compact eaten summary when not expanded */}
                  {!ms.expanded && hasEaten && (
                    <View style={styles.eatenSummary}>
                      {ms.kcal ? <MacroSmall label="Kcal" value={ms.kcal} color={colors.primary} /> : null}
                      {ms.protein ? <MacroSmall label="B" value={`${ms.protein}g`} color="#16a34a" /> : null}
                      {ms.fat ? <MacroSmall label="T" value={`${ms.fat}g`} color="#7c3aed" /> : null}
                      {ms.carbs ? <MacroSmall label="W" value={`${ms.carbs}g`} color="#d97706" /> : null}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </>
      )}

      {/* ================================================================
          WATER TRACKER (both modes)
      ================================================================= */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nawodnienie</Text>
      <View style={[styles.waterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.waterHeader}>
          <Ionicons name="water-outline" size={20} color="#2563eb" />
          <Text style={[styles.waterTitle, { color: colors.foreground }]}>Woda</Text>
          <Text style={[styles.waterValue, { color: "#2563eb" }]}>
            {(waterMl / 1000).toFixed(2).replace(/\.?0+$/, "")} L
          </Text>
        </View>
        <View style={styles.waterControls}>
          <Pressable
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWaterMl((p) => Math.max(0, p - WATER_STEP_ML)); }}
            style={[styles.waterBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="remove" size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.waterBarWrap}>
            <View style={[styles.waterBar, { backgroundColor: colors.accent }]}>
              <View style={[styles.waterFill, { width: `${Math.min(100, (waterMl / 2500) * 100)}%` }]} />
            </View>
          </View>
          <Pressable
            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWaterMl((p) => p + WATER_STEP_ML); }}
            style={[styles.waterBtn, { backgroundColor: "#2563eb" }]}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </View>
        <Text style={[styles.waterHint, { color: colors.mutedForeground }]}>+{WATER_STEP_ML}ml na kliknięcie</Text>
      </View>

      {/* ================================================================
          SAVE BUTTON
      ================================================================= */}
      <Pressable
        onPress={() => logMutation.mutate()}
        disabled={logMutation.isPending}
        style={[
          styles.saveBtn,
          {
            backgroundColor: savedOk ? "#16a34a" : colors.primary,
            opacity: logMutation.isPending ? 0.7 : 1,
          },
        ]}
        testID="button-save-diet-log"
      >
        {logMutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : savedOk ? (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Zapisano!</Text>
          </>
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveBtnText}>Zapisz dziennik</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function MacroBar({
  label, eaten, target, color, colors,
}: { label: string; eaten: number; target: number; color: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const pct = target > 0 ? Math.min(100, (eaten / target) * 100) : 0;
  return (
    <View style={barStyles.row}>
      <Text style={[barStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[barStyles.track, { backgroundColor: colors.accent }]}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[barStyles.nums, { color: colors.foreground }]}>{eaten}<Text style={{ color: colors.mutedForeground }}>/{target}g</Text></Text>
    </View>
  );
}

function MacroInputRow({
  label, unit, value, onChange, target, color, colors, isLast,
}: {
  label: string; unit: string; value: string; onChange: (v: string) => void;
  target: number; color: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  isLast?: boolean;
}) {
  const num = toNum(value);
  const pct = num != null && target > 0 ? Math.min(100, (num / target) * 100) : 0;
  const over = num != null && num > target;
  return (
    <View style={[inputRowStyles.wrap, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={inputRowStyles.top}>
        <Text style={[inputRowStyles.label, { color: colors.foreground }]}>{label}</Text>
        <View style={inputRowStyles.inputWrap}>
          <TextInput
            value={value}
            onChangeText={onChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            style={[inputRowStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Text style={[inputRowStyles.unit, { color: colors.mutedForeground }]}>{unit}</Text>
        </View>
        <Text style={[inputRowStyles.target, { color: colors.mutedForeground }]}>/ {target}{unit}</Text>
      </View>
      <View style={[inputRowStyles.track, { backgroundColor: colors.accent }]}>
        <View style={[inputRowStyles.fill, { width: `${pct}%`, backgroundColor: over ? "#ef4444" : color }]} />
      </View>
    </View>
  );
}

function MiniInput({
  label, value, onChange, colors,
}: { label: string; value: string; onChange: (v: string) => void; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <View style={miniStyles.wrap}>
      <Text style={[miniStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="–"
        placeholderTextColor={colors.mutedForeground + "80"}
        style={[miniStyles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const chipStyles = StyleSheet.create({
  wrap: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flex: 1 },
  label: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "Inter_500Medium" },
  value: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});

const smallStyles = StyleSheet.create({
  wrap: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 12, fontFamily: "Inter_500Medium" },
});

const barStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", width: 50 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  nums: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 60, textAlign: "right" },
});

const inputRowStyles = StyleSheet.create({
  wrap: { paddingVertical: 12, gap: 8 },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 16, fontFamily: "Inter_700Bold", width: 80, textAlign: "center" },
  unit: { fontSize: 13, fontFamily: "Inter_500Medium" },
  target: { fontSize: 13, fontFamily: "Inter_400Regular", minWidth: 60, textAlign: "right" },
  track: { height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});

const miniStyles = StyleSheet.create({
  wrap: { flex: 1, gap: 4 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 16 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  // Header card
  headerCard: { borderRadius: 16, padding: 20, marginBottom: 20, gap: 10 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  planName: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  modePill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  modePillText: { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  headerLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  macroRow: { flexDirection: "row", gap: 8 },

  // Section
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },

  // Intake card (macro_only)
  intakeCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, marginBottom: 20 },

  // Progress card (full_plan)
  progressCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, gap: 2 },
  progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  progressTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressTotal: { fontSize: 18, fontFamily: "Inter_700Bold" },

  // Day tabs
  dayTabs: { marginBottom: 16 },
  dayTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flexDirection: "column", alignItems: "center", gap: 2, minWidth: 44 },
  dayTabShort: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dayTabDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dayDot: { width: 5, height: 5, borderRadius: 3 },

  // Meal cards
  emptyMeals: { borderRadius: 12, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginBottom: 16 },
  emptyMealsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  mealCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  mealHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  mealCheck: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  mealTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mealTargetKcal: { fontSize: 12, fontFamily: "Inter_400Regular" },
  expandBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  ingredients: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, paddingHorizontal: 14, paddingBottom: 6, color: "#666" },
  mealNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic", paddingHorizontal: 14, paddingBottom: 6 },
  targetMacros: { flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingBottom: 10 },
  eatenSummary: { flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingBottom: 12, flexWrap: "wrap" },
  intakeExpanded: { borderTopWidth: 1, padding: 14, gap: 10 },
  intakeExpandedTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  intakeGrid: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  // Water
  waterCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  waterHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  waterTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waterValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  waterControls: { flexDirection: "row", alignItems: "center", gap: 10 },
  waterBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  waterBarWrap: { flex: 1 },
  waterBar: { height: 10, borderRadius: 5, overflow: "hidden" },
  waterFill: { height: "100%", borderRadius: 5, backgroundColor: "#2563eb" },
  waterHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },

  // Save
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
