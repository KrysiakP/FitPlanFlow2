import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const LABELS: Record<number, string> = { 1: "bardzo lekki", 5: "umiarkowany", 8: "ciężki", 10: "maksymalny" };

/** "How hard was it?" after a finished workout, 1-10. Optional: skipping saves the workout without a rating. */
export function RpeModal({ visible, onPick }: { visible: boolean; onPick: (rpe: number | undefined) => void }) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onPick(undefined)}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} testID="modal-rpe">
          <Text style={[styles.title, { color: colors.foreground }]}>Jak ciężki był ten trening?</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>1 = bardzo lekki, 10 = maksymalny wysiłek. Trener zobaczy Twoją ocenę.</Text>
          <View style={styles.grid}>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
              <Pressable
                key={value}
                onPress={() => onPick(value)}
                accessibilityRole="button"
                accessibilityLabel={`Ocena ${value}${LABELS[value] ? `, ${LABELS[value]}` : ""}`}
                style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.background }]}
                testID={`button-rpe-${value}`}
              >
                <Text style={[styles.chipText, { color: colors.foreground }]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => onPick(undefined)} style={styles.skip} accessibilityRole="button" testID="button-rpe-skip">
            <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: "Inter_500Medium" }}>Pomiń</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  sheet: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { width: 52, height: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  skip: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 16 },
});
