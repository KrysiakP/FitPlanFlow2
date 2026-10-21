import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface PersonalRecordInfo {
  exercise: string;
  estimatedOneRepMax: number | null;
  previousBest: number | null;
}

const formatKg = (kg: number) => `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(1)} kg`;

/** A short celebration shown after a personal record; hides itself after a few seconds. */
export function RecordToast({ record, onHide }: { record: PersonalRecordInfo | null; onHide: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!record) return;
    const timer = setTimeout(onHide, 5000);
    return () => clearTimeout(timer);
  }, [record, onHide]);

  if (!record) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { top: insets.top + 8 }]}
      testID="toast-personal-record"
    >
      <Ionicons name="trophy" size={22} color="#fbbf24" />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Nowy rekord! {record.exercise}</Text>
        {record.estimatedOneRepMax !== null && (
          <Text style={styles.subtitle}>
            Szacowany max: {formatKg(record.estimatedOneRepMax)}
            {record.previousBest !== null ? ` (było ${formatKg(record.previousBest)})` : ""}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#1e3a8a",
    zIndex: 1000,
    elevation: 8,
  },
  title: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
});
