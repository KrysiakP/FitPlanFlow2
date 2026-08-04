import type { ComponentProps } from "react";
import { useMemo } from "react";
import { Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";
import { StatsCard } from "@/components/StatsCard";

type Colors = ReturnType<typeof useColors>;
type IoniconsName = ComponentProps<typeof Ionicons>["name"];

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

export default function TrainerPanelScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: payments, isLoading: loadingPayments, refetch: refetchPayments, isRefetching: refetchingPayments } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: () => apiGet<Payment[]>("/api/payments"),
  });

  const { data: clients, isLoading: loadingClients, refetch: refetchClients, isRefetching: refetchingClients } = useQuery<ClientWithPlan[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<ClientWithPlan[]>("/api/trainer/clients"),
  });

  const isLoading = loadingPayments || loadingClients;
  const isRefetching = refetchingPayments || refetchingClients;

  function handleRefresh() {
    void refetchPayments();
    void refetchClients();
  }

  function openUrl(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  const stats = useMemo(() => {
    const list = payments ?? [];
    const now = new Date();

    const thisMonthTotal = Math.round(
      list
        .filter((p) => {
          if (!p.isPaid || !p.paidAt) return false;
          const paidDate = new Date(p.paidAt);
          return paidDate.getFullYear() === now.getFullYear() && paidDate.getMonth() === now.getMonth();
        })
        .reduce((sum, p) => sum + p.amount, 0) / 100
    );

    const overdueCount = list.filter((p) => !p.isPaid && new Date(p.dueDate) < now).length;

    return { thisMonthTotal, overdueCount };
  }, [payments]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Witaj,</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Pressable onPress={() => router.push("/payments")} style={{ flex: 1 }} testID="button-panel-stat-revenue">
          <StatsCard
            label="Przychód (ten miesiąc)"
            value={isLoading ? "..." : `${stats.thisMonthTotal} zł`}
            iconName="trending-up-outline"
          />
        </Pressable>
        <Pressable onPress={() => router.push("/payments")} style={{ flex: 1 }} testID="button-panel-stat-overdue">
          <StatsCard
            label="Zaległe płatności"
            value={isLoading ? "..." : stats.overdueCount}
            iconName="alert-circle-outline"
            color="#ef4444"
          />
        </Pressable>
        <Pressable onPress={() => router.push("/clients")} style={{ flex: 1 }} testID="button-panel-stat-clients">
          <StatsCard
            label="Aktywni podopieczni"
            value={isLoading ? "..." : (clients?.length ?? 0)}
            iconName="people-outline"
          />
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Szybki dostęp</Text>
      <View style={styles.quickGrid}>
        <QuickCard icon="clipboard-outline" label="Plany treningowe" colors={colors} onPress={() => router.push("/plans")} />
        <QuickCard icon="nutrition-outline" label="Plany diety" colors={colors} onPress={() => router.push("/diets")} />
        <QuickCard icon="stats-chart-outline" label="Statystyki biznesowe" colors={colors} onPress={() => router.push("/business-stats")} />
        <QuickCard icon="wallet-outline" label="Płatności" colors={colors} onPress={() => router.push("/payments")} />
        <QuickCard icon="mail-outline" label="Zaproszenia" colors={colors} onPress={() => router.push("/invitations")} />
        <QuickCard icon="barbell-outline" label="Biblioteka ćwiczeń" colors={colors} onPress={() => router.push("/exercise-library")} />
        <QuickCard icon="timer-outline" label="Timer przerwy" colors={colors} onPress={() => router.push("/rest-timer")} />
        <QuickCard icon="notifications-outline" label="Powiadomienia" colors={colors} onPress={() => router.push("/notifications")} />
        {user?.isAdmin && (
          <QuickCard icon="business-outline" label="Siłownie" colors={colors} onPress={() => router.push("/admin-gyms")} />
        )}
      </View>

      <MenuRow
        icon="gift-outline"
        label="Polecenia"
        desc="Program poleceń i Twój unikalny kod"
        colors={colors}
        onPress={() => router.push("/referrals")}
        testID="button-panel-referrals"
      />
      <MenuRow
        icon="heart-outline"
        label="PomagaMY"
        desc="Zobacz jak pomagamy dzieciom"
        colors={colors}
        onPress={() => router.push("/pomagamy")}
        testID="button-panel-pomagamy"
      />
      <MenuRow
        icon="globe-outline"
        label="Panel trenera web"
        desc="Otwórz pełny panel w przeglądarce"
        colors={colors}
        onPress={() => openUrl("https://paneltrenera.pl")}
        testID="button-panel-web"
      />
      <MenuRow
        icon="people-outline"
        label="Zaproś klienta"
        desc="Wyślij zaproszenie nowemu klientowi"
        colors={colors}
        onPress={() => router.push({ pathname: "/clients", params: { invite: Date.now().toString() } })}
        testID="button-panel-invite"
      />
    </ScrollView>
  );
}

interface MenuRowProps {
  icon: IoniconsName;
  label: string;
  desc?: string;
  colors: Colors;
  onPress: () => void;
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
        {desc ? <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{desc}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

interface QuickCardProps {
  icon: IoniconsName;
  label: string;
  colors: Colors;
  onPress?: () => void;
}

function QuickCard({ icon, label, colors, onPress }: QuickCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  quickCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    alignItems: "flex-start",
  },
  quickLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
