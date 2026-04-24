import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

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

interface DietAssignment {
  plan?: DietPlan | null;
}

export default function DietScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, sessionCookie } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<DietAssignment>({
    queryKey: ["diet-plan", user?.id],
    queryFn: () => apiGet<DietAssignment>(`/api/diet-assignment/${user?.id}`, sessionCookie),
    enabled: !!user?.id,
    retry: 1,
  });

  const plan = data?.plan;

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

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posiłki</Text>
          {(plan.meals ?? [])
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((meal) => (
              <View key={meal.id} style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.mealHeader}>
                  <View style={[styles.mealIcon, { backgroundColor: colors.primary + "1a" }]}>
                    <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text>
                    {meal.time && <Text style={[styles.mealTime, { color: colors.mutedForeground }]}>{meal.time}</Text>}
                  </View>
                  {meal.calories != null && (
                    <Text style={[styles.mealCal, { color: colors.primary }]}>{meal.calories} kcal</Text>
                  )}
                </View>
                {meal.ingredients && (
                  <Text style={[styles.ingredients, { color: colors.mutedForeground }]}>{meal.ingredients}</Text>
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
            ))}

          {plan.supplements && plan.supplements.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Suplementy</Text>
              {plan.supplements.map((s) => (
                <View key={s.id} style={[styles.suppCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="flask-outline" size={18} color={colors.primary} />
                  <View style={styles.suppInfo}>
                    <Text style={[styles.suppName, { color: colors.foreground }]}>{s.name}</Text>
                    {s.dosage && <Text style={[styles.suppDetail, { color: colors.mutedForeground }]}>{s.dosage}</Text>}
                    {s.timing && <Text style={[styles.suppDetail, { color: colors.mutedForeground }]}>{s.timing}</Text>}
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
  mealCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10, gap: 10 },
  mealHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  mealIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  mealTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mealCal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ingredients: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  mealNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  mealMacros: { flexDirection: "row", gap: 8 },
  suppCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  suppInfo: { flex: 1, gap: 2 },
  suppName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  suppDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
