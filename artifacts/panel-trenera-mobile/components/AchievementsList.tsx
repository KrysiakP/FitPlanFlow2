import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  progress: number;
  current: number;
  target: number;
}

/** Milestones computed by the server from the client's own history: earned ones first, the others with a progress bar. */
export function AchievementsList() {
  const colors = useColors();
  const { data } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => apiGet<{ achievements: Achievement[]; earned: number }>("/api/client/achievements"),
    staleTime: 1000 * 60 * 5,
  });
  if (!data) return null;
  const sorted = [...data.achievements].sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress - a.progress);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="card-achievements">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Osiągnięcia</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {data.earned} z {data.achievements.length}
        </Text>
      </View>
      {sorted.map((item) => (
        <View key={item.id} style={styles.row} testID={`achievement-${item.id}`} accessible accessibilityLabel={`${item.title}, ${item.earned ? "zdobyte" : `${item.current} z ${item.target}`}`}>
          <Ionicons name={item.earned ? "ribbon" : "lock-closed-outline"} size={20} color={item.earned ? colors.primary : colors.mutedForeground} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>{item.description}</Text>
            {!item.earned && (
              <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View style={[styles.fill, { width: `${Math.round(item.progress * 100)}%`, backgroundColor: colors.primary }]} />
              </View>
            )}
          </View>
          {!item.earned && (
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {item.current}/{item.target}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  count: { fontSize: 12, fontFamily: "Inter_500Medium" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  track: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  fill: { height: 5, borderRadius: 3 },
});
