import {
  ActivityIndicator,
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
import { apiPost } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Podaj adres e-mail");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Podaj prawidłowy adres e-mail");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiPost("/api/auth/forgot-password", { email: trimmed });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch {
      setError("Wystąpił błąd. Spróbuj ponownie.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
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
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="button-back"
          >
            <Ionicons name="arrow-back-outline" size={22} color={colors.foreground} />
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name="lock-open-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Resetowanie hasła
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {sent
                ? "Sprawdź swoją skrzynkę e-mail — jeśli konto istnieje, wysłaliśmy link do resetowania hasła. Link jest ważny przez 1 godzinę."
                : "Podaj swój adres e-mail, a wyślemy Ci link do ustawienia nowego hasła."}
            </Text>
          </View>

          {sent ? (
            <View style={styles.form}>
              <View
                style={[
                  styles.successBox,
                  { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.successText, { color: colors.foreground }]}>
                  Email wysłany
                </Text>
              </View>
              <Pressable
                onPress={() => router.replace("/(auth)/login")}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                testID="button-back-to-login"
              >
                <Text style={styles.submitBtnText}>Wróć do logowania</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              {error && (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "44" },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              )}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Adres e-mail</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="twoj@email.pl"
                    placeholderTextColor={colors.mutedForeground}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    testID="input-email"
                  />
                </View>
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
                ]}
                testID="button-submit"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Wyślij link resetujący</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24 },
  backBtn: {
    alignSelf: "flex-start",
    padding: 4,
    marginBottom: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  form: { gap: 16 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  successText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
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
  submitBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
