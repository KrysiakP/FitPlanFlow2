import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

const PRESET_TIMES = [30, 45, 60, 90, 120, 180];
const STORAGE_KEYS = {
  DURATION: "rest-timer-duration",
  VIBRATION: "rest-timer-vibration",
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RestTimerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectedTime, setSelectedTime] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const [storedDuration, storedVibration] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DURATION),
        AsyncStorage.getItem(STORAGE_KEYS.VIBRATION),
      ]);
      if (storedDuration && PRESET_TIMES.includes(parseInt(storedDuration, 10))) {
        const value = parseInt(storedDuration, 10);
        setSelectedTime(value);
        setTimeLeft(value);
      }
      if (storedVibration !== null) {
        setVibrationEnabled(storedVibration === "true");
      }
    })();
  }, []);

  const notifyComplete = useCallback(() => {
    if (!vibrationEnabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 300);
  }, [vibrationEnabled]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            notifyComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, notifyComplete]);

  function handleSelectTime(value: number) {
    setSelectedTime(value);
    // Always sync timeLeft too — otherwise a mid-countdown tap leaves the
    // progress bar counting down from the old duration while the new preset
    // shows as selected.
    setTimeLeft(value);
    AsyncStorage.setItem(STORAGE_KEYS.DURATION, value.toString()).catch(() => {});
  }

  function handleStart() {
    if (timeLeft === 0) setTimeLeft(selectedTime);
    setIsRunning(true);
    Haptics.selectionAsync();
  }

  function handlePause() {
    setIsRunning(false);
    Haptics.selectionAsync();
  }

  function handleReset() {
    setIsRunning(false);
    setTimeLeft(selectedTime);
    Haptics.selectionAsync();
  }

  function toggleVibration() {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    AsyncStorage.setItem(STORAGE_KEYS.VIBRATION, next.toString()).catch(() => {});
  }

  const progress = selectedTime > 0 ? ((selectedTime - timeLeft) / selectedTime) * 100 : 0;
  const isComplete = timeLeft === 0 && !isRunning;
  const isUrgent = timeLeft <= 10 && isRunning;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.replace("/panel")} style={({ pressed }) => [{ marginRight: 4 }, { opacity: pressed ? 0.6 : 1 }]} testID="button-back">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Timer przerwy</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.presetRow}>
          {PRESET_TIMES.map((preset) => {
            const active = selectedTime === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => handleSelectTime(preset)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                testID={`button-preset-${preset}`}
              >
                <Text style={[styles.presetChipText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                  {preset}s
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text
            style={[
              styles.timerDisplay,
              { color: isComplete ? "#16a34a" : isUrgent ? colors.destructive : colors.foreground },
            ]}
            testID="text-timer-display"
          >
            {formatTime(timeLeft)}
          </Text>

          <View style={[styles.progressTrack, { backgroundColor: colors.accent }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: isComplete ? "#16a34a" : colors.primary },
              ]}
            />
          </View>

          {isComplete && (
            <Text style={styles.completeText}>Czas minął! Rozpocznij następną serię</Text>
          )}

          <View style={styles.controlsRow}>
            {!isRunning ? (
              <Pressable
                onPress={handleStart}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                testID="button-start-timer"
              >
                <Ionicons name="play" size={18} color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  {timeLeft === 0 ? "Restart" : "Start"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handlePause}
                style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                testID="button-pause-timer"
              >
                <Ionicons name="pause" size={18} color={colors.foreground} />
                <Text style={[styles.primaryBtnText, { color: colors.foreground }]}>Pauza</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleReset}
              style={[styles.resetBtn, { borderColor: colors.border }]}
              testID="button-reset-timer"
            >
              <Ionicons name="refresh" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={toggleVibration}
          style={[styles.vibrationRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          testID="button-toggle-vibration"
        >
          <Ionicons name={vibrationEnabled ? "phone-portrait" : "phone-portrait-outline"} size={18} color={colors.foreground} />
          <Text style={[styles.vibrationText, { color: colors.foreground }]}>Wibracja po zakończeniu</Text>
          <Ionicons
            name={vibrationEnabled ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={vibrationEnabled ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stickyHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 20 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  presetChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  presetChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  timerCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", marginBottom: 16 },
  timerDisplay: { fontSize: 56, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  progressTrack: { width: "100%", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 16 },
  progressFill: { height: "100%", borderRadius: 4 },
  completeText: { color: "#16a34a", fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 10 },
  controlsRow: { flexDirection: "row", gap: 12, marginTop: 22 },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resetBtn: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  vibrationRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  vibrationText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
