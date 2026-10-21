import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

/** GDPR data portability: opens the share sheet with the user's data as JSON (save to Files, send to e-mail, ...). */
export function ExportDataButton() {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/account/export");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.text();
      await Share.share({ title: "Moje dane z Panelu Trenera", message: json });
    } catch {
      Alert.alert("Błąd", "Nie udało się pobrać Twoich danych. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Pobierz moje dane"
        testID="button-export-data"
        style={({ pressed }) => [styles.btn, { borderColor: colors.border, opacity: pressed || loading ? 0.7 : 1 }]}
      >
        <Ionicons name="download-outline" size={16} color={colors.foreground} />
        <Text style={[styles.label, { color: colors.foreground }]}>{loading ? "Przygotowuję..." : "Pobierz moje dane"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 4, marginBottom: 8 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
