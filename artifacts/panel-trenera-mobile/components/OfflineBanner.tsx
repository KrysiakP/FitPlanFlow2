import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { subscribeOffline } from "@/context/AuthContext";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => subscribeOffline(setOffline), []);

  if (!offline) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      style={[styles.banner, { top: insets.top + 4 }]}
      testID="banner-offline"
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={styles.text}>Brak połączenia z internetem</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    zIndex: 1000,
    elevation: 6,
  },
  text: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
