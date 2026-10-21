/** Articles for trainers (SEO). Plain data, so a new article is one more entry; the sitemap must list every slug (tests check it). */

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export interface Article {
  slug: string;
  title: string;
  description: string; // meta description, at most 160 characters
  date: string; // YYYY-MM-DD
  blocks: Block[];
}

export const ARTICLES: Article[] = [
  {
    slug: "jak-prowadzic-podopiecznych-online",
    title: "Jak prowadzić podopiecznych online: 7 zasad, które działają",
    description: "Praktyczne zasady pracy trenera personalnego zdalnie: jasny plan, regularny kontakt, raporty tygodniowe i jedna lista spraw do zrobienia każdego dnia.",
    date: "2026-10-21",
    blocks: [
      { type: "p", text: "Prowadzenie podopiecznych online daje wolność: nie ograniczają Cię godziny na siłowni ani lokalizacja. Ma jednak swoją cenę. Nie widzisz, jak ktoś trenuje, nie zauważysz po minie, że plan jest za ciężki, a podopieczny łatwiej znika po dwóch tygodniach. Te siedem zasad pomaga zachować jakość pracy bez rosnącego chaosu." },
      { type: "h2", text: "1. Jeden jasny plan zamiast wielu wiadomości" },
      { type: "p", text: "Plan treningowy powinien być w jednym miejscu, z ćwiczeniami, seriami, powtórzeniami i obciążeniem. Podopieczny, który musi szukać instrukcji w wiadomościach z trzech tygodni, w końcu przestanie szukać. Plan trzymany w aplikacji jest zawsze aktualny i pod ręką, także na siłowni." },
      { type: "h2", text: "2. Ustal rytm kontaktu na początku" },
      { type: "p", text: "Powiedz wprost, kiedy odpowiadasz i jak często się odzywasz: na przykład raport w niedzielę, odpowiedź do wtorku. Przewidywalność chroni Ciebie przed wiadomościami o każdej porze i podopiecznego przed czekaniem na odpowiedź bez końca." },
      { type: "h2", text: "3. Raport tygodniowy jako rdzeń współpracy" },
      { type: "p", text: "Raz w tygodniu podopieczny wysyła krótki raport: waga, pomiary, samopoczucie, ewentualnie zdjęcie. To Twoje główne źródło wiedzy o tym, czy plan działa. Im prostszy formularz, tym większa szansa, że będzie wypełniany." },
      { type: "h2", text: "4. Patrz na trend, nie na pojedynczy pomiar" },
      { type: "p", text: "Waga potrafi skoczyć o kilogram z powodu wody czy soli. Oceniaj kierunek z kilku tygodni, nie jeden pomiar. To samo dotyczy siły: liczy się, czy szacowane maksimum rośnie w czasie, a nie wynik jednego słabszego dnia." },
      { type: "h2", text: "5. Zacznij dzień od osób, które Cię potrzebują" },
      { type: "p", text: "Przy kilkunastu podopiecznych łatwo przeoczyć kogoś, kto ucichł. Prosta lista na rano pomaga:" },
      { type: "ul", items: ["kto zalega z płatnością,", "kto od dwóch tygodni nie trenował,", "kto nie ma jeszcze przypisanego planu,", "kto wysłał nowy raport i czeka na komentarz."] },
      { type: "h2", text: "6. Reaguj na brak aktywności, zanim stanie się rezygnacją" },
      { type: "p", text: "Krótka wiadomość po tygodniu ciszy („Hej, jak tydzień? Coś nie pasuje w planie?”) zdziała więcej niż próba odzyskania kogoś po miesiącu. Większość osób nie znika z powodu planu, tylko z powodu poczucia, że nikt nie zauważy ich nieobecności." },
      { type: "h2", text: "7. Dbaj o to, co poza treningiem" },
      { type: "p", text: "Płatności, terminy sesji, przypomnienia i notatki o kontuzjach to administracja, która zabiera czas i energię. Im mniej w głowie, a więcej w jednym narzędziu, tym więcej uwagi zostaje na to, za co Ci płacą: na prowadzenie ludzi." },
      { type: "p", text: "Dobrze prowadzona współpraca online nie wymaga więcej pracy niż stacjonarna, ale wymaga porządku. Zacznij od planu w jednym miejscu i prostego raportu tygodniowego, resztę dołożysz z czasem." },
    ],
  },
  {
    slug: "plan-treningowy-online-jak-zbudowac",
    title: "Plan treningowy online: jak go zbudować, żeby podopieczny wytrwał",
    description: "Jak zbudować plan treningowy dla podopiecznego pracującego zdalnie: realistyczna liczba treningów, progresja obciążeń, jasne instrukcje i regularna weryfikacja.",
    date: "2026-10-21",
    blocks: [
      { type: "p", text: "Najlepszy plan na papierze nic nie da, jeśli podopieczny nie zrealizuje go przez trzy miesiące. Plan online musi być przy tym samodzielny: nikt nie stoi obok i nie poprawia na bieżąco. Oto jak go zbudować, żeby działał mimo to." },
      { type: "h2", text: "Dopasuj liczbę treningów do życia podopiecznego" },
      { type: "p", text: "Pięć treningów w tygodniu brzmi świetnie, dopóki ktoś nie ma dzieci, pracy na zmiany i dwóch godzin dojazdu. Trzy realistyczne treningi wygrywają z pięcioma, z których realizuje się dwa. Zapytaj o dostępne dni i zaplanuj plan na nie, a nie na ideał." },
      { type: "h2", text: "Zapisz wszystko, czego nie możesz pokazać na żywo" },
      { type: "p", text: "Przy każdym ćwiczeniu podaj liczbę serii, powtórzeń, odpoczynek i obciążenie startowe. Dodaj film lub opis techniki i jedną uwagę o tym, na co uważać. Podopieczny, który ma wątpliwość w trakcie serii, nie będzie do Ciebie pisał, tylko zrobi po swojemu albo opuści ćwiczenie." },
      { type: "h2", text: "Zaplanuj progresję od pierwszego dnia" },
      { type: "p", text: "Prosta zasada podwójnej progresji sprawdza się u większości początkujących i średnio zaawansowanych: gdy w zakresie powtórzeń (na przykład 8 do 10) wszystkie serie dojdą do górnej granicy, dodaj obciążenie, najczęściej 2,5 kg. Dzięki temu podopieczny wie, co ma robić na kolejnym treningu, a Ty nie musisz co tydzień przepisywać planu." },
      { type: "h2", text: "Mierz to, co pokazuje postęp" },
      { type: "p", text: "Zapis wyników serii pozwala policzyć szacowane maksimum na jedno powtórzenie i zobaczyć trend. To lepszy sygnał niż samopoczucie, bo widać, czy plan prowadzi tam, gdzie miał. Jeśli przez trzy tygodnie nic się nie zmienia, zmień plan, a nie podopiecznego." },
      { type: "h2", text: "Zostaw miejsce na korektę" },
      { type: "ul", items: ["po dwóch tygodniach zapytaj, co jest za ciężkie, a co za lekkie,", "po miesiącu przejrzyj raporty i dostosuj objętość,", "po trzech miesiącach zrób przegląd celu: czy dalej jest ten sam, czy się zmienił."] },
      { type: "h2", text: "Błędy, które najczęściej psują plan" },
      { type: "ul", items: ["zbyt wiele ćwiczeń w jednym treningu, więc końcówka jest odpuszczana,", "brak lżejszego tygodnia po kilku tygodniach narastającego obciążenia,", "obciążenia podane w kilogramach, których podopieczny nie ma jak sprawdzić w swojej siłowni,", "zmiana całego planu po jednym słabym tygodniu zamiast drobnej korekty."] },
      { type: "p", text: "Co kilka tygodni warto zaplanować tydzień z mniejszą objętością: ciało się regeneruje, a podopieczny wraca do ciężkich treningów z większą energią. Wyjaśnij to z góry, żeby lżejszy tydzień nie wyglądał jak spadek formy." },
      { type: "p", text: "Dobry plan online jest prosty, kompletny i żywy: łatwo go zrealizować samemu, a Ty widzisz po wynikach, kiedy czas go zmienić." },
    ],
  },
  {
    slug: "raport-tygodniowy-podopiecznego",
    title: "Raport tygodniowy podopiecznego: co w nim zbierać i jak go czytać",
    description: "Co powinien zawierać raport tygodniowy w pracy zdalnej trenera: waga, pomiary, samopoczucie, zdjęcie. I jak odczytywać trend zamiast pojedynczych liczb.",
    date: "2026-10-21",
    blocks: [
      { type: "p", text: "Raport tygodniowy to najtańszy sposób, żeby widzieć, co dzieje się z podopiecznym między treningami. Działa tylko wtedy, gdy jest krótki i regularny. Za długi formularz przestaje być wypełniany po trzecim tygodniu." },
      { type: "h2", text: "Co zbierać" },
      { type: "ul", items: ["waga rano, na czczo, w podobnych warunkach,", "kilka pomiarów obwodów: talia, biodra, klatka, ramię, udo,", "samopoczucie, sen i poziom energii w trzech słowach,", "krótka uwaga: co się udało, co przeszkadzało,", "co jakiś czas zdjęcie sylwetki w tym samym świetle i ustawieniu."] },
      { type: "h2", text: "Jak często i kiedy" },
      { type: "p", text: "Raz w tygodniu, w stały dzień, najlepiej w niedzielę lub poniedziałek. Stała pora pozwala wyrobić nawyk. Przypomnienie dzień wcześniej znacznie podnosi odsetek wypełnionych raportów, bo wielu podopiecznych po prostu zapomina." },
      { type: "h2", text: "Jak czytać wyniki" },
      { type: "p", text: "Pojedyncza waga niewiele mówi. Patrz na średnią z dwóch do czterech tygodni i na pomiary obwodów: talia może maleć mimo że waga stoi w miejscu, bo rośnie masa mięśniowa. Zdjęcia porównuj ze sobą w parze: pierwsze z ostatnim, a nie dwa kolejne tygodnie." },
      { type: "h2", text: "Odpowiadaj, nawet krótko" },
      { type: "p", text: "Raport bez odpowiedzi uczy podopiecznego, że nikt go nie czyta. Wystarczą dwa zdania: co widzisz dobrego i jedna rzecz do zmiany w przyszłym tygodniu. To buduje zaufanie bardziej niż długa analiza raz na miesiąc." },
      { type: "h2", text: "Dane zdrowotne wymagają ostrożności" },
      { type: "p", text: "Zdjęcia sylwetki i informacje o kontuzjach to dane wrażliwe. Wybieraj narzędzia, w których zdjęcia widzi tylko podopieczny i jego trener, a podopieczny może zobaczyć, kto i kiedy oglądał jego dane. Zadbaj też o to, by mógł je w każdej chwili pobrać i usunąć konto." },
    ],
  },
];

export const wordCount = (article: Article): number =>
  article.blocks.reduce((sum, block) => sum + (block.type === "ul" ? block.items.join(" ") : block.text).split(/\s+/).filter(Boolean).length, 0);
