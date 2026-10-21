import { useState } from "react";
import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface StrengthPoint {
  date: string; // YYYY-MM-DD
  estimatedOneRepMax: number;
  bestLoad: number;
}

export interface StrengthHistory {
  exercise: string;
  points: StrengthPoint[];
  best: number;
  latest: number;
  change: number | null;
}

const kg = (value: number) => `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} kg`;

/** Estimated one-rep max over time, one exercise at a time. Needs at least two training days to draw a trend. */
export function StrengthProgress({ history }: { history: StrengthHistory[] }) {
  const colors = useColors();
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const charted = history.filter((item) => item.points.length >= 2);
  if (charted.length === 0) return null;

  const selected = charted.find((item) => item.exercise === selectedName) ?? charted[0];
  const values = selected.points.map((p) => p.estimatedOneRepMax);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="card-strength-progress">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Siła</Text>
        {selected.change !== null && (
          <Text
            style={[styles.change, { color: selected.change >= 0 ? "#10b981" : colors.mutedForeground }]}
            accessibilityLabel={`Zmiana szacowanego maksimum: ${selected.change.toFixed(1)} kilogramów`}
          >
            {selected.change >= 0 ? "+" : "−"}
            {kg(Math.abs(selected.change))} od początku
          </Text>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {charted.map((item) => {
          const active = item.exercise === selected.exercise;
          return (
            <Pressable
              key={item.exercise}
              onPress={() => setSelectedName(item.exercise)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
              testID={`chip-strength-${item.exercise}`}
            >
              <Text style={{ color: active ? "#fff" : colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{item.exercise}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.bars} accessibilityRole="image" accessibilityLabel={`Wykres siły: ${selected.exercise}`}>
        {selected.points.map((point, index) => {
          const height = 16 + ((point.estimatedOneRepMax - min) / range) * 56;
          const isLast = index === selected.points.length - 1;
          return (
            <View key={point.date} style={styles.barCol}>
              <Text style={[styles.barValue, { color: colors.mutedForeground }]}>{Math.round(point.estimatedOneRepMax)}</Text>
              <View style={[styles.bar, { height, backgroundColor: isLast ? colors.primary : colors.primary + "55" }]} />
              <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                {new Date(`${point.date}T12:00:00`).toLocaleDateString("pl-PL", { day: "numeric", month: "numeric" })}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
        Szacowane maksimum na jedno powtórzenie · rekord: {kg(selected.best)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  change: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  chips: { gap: 8, paddingBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 112 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  bar: { width: "75%", borderRadius: 5 },
  barValue: { fontSize: 10, fontFamily: "Inter_500Medium" },
  barLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  footnote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8 },
});
