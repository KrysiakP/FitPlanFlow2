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

interface TrainingPlan {
  id: string;
  name: string;
  description?: string | null;
  workouts?: { id: string; name: string }[];
}

export default function TrainerPlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, bearerToken } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<TrainingPlan[]>({
    queryKey: ["training-plans"],
    queryFn: () => apiGet<TrainingPlan[]>("/api/training-plans", bearerToken),
    enabled: !!user?.id,
  });

  const plans = data ?? [];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Plany treningowe</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primary + "1a" }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{plans.length}</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : plans.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="clipboard-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak planów</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Utwórz pierwszy plan treningowy na stronie paneltrenera.pl
          </Text>
        </View>
      ) : (
        plans.map((plan) => (
          <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.planHeader}>
              <View style={[styles.planIcon, { backgroundColor: colors.primary + "1a" }]}>
                <Ionicons name="barbell-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                {plan.description && (
                  <Text style={[styles.planDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {plan.description}
                  </Text>
                )}
              </View>
            </View>
            {plan.workouts && plan.workouts.length > 0 && (
              <View style={styles.workoutsList}>
                {plan.workouts.map((w, i) => (
                  <View key={w.id} style={[styles.workoutChip, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.workoutChipText, { color: colors.mutedForeground }]}>
                      {i + 1}. {w.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <View style={[styles.planFooter, { borderTopColor: colors.border }]}>
              <Ionicons name="layers-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.planFooterText, { color: colors.mutedForeground }]}>
                {plan.workouts?.length ?? 0} treningów
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  loader: { marginTop: 40 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  planCard: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  planIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  planDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  workoutsList: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingBottom: 12 },
  workoutChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  workoutChipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  planFooter: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  planFooterText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
