import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiPost } from "@/lib/api";

/** Ends every session of the account: this phone, other phones and browsers. */
export function LogoutEverywhereButton() {
  const colors = useColors();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  function confirm() {
    Alert.alert("Wyloguj ze wszystkich urządzeń", "Wszystkie urządzenia, także to, zostaną wylogowane. Zalogujesz się ponownie hasłem.", [
      { text: "Anuluj", style: "cancel" },
      { text: "Wyloguj", style: "destructive", onPress: run },
    ]);
  }

  async function run() {
    setLoading(true);
    try {
      await apiPost("/api/account/logout-everywhere", {});
      await logout();
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Błąd", "Nie udało się wylogować ze wszystkich urządzeń. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={confirm}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Wyloguj ze wszystkich urządzeń"
        testID="button-logout-everywhere"
        style={({ pressed }) => [styles.btn, { borderColor: colors.border, opacity: pressed || loading ? 0.7 : 1 }]}
      >
        <Ionicons name="phone-portrait-outline" size={16} color={colors.foreground} />
        <Text style={[styles.label, { color: colors.foreground }]}>{loading ? "Wylogowuję..." : "Wyloguj ze wszystkich urządzeń"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 4, marginBottom: 8 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
