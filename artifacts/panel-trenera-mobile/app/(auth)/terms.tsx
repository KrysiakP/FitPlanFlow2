import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const LAST_UPDATED = "1 maja 2025 r.";
const APP_NAME = "Panel Trenera";
const COMPANY = "Panel Trenera";

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="button-back-terms">
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Regulamin aplikacji</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
          Ostatnia aktualizacja: {LAST_UPDATED}
        </Text>

        <Section title="§1. Postanowienia ogólne" colors={colors}>
          <Paragraph colors={colors}>
            1. Niniejszy Regulamin określa zasady korzystania z aplikacji mobilnej {APP_NAME} (dalej: „Aplikacja"), świadczonej przez {COMPANY} (dalej: „Usługodawca").
          </Paragraph>
          <Paragraph colors={colors}>
            2. Korzystanie z Aplikacji oznacza akceptację niniejszego Regulaminu w całości. Jeśli nie akceptujesz któregokolwiek z postanowień, prosimy o niekorzystanie z Aplikacji.
          </Paragraph>
          <Paragraph colors={colors}>
            3. Regulamin jest dostępny w każdej chwili w Aplikacji oraz na stronie internetowej Usługodawcy.
          </Paragraph>
          <Paragraph colors={colors}>
            4. Usługodawca zastrzega sobie prawo do zmiany Regulaminu. O istotnych zmianach Użytkownicy zostaną poinformowani za pośrednictwem powiadomień w Aplikacji lub wiadomości e-mail.
          </Paragraph>
        </Section>

        <Section title="§2. Definicje" colors={colors}>
          <Paragraph colors={colors}>
            1. <Bold>Aplikacja</Bold> – oprogramowanie {APP_NAME} dostępne na urządzeniach mobilnych (iOS, Android) oraz w przeglądarce internetowej.
          </Paragraph>
          <Paragraph colors={colors}>
            2. <Bold>Użytkownik</Bold> – osoba fizyczna, która zarejestrowała konto w Aplikacji.
          </Paragraph>
          <Paragraph colors={colors}>
            3. <Bold>Trener</Bold> – Użytkownik posiadający konto trenera osobistego, który korzysta z Aplikacji do zarządzania podopiecznymi, planami treningowymi i dietetycznymi.
          </Paragraph>
          <Paragraph colors={colors}>
            4. <Bold>Klient (Podopieczny)</Bold> – Użytkownik posiadający konto klienta, który korzysta z Aplikacji do śledzenia postępów treningowych i realizacji planów.
          </Paragraph>
          <Paragraph colors={colors}>
            5. <Bold>Konto</Bold> – indywidualny profil Użytkownika w Aplikacji, utworzony podczas rejestracji.
          </Paragraph>
          <Paragraph colors={colors}>
            6. <Bold>Dane osobowe</Bold> – informacje o zidentyfikowanej lub możliwej do zidentyfikowania osobie fizycznej.
          </Paragraph>
        </Section>

        <Section title="§3. Rejestracja i konto użytkownika" colors={colors}>
          <Paragraph colors={colors}>
            1. Korzystanie z Aplikacji wymaga rejestracji Konta. Rejestracja jest bezpłatna.
          </Paragraph>
          <Paragraph colors={colors}>
            2. Podczas rejestracji Użytkownik podaje: imię i nazwisko, adres e-mail oraz hasło. Dane muszą być prawdziwe i aktualne.
          </Paragraph>
          <Paragraph colors={colors}>
            3. Użytkownik jest zobowiązany do zachowania hasła w poufności. Usługodawca nie ponosi odpowiedzialności za działania podjęte przez osoby trzecie z użyciem danych logowania Użytkownika.
          </Paragraph>
          <Paragraph colors={colors}>
            4. Jedno konto może być używane wyłącznie przez jedną osobę. Udostępnianie konta osobom trzecim jest zabronione.
          </Paragraph>
          <Paragraph colors={colors}>
            5. Użytkownik może w każdej chwili usunąć swoje konto, kontaktując się z Usługodawcą pod adresem: support@paneltrenera.pl.
          </Paragraph>
          <Paragraph colors={colors}>
            6. Usługodawca zastrzega sobie prawo do zawieszenia lub usunięcia konta Użytkownika w przypadku naruszenia postanowień Regulaminu.
          </Paragraph>
        </Section>

        <Section title="§4. Zakres usług" colors={colors}>
          <Paragraph colors={colors}>
            1. Aplikacja umożliwia Trenerom:
          </Paragraph>
          <BulletList colors={colors} items={[
            "zarządzanie bazą klientów i ich danymi treningowymi,",
            "tworzenie i przypisywanie planów treningowych oraz dietetycznych,",
            "monitorowanie postępów i pomiarów ciała klientów,",
            "komunikację z klientami za pośrednictwem wbudowanego czatu,",
            "wysyłanie zaproszeń do współpracy,",
            "zarządzanie płatnościami.",
          ]} />
          <Paragraph colors={colors}>
            2. Aplikacja umożliwia Klientom:
          </Paragraph>
          <BulletList colors={colors} items={[
            "dostęp do przypisanych planów treningowych i dietetycznych,",
            "rejestrowanie sesji treningowych i logowanie ćwiczeń,",
            "śledzenie postępów i pomiarów ciała,",
            "komunikację z trenerem,",
            "wypełnianie tygodniowych raportów.",
          ]} />
          <Paragraph colors={colors}>
            3. Usługodawca nie gwarantuje osiągnięcia określonych wyników treningowych lub zdrowotnych. Aplikacja jest narzędziem wspomagającym, a nie zastępstwem porady medycznej.
          </Paragraph>
        </Section>

        <Section title="§5. Obowiązki użytkownika" colors={colors}>
          <Paragraph colors={colors}>
            1. Użytkownik zobowiązuje się do:
          </Paragraph>
          <BulletList colors={colors} items={[
            "korzystania z Aplikacji zgodnie z jej przeznaczeniem i obowiązującym prawem,",
            "podawania prawdziwych danych podczas rejestracji i korzystania z Aplikacji,",
            "nieudostępniania swoich danych logowania osobom trzecim,",
            "niezamieszczania treści naruszających prawa osób trzecich, wulgarnych lub niezgodnych z prawem,",
            "niezakłócania działania Aplikacji i jej infrastruktury technicznej.",
          ]} />
          <Paragraph colors={colors}>
            2. Trener korzystający z Aplikacji w celach komercyjnych ponosi pełną odpowiedzialność za jakość świadczonych usług treningowych. Usługodawca nie jest stroną relacji między Trenerem a jego Klientami.
          </Paragraph>
          <Paragraph colors={colors}>
            3. Przed przystąpieniem do nowego programu treningowego zaleca się konsultację z lekarzem, szczególnie w przypadku chorób przewlekłych lub kontuzji.
          </Paragraph>
        </Section>

        <Section title="§6. Płatności i subskrypcja" colors={colors}>
          <Paragraph colors={colors}>
            1. Podstawowe funkcjonalności Aplikacji mogą być dostępne bezpłatnie lub w ramach okresu próbnego.
          </Paragraph>
          <Paragraph colors={colors}>
            2. Dostęp do pełnych funkcji Aplikacji może wymagać wykupienia subskrypcji. Aktualne plany i ceny subskrypcji są dostępne w Aplikacji.
          </Paragraph>
          <Paragraph colors={colors}>
            3. Subskrypcja jest odnawiana automatycznie, chyba że Użytkownik ją anuluje przed upływem bieżącego okresu rozliczeniowego.
          </Paragraph>
          <Paragraph colors={colors}>
            4. Anulowanie subskrypcji nie skutkuje zwrotem opłat za bieżący okres rozliczeniowy.
          </Paragraph>
          <Paragraph colors={colors}>
            5. W sprawach dotyczących rozliczeń prosimy o kontakt pod adresem: support@paneltrenera.pl.
          </Paragraph>
        </Section>

        <Section title="§7. Ochrona danych osobowych" colors={colors}>
          <Paragraph colors={colors}>
            1. Usługodawca przetwarza dane osobowe Użytkowników zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) oraz obowiązującymi przepisami prawa polskiego.
          </Paragraph>
          <Paragraph colors={colors}>
            2. Administratorem danych osobowych jest {COMPANY}.
          </Paragraph>
          <Paragraph colors={colors}>
            3. Dane osobowe Użytkowników są przetwarzane w celach:
          </Paragraph>
          <BulletList colors={colors} items={[
            "świadczenia usług w ramach Aplikacji (podstawa: wykonanie umowy),",
            "obsługi konta i kontaktu z Użytkownikiem,",
            "wypełniania obowiązków prawnych,",
            "zapewnienia bezpieczeństwa usług.",
          ]} />
          <Paragraph colors={colors}>
            4. Użytkownikowi przysługują prawa: dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych oraz wniesienia sprzeciwu.
          </Paragraph>
          <Paragraph colors={colors}>
            5. W sprawach dotyczących danych osobowych prosimy o kontakt: privacy@paneltrenera.pl.
          </Paragraph>
          <Paragraph colors={colors}>
            6. Szczegółowe zasady przetwarzania danych opisuje Polityka Prywatności dostępna w Aplikacji.
          </Paragraph>
        </Section>

        <Section title="§8. Własność intelektualna" colors={colors}>
          <Paragraph colors={colors}>
            1. Wszelkie prawa do Aplikacji, w tym prawa autorskie, znaki towarowe, szata graficzna oraz kod źródłowy, należą do Usługodawcy lub podmiotów, którym Usługodawca udzielił odpowiednich licencji.
          </Paragraph>
          <Paragraph colors={colors}>
            2. Użytkownik nie jest uprawniony do kopiowania, modyfikowania, rozpowszechniania ani tworzenia dzieł zależnych na podstawie Aplikacji bez pisemnej zgody Usługodawcy.
          </Paragraph>
          <Paragraph colors={colors}>
            3. Treści tworzone przez Użytkowników (np. plany treningowe, opisy ćwiczeń) pozostają własnością Użytkownika. Użytkownik udziela Usługodawcy niewyłącznej licencji na ich przechowywanie i wyświetlanie w ramach Aplikacji.
          </Paragraph>
        </Section>

        <Section title="§9. Ograniczenie odpowiedzialności" colors={colors}>
          <Paragraph colors={colors}>
            1. Usługodawca dokłada wszelkich starań, aby Aplikacja działała sprawnie i była dostępna przez całą dobę. Nie gwarantuje jednak nieprzerwanego dostępu i nie ponosi odpowiedzialności za przerwy spowodowane pracami technicznymi lub czynnikami niezależnymi.
          </Paragraph>
          <Paragraph colors={colors}>
            2. Usługodawca nie ponosi odpowiedzialności za:
          </Paragraph>
          <BulletList colors={colors} items={[
            "urazy, kontuzje lub uszczerbek na zdrowiu wynikające z realizacji planów treningowych,",
            "treści zamieszczane przez Użytkowników,",
            "działania Trenerów wobec ich Klientów,",
            "utratę danych spowodowaną działaniem siły wyższej lub błędami Użytkownika.",
          ]} />
          <Paragraph colors={colors}>
            3. Aplikacja nie zastępuje porady lekarskiej, dietetycznej ani psychologicznej.
          </Paragraph>
        </Section>

        <Section title="§10. Reklamacje" colors={colors}>
          <Paragraph colors={colors}>
            1. Reklamacje dotyczące działania Aplikacji można składać na adres e-mail: support@paneltrenera.pl.
          </Paragraph>
          <Paragraph colors={colors}>
            2. Reklamacja powinna zawierać: dane Użytkownika (imię, adres e-mail), opis problemu oraz datę jego wystąpienia.
          </Paragraph>
          <Paragraph colors={colors}>
            3. Usługodawca rozpatruje reklamacje w terminie 14 dni roboczych od ich otrzymania.
          </Paragraph>
        </Section>

        <Section title="§11. Postanowienia końcowe" colors={colors}>
          <Paragraph colors={colors}>
            1. Regulamin podlega prawu polskiemu. Wszelkie spory rozpatrywane są przez sąd właściwy dla siedziby Usługodawcy.
          </Paragraph>
          <Paragraph colors={colors}>
            2. Jeśli którekolwiek z postanowień Regulaminu zostanie uznane za nieważne, pozostałe postanowienia zachowują pełną moc obowiązującą.
          </Paragraph>
          <Paragraph colors={colors}>
            3. W sprawach nieuregulowanych Regulaminem stosuje się przepisy prawa polskiego, w szczególności Kodeksu cywilnego oraz ustawy o świadczeniu usług drogą elektroniczną.
          </Paragraph>
          <Paragraph colors={colors}>
            4. Pytania dotyczące Regulaminu prosimy kierować na adres: support@paneltrenera.pl.
          </Paragraph>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={[sectionStyles.title, { color: colors.foreground }]}>{title}</Text>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

function Paragraph({ children, colors }: { children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[paraStyles.text, { color: colors.foreground }]}>{children}</Text>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontFamily: "Inter_600SemiBold" }}>{children}</Text>;
}

function BulletList({ items, colors }: { items: string[]; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={bulletStyles.wrap}>
      {items.map((item, i) => (
        <View key={i} style={bulletStyles.row}>
          <Text style={[bulletStyles.dot, { color: colors.mutedForeground }]}>{"\u2022"}</Text>
          <Text style={[bulletStyles.text, { color: colors.foreground }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  lastUpdated: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 20, textAlign: "center" },
});

const sectionStyles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  body: { gap: 8 },
});

const paraStyles = StyleSheet.create({
  text: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});

const bulletStyles = StyleSheet.create({
  wrap: { gap: 4, paddingLeft: 4 },
  row: { flexDirection: "row", gap: 8 },
  dot: { fontSize: 14, lineHeight: 22, width: 12 },
  text: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});
