import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { ClientCard } from "@/components/ClientCard";
import { apiGet } from "@/lib/api";

interface ClientWithPlan {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  assignment?: {
    plan?: { id: string; name: string } | null;
  } | null;
}

export default function TrainerClientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, bearerToken } = useAuth();
  const [search, setSearch] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<ClientWithPlan[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<ClientWithPlan[]>("/api/trainer/clients", bearerToken),
    enabled: !!user?.id,
  });

  const clients = (data ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.headerSection, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Klienci</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "1a" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{data?.length ?? 0}</Text>
          </View>
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Szukaj klientów..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            testID="input-search-clients"
          />
          {search.length > 0 && (
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} onPress={() => setSearch("")} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : clients.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "Brak wyników" : "Brak klientów"}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {search ? `Nie znaleziono klientów dla "${search}"` : "Zaproś pierwszego klienta przez stronę paneltrenera.pl"}
            </Text>
          </View>
        ) : (
          clients.map((c) => (
            <ClientCard
              key={c.id}
              name={`${c.firstName} ${c.lastName}`}
              email={c.email}
              planName={c.assignment?.plan?.name ?? null}
              onPress={() => router.push(`/(trainer)/client/${c.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerSection: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  loader: { marginTop: 40 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
