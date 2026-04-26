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
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth, apiFetch } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface InvitationInfo {
  email: string;
  clientFirstName: string | null;
  trainerName: string;
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [role, setRole] = useState<"client" | "trainer">("client");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [invitationCode, setInvitationCode] = useState("");
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInputRef = useRef<TextInput>(null);

  // Auto-lookup when code reaches 8 characters
  useEffect(() => {
    const code = invitationCode.trim().toUpperCase();
    if (code.length !== 8) {
      if (invitationInfo) {
        setInvitationInfo(null);
        setEmail("");
      }
      setCodeError(null);
      return;
    }
    let cancelled = false;
    async function lookup() {
      setCodeChecking(true);
      setCodeError(null);
      try {
        const res = await apiFetch(`/api/invitations/lookup/${code}`);
        if (cancelled) return;
        if (res.ok) {
          const data: InvitationInfo = await res.json();
          setInvitationInfo(data);
          setEmail(data.email);
          if (data.clientFirstName && !fullName.trim()) {
            setFullName(data.clientFirstName);
          }
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (res.status === 410) {
          setCodeError("To zaproszenie zostało już wykorzystane");
          setInvitationInfo(null);
        } else {
          setCodeError("Nie znaleziono zaproszenia o tym kodzie");
          setInvitationInfo(null);
        }
      } catch {
        if (!cancelled) setCodeError("Nie udało się sprawdzić kodu");
      } finally {
        if (!cancelled) setCodeChecking(false);
      }
    }
    void lookup();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitationCode]);

  function validate(): string | null {
    if (!fullName.trim()) return "Podaj swoje imię i nazwisko";
    if (!email.trim()) return "Podaj adres e-mail";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Nieprawidłowy adres e-mail";
    if (invitationInfo && email.toLowerCase() !== invitationInfo.email.toLowerCase()) {
      return `Musisz użyć adresu e-mail z zaproszenia: ${invitationInfo.email}`;
    }
    if (password.length < 6) return "Hasło musi mieć co najmniej 6 znaków";
    if (password !== confirmPassword) return "Hasła nie są zgodne";
    if (!acceptedTerms) return "Musisz zaakceptować regulamin aplikacji";
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
      const parts = fullName.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ");
      const code = invitationCode.trim().toUpperCase() || undefined;
      await register(firstName, email.trim().toLowerCase(), password, role, lastName, code);
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

  const emailLocked = !!invitationInfo;

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
              {(["trainer", "client"] as const).map((r) => {
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

            {/* Invitation code section */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Kod zaproszenia od trenera{" "}
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
                  (opcjonalnie)
                </Text>
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.card,
                    borderColor: invitationInfo
                      ? colors.primary
                      : codeError
                      ? colors.destructive
                      : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="ticket-outline"
                  size={18}
                  color={
                    invitationInfo
                      ? colors.primary
                      : codeError
                      ? colors.destructive
                      : colors.mutedForeground
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.foreground, letterSpacing: 2 }]}
                  placeholder="np. AB12CD34"
                  placeholderTextColor={colors.mutedForeground}
                  value={invitationCode}
                  onChangeText={(t) => setInvitationCode(t.toUpperCase().slice(0, 8))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="next"
                  maxLength={8}
                  testID="input-invitation-code"
                />
                {codeChecking && (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                )}
                {invitationInfo && !codeChecking && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
                {codeError && !codeChecking && (
                  <Ionicons name="close-circle" size={20} color={colors.destructive} />
                )}
              </View>
              {codeError && (
                <Text style={[styles.fieldError, { color: colors.destructive }]}>
                  {codeError}
                </Text>
              )}
            </View>

            {/* Trainer banner — visible when valid invitation code entered */}
            {invitationInfo && (
              <View
                style={[
                  styles.trainerBanner,
                  { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" },
                ]}
              >
                <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
                <View style={styles.bannerText}>
                  <Text style={[styles.bannerTitle, { color: colors.primary }]}>
                    Zaproszenie potwierdzone
                  </Text>
                  <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
                    Twój trener: {invitationInfo.trainerName}
                  </Text>
                </View>
              </View>
            )}

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
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Imię i nazwisko</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="np. Jan Kowalski"
                  placeholderTextColor={colors.mutedForeground}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  testID="input-full-name"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Adres e-mail
                {emailLocked && (
                  <Text style={{ color: colors.primary, fontFamily: "Inter_400Regular" }}>
                    {" "}(z zaproszenia)
                  </Text>
                )}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: emailLocked ? colors.primary + "0a" : colors.card,
                    borderColor: emailLocked ? colors.primary + "40" : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={emailLocked ? "lock-closed-outline" : "mail-outline"}
                  size={18}
                  color={emailLocked ? colors.primary : colors.mutedForeground}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailInputRef}
                  style={[styles.input, { color: emailLocked ? colors.primary : colors.foreground }]}
                  placeholder="twoj@email.pl"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={emailLocked ? undefined : setEmail}
                  editable={!emailLocked}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="input-email"
                />
                {emailLocked && (
                  <Ionicons name="lock-closed" size={14} color={colors.primary + "80"} />
                )}
              </View>
              {emailLocked && (
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                  Adres e-mail jest powiązany z zaproszeniem i nie można go zmienić.
                </Text>
              )}
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

            {/* Terms acceptance */}
            <Pressable
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              style={styles.termsRow}
              testID="button-accept-terms"
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: acceptedTerms ? colors.primary : colors.border,
                    backgroundColor: acceptedTerms ? colors.primary : "transparent",
                  },
                ]}
              >
                {acceptedTerms && (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                )}
              </View>
              <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
                Akceptuję{" "}
                <Text
                  style={[styles.termsLink, { color: colors.primary }]}
                  onPress={() => router.push("/(auth)/terms")}
                  testID="link-terms"
                >
                  Regulamin aplikacji
                </Text>
                {" "}i{" "}
                <Text
                  style={[styles.termsLink, { color: colors.primary }]}
                  onPress={() => router.push("/(auth)/terms")}
                  testID="link-privacy"
                >
                  Politykę prywatności
                </Text>
              </Text>
            </Pressable>

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
  trainerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  bannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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
  fieldError: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  termsLink: {
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
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
