import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";

export interface OnboardingStep {
  key: string;
  title: string;
  hint: string;
  done: boolean;
  onPress: () => void;
}

const DISMISSED_KEY = "pt_onboarding_dismissed";

/** First steps for a new trainer. Disappears once everything is done, or when the trainer hides it. */
export function OnboardingChecklist({ steps, ready }: { steps: OnboardingStep[]; ready: boolean }) {
  const colors = useColors();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => setDismissed(value === "1"))
      .catch(() => setDismissed(false));
  }, []);

  const doneCount = steps.filter((s) => s.done).length;
  if (!ready || dismissed === null || dismissed || doneCount === steps.length) return null;

  const hide = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, "1").catch(() => {});
  };
  const nextKey = steps.find((s) => !s.done)?.key;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="card-onboarding">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Pierwsze kroki</Text>
          <Text style={[styles.progress, { color: colors.mutedForeground }]}>
            {doneCount} z {steps.length} gotowe
          </Text>
        </View>
        <Pressable onPress={hide} hitSlop={10} accessibilityRole="button" accessibilityLabel="Ukryj pierwsze kroki" testID="button-onboarding-hide">
          <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: "Inter_500Medium" }}>Ukryj</Text>
        </Pressable>
      </View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { backgroundColor: colors.primary, width: `${(doneCount / steps.length) * 100}%` }]} />
      </View>

      {steps.map((step) => {
        const isNext = step.key === nextKey;
        return (
          <Pressable
            key={step.key}
            onPress={step.onPress}
            disabled={step.done}
            accessibilityRole="button"
            accessibilityState={{ checked: step.done, disabled: step.done }}
            accessibilityLabel={`${step.title}${step.done ? " — gotowe" : ""}`}
            style={({ pressed }) => [
              styles.step,
              { backgroundColor: isNext ? colors.primary + "10" : "transparent", opacity: pressed ? 0.8 : 1 },
            ]}
            testID={`onboarding-step-${step.key}`}
          >
            <Ionicons
              name={step.done ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={step.done ? "#10b981" : isNext ? colors.primary : colors.mutedForeground}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.stepTitle,
                  { color: step.done ? colors.mutedForeground : colors.foreground, textDecorationLine: step.done ? "line-through" : "none" },
                ]}
              >
                {step.title}
              </Text>
              {!step.done && <Text style={[styles.stepHint, { color: colors.mutedForeground }]}>{step.hint}</Text>}
            </View>
            {!step.done && <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  progress: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 8 },
  fill: { height: 6, borderRadius: 3 },
  step: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 12 },
  stepTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  stepHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
});
