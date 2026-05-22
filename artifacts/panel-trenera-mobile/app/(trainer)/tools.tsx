import type { ComponentProps } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

interface MenuRowProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  desc?: string;
  colors: ReturnType<typeof useColors>;
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

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

export default function ToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: topPad + 8, backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Narzędzia</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Zarządzanie</Text>
        <MenuRow
          icon="wallet-outline"
          label="Płatności"
          desc="Monitoruj opłaty i wystawiaj faktury"
          colors={colors}
          onPress={() => router.push("/(trainer)/payments")}
          testID="button-tools-payments"
        />
        <MenuRow
          icon="mail-outline"
          label="Zaproszenia"
          desc="Zarządzaj zaproszeniami dla klientów"
          colors={colors}
          onPress={() => router.push("/(trainer)/invitations")}
          testID="button-tools-invitations"
        />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Biblioteka</Text>
        <MenuRow
          icon="barbell-outline"
          label="Biblioteka ćwiczeń"
          desc="Przeglądaj i zarządzaj ćwiczeniami"
          colors={colors}
          onPress={() => router.push("/(trainer)/exercise-library")}
          testID="button-tools-exercise-library"
        />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rozwój</Text>
        <MenuRow
          icon="gift-outline"
          label="Polecenia"
          desc="Program poleceń i Twój unikalny kod"
          colors={colors}
          onPress={() => router.push("/(trainer)/referrals")}
          testID="button-tools-referrals"
        />
        <MenuRow
          icon="globe-outline"
          label="Panel trenera web"
          desc="Otwórz pełny panel w przeglądarce"
          colors={colors}
          onPress={() => openUrl("https://paneltrenera.pl")}
          testID="button-tools-web"
        />
        <MenuRow
          icon="people-outline"
          label="Zaproś klienta"
          desc="Wyślij zaproszenie nowemu klientowi"
          colors={colors}
          onPress={() => openUrl("https://paneltrenera.pl/zaproszenie")}
          testID="button-tools-invite"
        />

        {user?.isAdmin ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Administrator</Text>
            <View style={[styles.adminBanner, { backgroundColor: "#fef3c718", borderColor: "#f59e0b40" }]}>
              <Ionicons name="shield-checkmark" size={16} color="#f59e0b" />
              <Text style={[styles.adminBannerText, { color: "#b45309" }]}>Tryb administratora platformy</Text>
            </View>
            <MenuRow
              icon="business-outline"
              label="Siłownie"
              desc="Twórz i zarządzaj kontami siłowni"
              colors={colors}
              onPress={() => router.push("/(trainer)/admin-gyms")}
              testID="button-tools-admin-gyms"
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stickyHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10, marginTop: 8 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  adminBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  adminBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
