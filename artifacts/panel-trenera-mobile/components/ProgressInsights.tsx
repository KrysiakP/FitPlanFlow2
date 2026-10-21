import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  type InsightReport,
  type InsightSession,
  weekWord,
  weeklyStreak,
  weightSeries,
  workoutsThisWeek,
} from "@/lib/progressInsights";

export function ProgressInsights({ sessions, reports }: { sessions: InsightSession[]; reports: InsightReport[] }) {
  const colors = useColors();
  const streak = weeklyStreak(sessions);
  const thisWeek = workoutsThisWeek(sessions);
  const series = weightSeries(reports);

  const min = Math.min(...series.map((p) => p.kg));
  const max = Math.max(...series.map((p) => p.kg));
  const range = Math.max(max - min, 1);
  const delta = series.length > 1 ? series[series.length - 1].kg - series[0].kg : 0;

  return (
    <View style={{ gap: 12, marginBottom: 20 }}>
      <View style={styles.statRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID="stat-streak">
          <Ionicons name="flame-outline" size={20} color="#f59e0b" />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{streak}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            {streak > 0 ? `${weekWord(streak)} z rzędu` : "seria tygodni"}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID="stat-this-week">
          <Ionicons name="barbell-outline" size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{thisWeek}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>w tym tygodniu</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID="stat-total">
          <Ionicons name="checkmark-done-outline" size={20} color="#10b981" />
          <Text style={[styles.statValue, { color: colors.foreground }]}>{sessions.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>treningów łącznie</Text>
        </View>
      </View>

      {series.length >= 2 && (
        <View style={[styles.weightCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID="card-weight-trend">
          <View style={styles.weightHeader}>
            <Text style={[styles.weightTitle, { color: colors.foreground }]}>Waga</Text>
            <Text
              style={[styles.weightDelta, { color: colors.mutedForeground }]}
              accessibilityLabel={`Zmiana wagi od pierwszego raportu: ${delta.toFixed(1)} kilogramów`}
            >
              {delta === 0 ? "bez zmian" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} kg od początku`}
            </Text>
          </View>
          <View style={styles.bars} accessibilityRole="image" accessibilityLabel="Wykres wagi z ostatnich raportów">
            {series.map((point) => {
              const height = 18 + ((point.kg - min) / range) * 52;
              const isLast = point === series[series.length - 1];
              return (
                <View key={point.date.getTime()} style={styles.barCol}>
                  <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{point.kg.toFixed(1)}</Text>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: isLast ? colors.primary : colors.primary + "55" },
                    ]}
                  />
                  <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                    {point.date.toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" })}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 2 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center" },
  weightCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  weightHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  weightTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  weightDelta: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6, height: 110 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  bar: { width: "70%", borderRadius: 6 },
  barValue: { fontSize: 10, fontFamily: "Inter_500Medium" },
  barLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
