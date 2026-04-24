import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ExerciseItemProps {
  name: string;
  sets?: number | null;
  reps?: string | null;
  weight?: string | null;
  restTime?: number | null;
  notes?: string | null;
  index: number;
}

export function ExerciseItem({ name, sets, reps, weight, restTime, notes, index }: ExerciseItemProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.number, { backgroundColor: colors.primary }]}>
        <Text style={[styles.numberText, { color: colors.primaryForeground }]}>{index + 1}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
        <View style={styles.tags}>
          {sets != null && (
            <View style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Ionicons name="repeat-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{sets} serie</Text>
            </View>
          )}
          {reps && (
            <View style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Ionicons name="flash-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{reps} pow.</Text>
            </View>
          )}
          {weight && (
            <View style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Ionicons name="barbell-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{weight}</Text>
            </View>
          )}
          {restTime != null && (
            <View style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Ionicons name="timer-outline" size={11} color={colors.mutedForeground} />
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{restTime}s</Text>
            </View>
          )}
        </View>
        {notes && <Text style={[styles.notes, { color: colors.mutedForeground }]}>{notes}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  numberText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  content: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  notes: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    lineHeight: 16,
  },
});
