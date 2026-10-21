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
import { apiFetch } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function StudioRegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [gymName, setGymName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (gymName.trim().length < 2) return "Podaj nazwę studia";
    if (fullName.trim().split(/\s+/).length < 2) return "Podaj imię i nazwisko właściciela";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Podaj poprawny adres e-mail";
    if (password.length < 8) return "Hasło musi mieć co najmniej 8 znaków";
    if (!acceptedTerms) return "Zaakceptuj regulamin i politykę prywatności";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const parts = fullName.trim().split(/\s+/);
      const res = await apiFetch("/api/gym/register", {
        method: "POST",
        body: JSON.stringify({
          gymName: gymName.trim(),
          firstName: parts[0],
          lastName: parts.slice(1).join(" "),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.message || "Nie udało się utworzyć studia");
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Studio zostało utworzone",
        "Wysłaliśmy link aktywacyjny na podany adres e-mail. Po potwierdzeniu adresu zaloguj się w aplikacji.",
        [{ text: "Przejdź do logowania", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Wystąpił błąd. Spróbuj ponownie.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    props: Partial<React.ComponentProps<typeof TextInput>> = {},
    testID?: string,
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          style={[styles.input, { color: colors.foreground }]}
          placeholderTextColor={colors.mutedForeground}
          testID={testID}
          {...props}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable accessibilityRole="button" accessibilityLabel="Wróć" onPress={() => router.back()} style={styles.backBtn} testID="button-back">
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Załóż studio</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Dla siłowni, klubów i studiów fitness. Zapraszasz trenerów i widzisz zbiorcze statystyki — podopieczni
            pozostają pod opieką swoich trenerów.
          </Text>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "14", borderColor: colors.destructive + "55" }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          {field("Nazwa studia", gymName, setGymName, { autoCapitalize: "words", placeholder: "np. Klub Fit" }, "input-gym-name")}
          {field("Imię i nazwisko właściciela", fullName, setFullName, { autoCapitalize: "words", autoComplete: "name" }, "input-owner-name")}
          {field("Adres e-mail", email, setEmail, { autoCapitalize: "none", keyboardType: "email-address", autoComplete: "email", placeholder: "twoj@email.pl" }, "input-email")}

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Hasło</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoComplete="new-password"
                placeholder="Co najmniej 8 znaków"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                testID="input-password"
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Pokaż lub ukryj hasło" onPress={() => setShowPass((v) => !v)} hitSlop={10}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {field("Telefon (opcjonalnie)", phone, setPhone, { keyboardType: "phone-pad", autoComplete: "tel" }, "input-phone")}

          <Pressable onPress={() => setAcceptedTerms((v) => !v)} style={styles.termsRow} testID="checkbox-terms">
            <Ionicons
              name={acceptedTerms ? "checkbox" : "square-outline"}
              size={24}
              color={acceptedTerms ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
              Akceptuję{" "}
              <Text style={{ color: colors.primary }} onPress={() => router.push("/(auth)/terms")}>
                regulamin i politykę prywatności
              </Text>
              .
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading || pressed ? 0.8 : 1 }]}
            testID="button-studio-register"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Załóż studio</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 4 },
  backBtn: { width: 40, height: 40, justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 6, marginBottom: 16 },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  errorText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", height: "100%" },
  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 },
  termsText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  primaryBtn: { height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
