import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const WEB_PANEL_URL = "https://paneltrenera.pl";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const FEATURES: { icon: IoniconsName; text: string }[] = [
  { icon: "fitness-outline", text: "Plany treningowe dopasowane do Ciebie" },
  { icon: "nutrition-outline", text: "Diety i jadłospisy od trenera" },
  { icon: "trending-up-outline", text: "Śledzenie postępów w jednym miejscu" },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.hero}>
        <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>PT</Text>
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>Panel Trenera</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Profesjonalne zarządzanie treningami i dietą
        </Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((item) => (
          <View key={item.text} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + "18" }]}>
              <Ionicons name={item.icon} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{item.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="button-go-register"
        >
          <Text style={styles.primaryBtnText}>Zarejestruj się jako klient</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="button-go-login"
        >
          <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Mam już konto</Text>
        </Pressable>

        <View style={[styles.trainerRow, { borderTopColor: colors.border }]}>
          <Ionicons name="barbell-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.trainerText, { color: colors.mutedForeground }]}>
            Jesteś trenerem?{" "}
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(WEB_PANEL_URL)}
            testID="button-trainer-login"
          >
            <Text style={[styles.trainerLink, { color: colors.primary }]}>
              Otwórz panel na paneltrenera.pl
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  hero: {
    alignItems: "center",
    paddingTop: 60,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: {
    color: "#fff",
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  appName: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
    textAlign: "center",
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },
  features: {
    gap: 14,
    paddingVertical: 40,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    paddingBottom: 16,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  trainerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    flexWrap: "wrap",
  },
  trainerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  trainerLink: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
