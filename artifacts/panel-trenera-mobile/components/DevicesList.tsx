import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { apiDelete, apiGet } from "@/lib/api";

interface Device {
  id: string;
  kind: "browser" | "app";
  label: string;
  signedInAt: string | null;
  current: boolean;
}

const KEY = ["account-devices"];

/** Where this account is signed in; every other device can be signed out on its own. */
export function DevicesList() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data } = useQuery<{ devices: Device[] }>({ queryKey: KEY, queryFn: () => apiGet<{ devices: Device[] }>("/api/account/devices") });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/account/devices/${encodeURIComponent(id)}`),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: () => Alert.alert("Błąd", "Nie udało się wylogować urządzenia."),
  });
  const devices = data?.devices ?? [];
  if (devices.length === 0) return null;

  function confirm(device: Device) {
    Alert.alert("Wylogować urządzenie?", device.label, [
      { text: "Anuluj", style: "cancel" },
      { text: "Wyloguj", style: "destructive", onPress: () => remove.mutate(device.id) },
    ]);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="card-devices">
      <Text style={[styles.title, { color: colors.foreground }]}>Zalogowane urządzenia</Text>
      {devices.map((device) => (
        <View key={device.id} style={styles.row} testID={`device-${device.id}`}>
          <Ionicons name={device.kind === "browser" ? "globe-outline" : "phone-portrait-outline"} size={18} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
              {device.label}
              {device.current ? "  ·  to urządzenie" : ""}
            </Text>
            {device.signedInAt ? (
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                Zalogowano {new Date(device.signedInAt).toLocaleString("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </Text>
            ) : null}
          </View>
          {!device.current ? (
            <Pressable onPress={() => confirm(device)} accessibilityRole="button" accessibilityLabel={`Wyloguj ${device.label}`} style={[styles.btn, { borderColor: colors.border }]} testID={`button-signout-${device.id}`}>
              <Text style={{ fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" }}>Wyloguj</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
});
