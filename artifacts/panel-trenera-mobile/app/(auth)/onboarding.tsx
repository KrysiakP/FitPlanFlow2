import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/context/AuthContext";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface GoalOption {
  id: string;
  label: string;
  icon: IoniconsName;
}

const GOAL_OPTIONS: GoalOption[] = [
  { id: "Schudnąć", label: "Schudnąć", icon: "flame-outline" },
  { id: "Zbudować masę mięśniową", label: "Zbudować masę", icon: "barbell-outline" },
  { id: "Poprawić kondycję", label: "Poprawić kondycję", icon: "bicycle-outline" },
  { id: "Utrzymać formę", label: "Utrzymać formę", icon: "shield-checkmark-outline" },
  { id: "Rehabilitacja", label: "Rehabilitacja", icon: "medkit-outline" },
  { id: "Ogólna sprawność", label: "Ogólna sprawność", icon: "walk-outline" },
];

async function saveOnboarding(phone: string, goal: string): Promise<void> {
  if (phone.trim()) {
    const profileRes = await apiFetch("/api/profile", {
      method: "POST",
      body: JSON.stringify({ phone: phone.trim() }),
    });
    if (!profileRes.ok && profileRes.status !== 400) {
      // 400 means profile already exists — try PUT instead
      await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ phone: phone.trim() }),
      });
    } else if (profileRes.status === 400) {
      await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ phone: phone.trim() }),
      });
    }
  }

  if (goal) {
    await apiFetch("/api/client/progress", {
      method: "PUT",
      body: JSON.stringify({ goal }),
    });
  }
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    try {
      await saveOnboarding(phone, selectedGoal ?? "");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaving(false);
      router.replace("/");
    } catch {
      setSaving(false);
      Alert.alert(
        "Nie udało się zapisać",
        "Wystąpił problem podczas zapisywania Twoich danych. Możesz spróbować ponownie lub pominąć ten krok.",
        [
          { text: "Spróbuj ponownie", onPress: handleContinue },
          { text: "Pomiń", style: "cancel", onPress: () => router.replace("/") },
        ]
      );
    }
  }

  function handleSkip() {
    router.replace("/");
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>PT</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Opowiedz nam o sobie
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Pomożemy dopasować plan treningowy do Twoich potrzeb
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Twój cel treningowy
            </Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              Wybierz jeden z poniższych celów
            </Text>
            <View style={styles.goalsGrid}>
              {GOAL_OPTIONS.map((opt) => {
                const active = selectedGoal === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSelectedGoal(active ? null : opt.id)}
                    style={({ pressed }) => [
                      styles.goalCard,
                      {
                        backgroundColor: active ? colors.primary + "18" : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    testID={`button-goal-${opt.id.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={22}
                      color={active ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.goalLabel,
                        { color: active ? colors.primary : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Numer telefonu
            </Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              Opcjonalnie — ułatwia kontakt z trenerem
            </Text>
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={18}
                color={colors.mutedForeground}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="+48 000 000 000"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                autoCorrect={false}
                testID="input-phone"
              />
            </View>
          </View>

          <View style={styles.buttons}>
            <Pressable
              onPress={handleContinue}
              disabled={saving}
              style={({ pressed }) => [
                styles.continueBtn,
                { backgroundColor: colors.primary, opacity: pressed || saving ? 0.85 : 1 },
              ]}
              testID="button-onboarding-continue"
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.continueBtnText}>Zapisz i przejdź dalej</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </Pressable>

            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.skipBtn, { opacity: pressed ? 0.6 : 1 }]}
              testID="button-onboarding-skip"
            >
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                Pomiń na razie
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 36 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    lineHeight: 18,
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: "45%",
    flex: 1,
  },
  goalLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flexShrink: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 50,
  },
  buttons: { gap: 10, marginTop: 8 },
  continueBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  skipBtn: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
