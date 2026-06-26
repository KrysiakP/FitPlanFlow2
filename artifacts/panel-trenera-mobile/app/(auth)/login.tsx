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
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth, hasStoredSession } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    void checkBiometrics();
  }, []);

  async function checkBiometrics() {
    if (Platform.OS === "web") return;
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const hasSession = await hasStoredSession();
    setBiometricAvailable(compatible && enrolled);
    setBiometricEnabled(compatible && enrolled && hasSession);
  }

  async function handleBiometricLogin() {
    setBiometricLoading(true);
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Zaloguj się do Panelu Trenera",
        cancelLabel: "Anuluj",
        fallbackLabel: "Użyj hasła",
      });
      if (result.success) {
        await refreshUser();
        // refreshUser either restores the user from the persisted session cookie
        // or clears hasStoredSession and sets user to null if the session expired.
        const stillHasSession = await hasStoredSession();
        if (!stillHasSession) {
          setBiometricEnabled(false);
          setError("Sesja wygasła. Zaloguj się ponownie e-mailem i hasłem.");
          return;
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/");
      } else if (result.error !== "user_cancel") {
        setError("Biometria nieudana. Użyj e-maila i hasła.");
      }
    } catch {
      setError("Biometria niedostępna.");
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleLogin() {
    if (!email || !password) {
      setError("Podaj e-mail i hasło");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      // login() sets hasStoredSession flag — biometric becomes available next launch
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
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
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>PT</Text>
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>Panel Trenera</Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
              Profesjonalne zarządzanie treningami
            </Text>
          </View>

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
                  placeholder="••••••••"
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

            <Pressable
              onPress={() => router.push("/(auth)/forgot-password")}
              style={styles.forgotBtn}
              testID="button-forgot-password"
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                Nie pamiętam hasła
              </Text>
            </Pressable>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginBtn,
                { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
              ]}
              testID="button-login"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Zaloguj się</Text>
              )}
            </Pressable>

            {biometricEnabled && (
              <Pressable
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
                style={({ pressed }) => [
                  styles.biometricBtn,
                  { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed || biometricLoading ? 0.8 : 1 },
                ]}
                testID="button-biometric-login"
              >
                {biometricLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="finger-print" size={22} color={colors.primary} />
                    <Text style={[styles.biometricText, { color: colors.foreground }]}>
                      Zaloguj biometrycznie
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {Platform.OS === "ios" ? (
              <View style={[styles.divider, { borderColor: colors.border }]}>
                <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
                  Aby założyć konto, wejdź na{" "}
                </Text>
                <Text style={[styles.linkText, { color: colors.primary }]}>paneltrenera.pl</Text>
              </View>
            ) : (
              <View style={[styles.divider, { borderColor: colors.border }]}>
                <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
                  Nie masz konta?{" "}
                </Text>
                <Pressable onPress={() => router.replace("/(auth)/register")} testID="button-go-register">
                  <Text style={[styles.linkText, { color: colors.primary }]}>Zarejestruj się</Text>
                </Pressable>
              </View>
            )}
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
    alignItems: "center",
    marginBottom: 40,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  appName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  form: {
    gap: 16,
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
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  loginBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  biometricText: {
    fontSize: 15,
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
