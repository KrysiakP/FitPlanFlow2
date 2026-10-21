import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

interface AccessEntry {
  id: string;
  what: string;
  by: string;
  at: string;
}

/** Who (a trainer) opened which part of my data. */
export default function AccessLogScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["access-log"],
    queryFn: () => apiGet<{ entries: AccessEntry[] }>("/api/account/access-log"),
  });
  const entries = data?.entries ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Wróć" testID="button-back">
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Wstecz</Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]}>Kto oglądał moje dane</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Twój trener widzi tylko to, co jest potrzebne do pracy z Tobą. Tu zobaczysz, kiedy i co otworzył.
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>Nie udało się pobrać historii. Spróbuj ponownie później.</Text>
      ) : entries.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground }]} testID="text-access-log-empty">Na razie nikt nie otwierał Twoich danych.</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.what, { color: colors.foreground }]}>
                {item.by} otworzył(a): {item.what}
              </Text>
              <Text style={[styles.when, { color: colors.mutedForeground }]}>
                {new Date(item.at).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  back: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8, alignSelf: "flex-start" },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 20 },
  empty: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 24, textAlign: "center" },
  row: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8, gap: 4 },
  what: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  when: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
