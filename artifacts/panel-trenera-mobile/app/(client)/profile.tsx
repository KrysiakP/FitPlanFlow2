import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";
import { apiFetch } from "@/context/AuthContext";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

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

export default function ClientProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [editVisible, setEditVisible] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editGoal, setEditGoal] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();

  const openEditModal = useCallback(async () => {
    setEditPhone("");
    setEditGoal(null);
    setSuccessMsg(null);
    setLoadingEdit(true);
    setEditVisible(true);
    try {
      const [profileRes, progressRes] = await Promise.allSettled([
        apiGet<{ phone?: string | null }>("/api/profile"),
        apiGet<{ goal?: string | null }>("/api/client/progress"),
      ]);
      if (profileRes.status === "fulfilled") {
        setEditPhone(profileRes.value?.phone ?? "");
      }
      if (progressRes.status === "fulfilled") {
        setEditGoal(progressRes.value?.goal ?? null);
      }
    } catch {
      // Use empty defaults if fetch fails
    } finally {
      setLoadingEdit(false);
    }
  }, []);

  async function savePhone(phone: string): Promise<void> {
    const trimmed = phone.trim();
    const putRes = await apiFetch("/api/profile", {
      method: "PUT",
      body: JSON.stringify({ phone: trimmed }),
    });
    if (!putRes.ok) {
      if (putRes.status === 404 || putRes.status === 400) {
        const postRes = await apiFetch("/api/profile", {
          method: "POST",
          body: JSON.stringify({ phone: trimmed }),
        });
        if (!postRes.ok) {
          throw new Error(`profile save failed: ${postRes.status}`);
        }
      } else {
        throw new Error(`profile save failed: ${putRes.status}`);
      }
    }
  }

  async function saveGoal(goal: string | null): Promise<void> {
    const res = await apiFetch("/api/client/progress", {
      method: "PUT",
      body: JSON.stringify({ goal: goal || null }),
    });
    if (!res.ok) {
      throw new Error(`goal save failed: ${res.status}`);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const tasks: Promise<void>[] = [
        savePhone(editPhone),
        saveGoal(editGoal),
      ];
      await Promise.all(tasks);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMsg("Profil zaktualizowany");
      setTimeout(() => {
        setEditVisible(false);
        setSuccessMsg(null);
      }, 1200);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Błąd", "Nie udało się zapisać zmian. Spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Wylogowanie", "Czy na pewno chcesz się wylogować?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Wyloguj",
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profil</Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + "1a" }]}>
            <Ionicons name="person-outline" size={13} color={colors.primary} />
            <Text style={[styles.roleText, { color: colors.primary }]}>Podopieczny</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ustawienia</Text>

        <ThemeToggleRow colors={colors} />
        <MenuRow
          icon="create-outline"
          label="Edytuj profil"
          desc="Zmień cel treningowy i numer telefonu"
          colors={colors}
          onPress={openEditModal}
          testID="button-edit-profile"
        />
        <MenuRow
          icon="notifications-outline"
          label="Powiadomienia"
          desc="Zarządzaj powiadomieniami push"
          colors={colors}
          onPress={() => router.push("/notifications")}
          testID="button-notifications"
        />
        <MenuRow icon="globe-outline" label="Zarządzaj kontem" desc="Otwórz Panel Trenera w przeglądarce" colors={colors} />
        <MenuRow icon="shield-checkmark-outline" label="Prywatność i RODO" desc="Zarządzaj zgodami i danymi" colors={colors} onPress={() => router.push("/(auth)/privacy")} testID="button-privacy" />
        <MenuRow icon="help-circle-outline" label="Pomoc i kontakt" desc="FAQ i kontakt z supportem" colors={colors} onPress={() => router.push("/(auth)/help")} testID="button-help" />

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "44", opacity: pressed ? 0.8 : 1 },
          ]}
          testID="button-logout"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Wyloguj się</Text>
        </Pressable>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Panel Trenera v1.0{"\n"}paneltrenera.pl
        </Text>
      </ScrollView>

      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !saving && setEditVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalRoot, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => !saving && setEditVisible(false)}
              style={({ pressed }) => [styles.modalClose, { opacity: pressed ? 0.6 : 1 }]}
              testID="button-edit-close"
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edytuj profil</Text>
            <View style={{ width: 36 }} />
          </View>

          {loadingEdit ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Cel treningowy</Text>
                <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                  Wybierz jeden z poniższych celów
                </Text>
                <View style={styles.goalsGrid}>
                  {GOAL_OPTIONS.map((opt) => {
                    const active = editGoal === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => setEditGoal(active ? null : opt.id)}
                        style={({ pressed }) => [
                          styles.goalCard,
                          {
                            backgroundColor: active ? colors.primary + "18" : colors.card,
                            borderColor: active ? colors.primary : colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                        testID={`button-edit-goal-${opt.id.toLowerCase().replace(/\s+/g, "-")}`}
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
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Numer telefonu</Text>
                <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                  Opcjonalnie — ułatwia kontakt z trenerem
                </Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="call-outline" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="+48 000 000 000"
                    placeholderTextColor={colors.mutedForeground}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="input-edit-phone"
                  />
                </View>
              </View>

              {successMsg && (
                <View style={[styles.successBanner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.successText, { color: colors.primary }]}>{successMsg}</Text>
                </View>
              )}

              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: colors.primary, opacity: pressed || saving ? 0.85 : 1 },
                ]}
                testID="button-edit-save"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Zapisz zmiany</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

interface MenuRowProps {
  icon: IoniconsName;
  label: string;
  desc?: string;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
  testID?: string;
}

function MenuRow({ icon, label, desc, colors, onPress, testID }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={18} color={colors.foreground} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
        {desc && <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{desc}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ThemeToggleRow({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { preference, setPreference } = useTheme();
  const options: { value: ThemePreference; icon: IoniconsName; label: string }[] = [
    { value: "light", icon: "sunny-outline", label: "Jasny" },
    { value: "system", icon: "phone-portrait-outline", label: "System" },
    { value: "dark", icon: "moon-outline", label: "Ciemny" },
  ];

  return (
    <View style={[styles.menuRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name="contrast-outline" size={18} color={colors.foreground} />
      </View>
      <View style={[styles.menuInfo, { flex: 1 }]}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>Motyw</Text>
      </View>
      <View style={[styles.themeToggleRow, { backgroundColor: colors.accent, borderColor: colors.border }]}>
        {options.map((opt) => {
          const active = preference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => { setPreference(opt.value); Haptics.selectionAsync(); }}
              style={[
                styles.themeOption,
                active && { backgroundColor: colors.primary },
              ]}
              testID={`button-theme-${opt.value}`}
            >
              <Ionicons name={opt.icon} size={14} color={active ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.themeOptionLabel, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 16 },
  profileCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold" },
  email: { fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8, marginBottom: 16 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  themeToggleRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  themeOption: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7 },
  themeOptionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // Modal
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalClose: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: { paddingHorizontal: 24, paddingTop: 24 },

  // Edit form
  section: { marginBottom: 28 },
  sectionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  sectionHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 18 },
  goalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  goalCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minWidth: "45%", flex: 1 },
  goalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", flexShrink: 1 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: 50 },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  successText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  saveBtn: { height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
