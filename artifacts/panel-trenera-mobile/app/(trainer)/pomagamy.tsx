import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

const POLISH_MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

interface CharityDonation {
  id: string;
  month: number;
  year: number;
  documentUrl: string;
  uploadedAt: string;
}

export default function PomagamyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: donations, isLoading } = useQuery<CharityDonation[]>({
    queryKey: ["charity-donations"],
    queryFn: () => apiGet<CharityDonation[]>("/api/charity-donations"),
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.replace("/panel")} style={({ pressed }) => [{ marginRight: 4 }, { opacity: pressed ? 0.6 : 1 }]} testID="button-back">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>PomagaMY</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <Ionicons name="heart" size={32} color="#ef4444" />
        </View>
        <Text style={[styles.missionTitle, { color: colors.foreground }]}>
          Pomagamy dzieciom dorastać silnym. W ciele i w życiu.
        </Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          Wierzymy, że ruch i zdrowie nie powinny być luksusem. Dlatego{" "}
          <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
            1% przychodu z tej aplikacji
          </Text>{" "}
          przeznaczamy na wsparcie dzieci, które potrzebują dostępu do sportu, posiłków i bezpiecznego rozwoju.
        </Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          Każdy trener i podopieczny, który korzysta z naszej aplikacji, dokłada swoją cegiełkę do czegoś
          większego.{" "}
          <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
            Każdy trening to wyciągnięcie ręki
          </Text>{" "}
          do tych, którzy potrzebują pomocy.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.primary + "0d", borderColor: colors.primary + "33" }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Na co przeznaczamy wsparcie:</Text>
          {[
            "Zakup sprzętu sportowego dla dzieci i klubów szkolnych",
            "Dofinansowanie zajęć sportowych dla dzieci z domów dziecka",
            "Programy zapewniające posiłki w szkołach",
          ].map((item) => (
            <View key={item} style={styles.checkRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={[styles.checkText, { color: colors.foreground }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Jak działamy:</Text>
          <Text style={[styles.paragraph, { color: colors.mutedForeground, marginBottom: 10 }]}>
            Co miesiąc przekazujemy 1% przychodów na wybrane inicjatywy i publikujemy raport, aby każdy mógł
            zobaczyć realny wpływ.
          </Text>
          <Text style={[styles.bulletText, { color: colors.foreground }]}>
            👉 Raporty miesięczne: <Text style={{ color: colors.primary }}>Poniżej na tej stronie</Text>
          </Text>
          <Text style={[styles.bulletText, { color: colors.foreground }]}>
            👉 Głosowanie społeczności: Raz na kwartał trenerzy wybierają cel wsparcia
          </Text>
        </View>

        <Text style={[styles.closingText, { color: colors.foreground }]}>
          Twoja praca zmienia więcej niż jedną osobę. Zmienia pokolenia.
        </Text>
        <Text style={[styles.closingSubtext, { color: colors.mutedForeground }]}>
          Dziękujemy, że jesteś częścią tego ruchu. 💚
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Raporty miesięczne</Text>

        {isLoading ? (
          <Text style={{ color: colors.mutedForeground }}>Ładowanie...</Text>
        ) : donations && donations.length > 0 ? (
          donations.map((donation) => (
            <View key={donation.id} style={[styles.donationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.donationTitle, { color: colors.foreground }]}>
                {POLISH_MONTHS[donation.month - 1]} {donation.year}
              </Text>
              <View style={styles.checkRow}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={[styles.verifiedText, { color: colors.mutedForeground }]}>Zweryfikowane</Text>
              </View>
              <Pressable
                onPress={() => Linking.openURL(donation.documentUrl).catch(() => {})}
                style={[styles.docLink, { borderColor: colors.primary + "40" }]}
              >
                <Ionicons name="open-outline" size={16} color={colors.primary} />
                <Text style={[styles.docLinkText, { color: colors.primary }]}>Zobacz potwierdzenie</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center" }]}>
            <Ionicons name="heart-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: "center", marginTop: 10 }]}>
              Wkrótce opublikujemy pierwsze potwierdzenie
            </Text>
            <Text style={[styles.paragraph, { color: colors.mutedForeground, textAlign: "center" }]}>
              Raporty będą publikowane miesięcznie
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stickyHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 20 },
  heroRow: { alignItems: "center", marginBottom: 12 },
  missionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 16 },
  paragraph: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  checkText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  bulletText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6, lineHeight: 19 },
  closingText: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 8 },
  closingSubtext: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, marginBottom: 8 },
  divider: { height: 1, marginVertical: 24 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 14, textAlign: "center" },
  donationCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  donationTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  verifiedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  docLink: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, alignSelf: "flex-start", marginTop: 10 },
  docLinkText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
