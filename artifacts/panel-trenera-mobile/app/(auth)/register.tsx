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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [role, setRole] = useState<"client" | "trainer">("client");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!firstName.trim()) return "Podaj swoje imię";
    if (!email.trim()) return "Podaj adres e-mail";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Nieprawidłowy adres e-mail";
    if (password.length < 6) return "Hasło musi mieć co najmniej 6 znaków";
    if (password !== confirmPassword) return "Hasła nie są zgodne";
    return null;
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(firstName.trim(), email.trim().toLowerCase(), password, role);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(role === "trainer" ? "/(trainer)" : "/(auth)/onboarding");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Wystąpił błąd. Spróbuj ponownie.";
      setError(msg);
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
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtn}
              testID="button-back"
            >
              <Ionicons name="arrow-back" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>Utwórz konto</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Zarejestruj się, aby uzyskać dostęp do swojego planu
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.rolePicker}>
              {(["client", "trainer"] as const).map((r) => {
                const selected = role === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={[
                      styles.roleCard,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primary + "14" : colors.card,
                      },
                    ]}
                    testID={`button-role-${r}`}
                  >
                    <Ionicons
                      name={r === "trainer" ? "barbell-outline" : "person-outline"}
                      size={24}
                      color={selected ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.roleLabel,
                        { color: selected ? colors.primary : colors.foreground },
                      ]}
                    >
                      {r === "trainer" ? "Trener" : "Podopieczny"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

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
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Imię</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Twoje imię"
                  placeholderTextColor={colors.mutedForeground}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  testID="input-first-name"
                />
              </View>
            </View>

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
                  testID="input-email"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Hasło</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Min. 6 znaków"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  testID="input-password"
                />
                <Pressable
                  onPress={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                  testID="button-toggle-password"
                >
                  <Ionicons
                    name={showPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Powtórz hasło</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Powtórz hasło"
                  placeholderTextColor={colors.mutedForeground}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPass}
                  autoCapitalize="none"
                  testID="input-confirm-password"
                />
                <Pressable
                  onPress={() => setShowConfirmPass(!showConfirmPass)}
                  style={styles.eyeBtn}
                  testID="button-toggle-confirm-password"
                >
                  <Ionicons
                    name={showConfirmPass ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [
                styles.registerBtn,
                { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
              ]}
              testID="button-register"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Zarejestruj się</Text>
              )}
            </Pressable>

            <View style={[styles.divider, { borderColor: colors.border }]}>
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
                Masz już konto?{" "}
              </Text>
              <Pressable onPress={() => router.replace("/(auth)/login")} testID="button-go-login">
                <Text style={[styles.linkText, { color: colors.primary }]}>Zaloguj się</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  backBtn: {
    marginBottom: 20,
    alignSelf: "flex-start",
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  rolePicker: {
    flexDirection: "row",
    gap: 12,
  },
  roleCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  roleLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
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
  field: {
    gap: 6,
  },
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
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 50,
  },
  eyeBtn: {
    padding: 4,
  },
  registerBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  registerBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    borderTopWidth: 1,
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
