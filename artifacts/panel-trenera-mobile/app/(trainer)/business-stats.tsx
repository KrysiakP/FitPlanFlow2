import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

interface Payment {
  id: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidAt?: string | null;
}

interface ClientWithPlan {
  id: string;
}

const MONTH_LABELS = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];

export default function BusinessStatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: payments, isLoading: loadingPayments, isError: paymentsError, refetch: refetchPayments } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: () => apiGet<Payment[]>("/api/payments"),
  });

  const { data: clients, isLoading: loadingClients, isError: clientsError } = useQuery<ClientWithPlan[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<ClientWithPlan[]>("/api/trainer/clients"),
  });

  const isLoading = loadingPayments || loadingClients;
  const isError = paymentsError || clientsError;

  const stats = useMemo(() => {
    const list = payments ?? [];
    const now = new Date();

    const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const total = list
        .filter((p) => {
          if (!p.isPaid || !p.paidAt) return false;
          const paidDate = new Date(p.paidAt);
          return paidDate.getFullYear() === monthDate.getFullYear() && paidDate.getMonth() === monthDate.getMonth();
        })
        .reduce((sum, p) => sum + p.amount, 0);
      return { label: MONTH_LABELS[monthDate.getMonth()], total: Math.round(total / 100) };
    });

    const maxValue = Math.max(...monthlyRevenue.map((m) => m.total), 1);
    const thisMonthTotal = monthlyRevenue[monthlyRevenue.length - 1]?.total ?? 0;
    const overdueCount = list.filter((p) => !p.isPaid && new Date(p.dueDate) < now).length;

    return { monthlyRevenue, maxValue, thisMonthTotal, overdueCount };
  }, [payments]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.replace("/")} style={({ pressed }) => [{ marginRight: 4 }, { opacity: pressed ? 0.6 : 1 }]} testID="button-back">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Statystyki biznesowe</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 }}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Błąd ładowania</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
            Nie udało się pobrać statystyk.
          </Text>
          <Pressable onPress={() => refetchPayments()} testID="button-retry-business-stats">
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Spróbuj ponownie</Text>
          </Pressable>
        </View>
      ) : (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.thisMonthTotal} zł</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Przychód (ten miesiąc)</Text>
          </View>
          <Pressable
            onPress={() => router.push("/payments")}
            style={({ pressed }) => [
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            testID="button-stat-overdue-payments"
          >
            <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.overdueCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Zaległe płatności</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/clients")}
            style={({ pressed }) => [
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            testID="button-stat-active-clients"
          >
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{(clients ?? []).length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Aktywni podopieczni</Text>
          </Pressable>
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.chartTitle, { color: colors.foreground }]}>Przychód w czasie (6 miesięcy)</Text>
          <View style={styles.chartRow}>
            {stats.monthlyRevenue.map((m) => (
              <View key={m.label} style={styles.chartBarWrap}>
                <View style={styles.chartBarTrack}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        backgroundColor: colors.primary,
                        height: `${Math.max((m.total / stats.maxValue) * 100, m.total > 0 ? 6 : 2)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.chartBarValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {m.total > 0 ? m.total : ""}
                </Text>
                <Text style={[styles.chartBarLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stickyHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8 },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  statValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  chartTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 16 },
  chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 160 },
  chartBarWrap: { flex: 1, alignItems: "center", gap: 4 },
  chartBarTrack: { width: "60%", height: 110, justifyContent: "flex-end" },
  chartBarFill: { width: "100%", borderRadius: 4, minHeight: 2 },
  chartBarValue: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  chartBarLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
