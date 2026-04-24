import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { StatsCard } from "@/components/StatsCard";
import { apiGet } from "@/lib/api";

type Colors = ReturnType<typeof useColors>;
type IoniconsName = ComponentProps<typeof Ionicons>["name"];

interface Assignment {
  plan?: {
    name: string;
    description?: string | null;
  } | null;
}

export default function ClientDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, bearerToken } = useAuth();

  const { data: assignment, isLoading, refetch, isRefetching } = useQuery<Assignment>({
    queryKey: ["client-assignment"],
    queryFn: () => apiGet<Assignment>(`/api/plan-assignment/${user?.id}`, bearerToken),
    enabled: !!user?.id,
    retry: 1,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 },
      ]}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
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

      <View style={[styles.planCard, { backgroundColor: colors.primary }]}>
        <View style={styles.planTop}>
          <Ionicons name="barbell" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.planLabel}>Aktywny plan</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : assignment?.plan ? (
          <>
            <Text style={styles.planName}>{assignment.plan.name}</Text>
            {assignment.plan.description && (
              <Text style={styles.planDesc}>{assignment.plan.description}</Text>
            )}
          </>
        ) : (
          <Text style={styles.planName}>Brak przypisanego planu</Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Podsumowanie</Text>
      <View style={styles.statsRow}>
        <StatsCard
          label="Treningi"
          value="0"
          iconName="barbell-outline"
          color={colors.primary}
        />
        <StatsCard
          label="Tydzień"
          value="1"
          iconName="calendar-outline"
          color="#16a34a"
        />
        <StatsCard
          label="Postęp"
          value="0%"
          iconName="trending-up-outline"
          color="#d97706"
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Szybki dostęp</Text>
      <View style={styles.quickGrid}>
        <QuickCard icon="barbell-outline" label="Plan treningowy" colors={colors} />
        <QuickCard icon="nutrition-outline" label="Dieta" colors={colors} />
        <QuickCard icon="trending-up-outline" label="Postępy" colors={colors} />
        <QuickCard icon="chatbubble-outline" label="Wiadomości" colors={colors} />
      </View>
    </ScrollView>
  );
}

interface QuickCardProps {
  icon: IoniconsName;
  label: string;
  colors: Colors;
}

function QuickCard({ icon, label, colors }: QuickCardProps) {
  return (
    <Pressable
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
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 8,
  },
  planTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  planLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  planName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  planDesc: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
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
});
