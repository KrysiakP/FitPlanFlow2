import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/context/AuthContext";

type PermissionStatus = "granted" | "denied" | "undetermined" | "checking";

interface NotifType {
  icon: "barbell-outline" | "nutrition-outline" | "trophy-outline" | "calendar-outline";
  title: string;
  desc: string;
}

const NOTIF_TYPES: NotifType[] = [
  { icon: "barbell-outline", title: "Nowy plan treningowy", desc: "Gdy trener przypisze Ci nowy plan" },
  { icon: "calendar-outline", title: "Przypomnienie o treningu", desc: "Przypomnienia o nadchodzących sesjach" },
  { icon: "nutrition-outline", title: "Aktualizacja planu diety", desc: "Gdy trener zmieni Twój plan dietetyczny" },
  { icon: "trophy-outline", title: "Osiągnięcia i postępy", desc: "Gratulacje za osiągnięte cele" },
];

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [permStatus, setPermStatus] = useState<PermissionStatus>("checking");
  const [isRegistering, setIsRegistering] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const checkPermission = useCallback(async () => {
    if (isWeb) {
      setPermStatus("undetermined");
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    setPermStatus(status as PermissionStatus);
  }, [isWeb]);

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current !== "active" && nextState === "active") {
        void checkPermission();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [checkPermission]);

  async function handleToggle(enabled: boolean) {
    if (isWeb) return;
    if (enabled) {
      setIsRegistering(true);
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        setPermStatus(status as PermissionStatus);
        if (status === "granted") {
          const pushToken = await Notifications.getExpoPushTokenAsync();
          await apiFetch("/api/push-tokens", {
            method: "POST",
            body: JSON.stringify({ token: pushToken.data, platform: Platform.OS }),
          });
        }
      } catch {
        // silently fail
      } finally {
        setIsRegistering(false);
      }
    } else {
      await Linking.openSettings();
    }
  }

  const isGranted = permStatus === "granted";
  const isDenied = permStatus === "denied";
  const isChecking = permStatus === "checking";

  function StatusRow() {
    let iconName: "checkmark-circle" | "close-circle" | "help-circle" | "time-outline" = "help-circle";
    let iconColor = colors.mutedForeground;
    let statusText = "Sprawdzanie...";
    let statusDesc = "";

    if (isChecking) {
      return (
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (isGranted) {
      iconName = "checkmark-circle";
      iconColor = "#22c55e";
      statusText = "Powiadomienia włączone";
      statusDesc = "Będziesz otrzymywać powiadomienia push na to urządzenie.";
    } else if (isDenied) {
      iconName = "close-circle";
      iconColor = colors.destructive;
      statusText = "Powiadomienia zablokowane";
      statusDesc = "Włącz powiadomienia w ustawieniach systemu, aby je otrzymywać.";
    } else {
      iconName = "help-circle";
      iconColor = colors.mutedForeground;
      statusText = "Powiadomienia nie skonfigurowane";
      statusDesc = "Włącz powiadomienia, aby otrzymywać ważne informacje od swojego trenera.";
    }

    return (
      <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statusRow}>
          <Ionicons name={iconName} size={28} color={iconColor} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: colors.foreground }]}>{statusText}</Text>
            <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>{statusDesc}</Text>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
            {isWeb ? "Powiadomienia push" : isDenied ? "Otwórz ustawienia systemu" : "Włącz powiadomienia push"}
          </Text>
          {isWeb ? (
            <Text style={[styles.webNote, { color: colors.mutedForeground }]}>Niedostępne w przeglądarce</Text>
          ) : isRegistering ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={isGranted}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isGranted ? colors.primaryForeground : colors.mutedForeground}
              testID="switch-notifications"
            />
          )}
        </View>
        {isDenied && !isWeb && (
          <Pressable
            onPress={() => Linking.openSettings()}
            style={({ pressed }) => [
              styles.openSettingsBtn,
              { backgroundColor: colors.primary + "18", borderColor: colors.primary + "33", opacity: pressed ? 0.7 : 1 },
            ]}
            testID="button-open-system-settings"
          >
            <Ionicons name="settings-outline" size={16} color={colors.primary} />
            <Text style={[styles.openSettingsText, { color: colors.primary }]}>Otwórz ustawienia systemu</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Platform.OS === "web" ? 83 : insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Powiadomienia</Text>
      <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
        Zarządzaj powiadomieniami push na tym urządzeniu
      </Text>

      <StatusRow />

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rodzaje powiadomień</Text>

      {NOTIF_TYPES.map((item) => (
        <View
          key={item.title}
          style={[styles.notifRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.notifIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name={item.icon} size={18} color={colors.foreground} />
          </View>
          <View style={styles.notifInfo}>
            <Text style={[styles.notifTitle, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.notifDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
          </View>
          <Ionicons
            name={isGranted ? "checkmark-circle" : "ellipse-outline"}
            size={18}
            color={isGranted ? "#22c55e" : colors.mutedForeground}
          />
        </View>
      ))}

      <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "22" }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Powiadomienia push są wysyłane przez Expo i wymagają połączenia z internetem. Token urządzenia jest zapisywany
          na serwerze tylko po zalogowaniu i jest powiązany wyłącznie z Twoim kontem.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 24 },
  statusCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 28, gap: 16 },
  statusRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  statusDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  divider: { height: 1 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  webNote: { fontSize: 13, fontFamily: "Inter_400Regular" },
  openSettingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  openSettingsText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  notifIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  notifDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
