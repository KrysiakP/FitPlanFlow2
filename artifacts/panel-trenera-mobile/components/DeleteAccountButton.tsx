import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiPost } from "@/lib/api";

export function DeleteAccountButton() {
  const colors = useColors();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  function handlePress() {
    Alert.alert(
      "Usuń konto",
      "Czy na pewno chcesz usunąć swoje konto? Ta operacja jest nieodwracalna. Twoje dane zostaną usunięte w ciągu 30 dni.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń konto",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  }

  async function confirmDelete() {
    setLoading(true);
    try {
      await apiPost("/api/account/delete-request", {});
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Prośba przyjęta",
        "Twoja prośba o usunięcie konta została zarejestrowana. Konto zostanie usunięte w ciągu 30 dni. Zostaniesz teraz wylogowany.",
        [
          {
            text: "OK",
            onPress: async () => {
              await logout();
              router.replace("/(auth)/login");
            },
          },
        ]
      );
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Błąd", "Nie udało się wysłać prośby o usunięcie konta. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={handlePress}
        disabled={loading}
        testID="button-delete-account"
        style={({ pressed }) => [
          styles.btn,
          {
            borderColor: colors.destructive + "33",
            opacity: pressed || loading ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons name="trash-outline" size={16} color={colors.destructive} />
        <Text style={[styles.label, { color: colors.destructive }]}>
          {loading ? "Wysyłanie..." : "Usuń konto"}
        </Text>
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
