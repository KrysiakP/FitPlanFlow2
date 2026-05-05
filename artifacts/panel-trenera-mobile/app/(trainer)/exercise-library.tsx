import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

interface Exercise {
  id: string;
  name: string;
  description?: string | null;
  videoUrl?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultLoad?: string | null;
  defaultRestTime?: number | null;
  trainerId?: string | null;
}

interface ExerciseFormState {
  name: string;
  description: string;
  videoUrl: string;
  defaultSets: string;
  defaultReps: string;
  defaultLoad: string;
  defaultRestTime: string;
}

const EMPTY_FORM: ExerciseFormState = {
  name: "",
  description: "",
  videoUrl: "",
  defaultSets: "",
  defaultReps: "",
  defaultLoad: "",
  defaultRestTime: "",
};

function exerciseToForm(ex: Exercise): ExerciseFormState {
  return {
    name: ex.name ?? "",
    description: ex.description ?? "",
    videoUrl: ex.videoUrl ?? "",
    defaultSets: ex.defaultSets != null ? String(ex.defaultSets) : "",
    defaultReps: ex.defaultReps != null ? String(ex.defaultReps) : "",
    defaultLoad: ex.defaultLoad ?? "",
    defaultRestTime: ex.defaultRestTime != null ? String(ex.defaultRestTime) : "",
  };
}

const PRESET_EXERCISES: string[] = [
  "Wyciskanie sztangi na ławce płaskiej","Wyciskanie hantli na ławce płaskiej","Wyciskanie na maszynie pneumatycznej","Rozpiętki hantli na ławce płaskiej","Rozpiętki na maszynie motylkowej","Rozpiętki na linie skrzyżowanej","Pull-overy z hantlą","Pull-overy na maszynie","Wyciskanie sztangi na ławce pochyłej","Wyciskanie hantli na ławce pochyłej","Wyciskanie sztangi na ławce ujemnej","Wyciskanie hantli na ławce ujemnej","Rozpiętki hantli na ławce pochyłej","Rozpiętki na linie skrzyżowanej (górna)","Wyciskanie sztangi do klatki piersiowej na maszynie Smith","Wyciskanie hantli na ławce Smith","Uciśnięcia z liny na klatce","Wyciskanie sztangi na ławce Smitha pochyłej","Dumbbell press na podłodze","Push-ups zwykłe","Push-ups szerokie","Push-ups wąskie","Push-ups diamendowe","Push-ups na deklinacji","Push-ups na inklinacji","Przyciągi sztangi do klatki","Przyciągi hantli do klatki","Przyciągi na maszynie rządowej","Przyciągi na maszynie pneumatycznej","Przyciągi liny do klatki","Przyciągi szerokie na linie skrzyżowanej","Przyciągi wąskie na linie skrzyżowanej","Przyciągi na pochyłej linie","Przyciągi na maszynie Smith","Przyciągi jednoręczne na linie","Przedni pull down na linie","Przyciągi tyłem głowy na linie","Przyciągi z hantlą jednoręczne","Przyciągi z kettlebell","Wyciskanie sztangi nad głową","Wyciskanie hantli nad głową","Wyciskanie sztangi sztaba nad głową (military press)","Wyciskanie hantli nad głową (dumbbell shoulder press)","Wyciskanie na maszynie pressa ramion","Wyciskanie na linie skrzyżowanej","Wyciskanie Arnold (Arnold press)","Podnoszenia hantli boczne","Podnoszenia hantli boczne na maszynie kablowej","Podnoszenia sztangi do brody (upright row)","Podnoszenia liny do brody","Podnoszenia hantli do brody","Podnoszenia ramion z hantlami","Podnoszenia ramion na maszynie","Podnoszenia ramion z kettlebell","Skłony głowy do przodu na maszynie","Skłony głowy na maszynie blokującej","Ty-raisy (podnoszenia hantli w przód)","Ty-raisy na maszynie kablowej","Reverse pec deck (reverse flyes)","Reverse pec deck na maszynie","Ty-raisy z liną","Ty-raisy w przekroczeniu (crossover)","Ty-raisy jednoręczne z hantlą","Żuraw","Żuraw na maszynie","Żuraw jedno nóżka","Przyciąg pionowy (lat pulldown)","Przyciąg pionowy wąski","Przyciąg pionowy szerokie uchwyty","Przyciąg za głowę (behind the neck lat pulldown)","Przyciąg na maszynie pneumatycznej","Przyciąg na maszynie rządowej","Podciągania na drążku (pull-ups)","Podciągania szerokie (wide grip pull-ups)","Podciągania wąskie (close grip pull-ups)","Podciągania neutralnym uchwytem","Podciągania za głowę","Podciągania australijskie","Podciągania na asystującym urządzeniu","Przyciągania (lat pull down) na linie","Przyciąg hantli do klatki (single arm row)","Przyciąg sztangi do klatki","Przyciąg hantli do klatki (one arm dumbbell row)","Przyciąg sztangi do klatki na maszynie Smith","Przyciąg sztangi w pozycji nachylonej (bent over row)","Przyciąg hantli w pozycji nachylonej","Przyciąg sztangi na maszynie T-bar","Przyciąg na maszynie rządowej (machine row)","Przyciąg na maszynie pneumatycznej","Przyciąg na linie (cable row)","Przyciąg jedno-ręczny na linie","Przyciąg jedno-ręczny na maszynie","Przyciąg ze zmianią uchwytu","Przyciąg z kettlebell","Przyciąg z kablem na tulejach","Przyciąg na drążku (pendulum row)","Przyciąg do klatki v-bar","Przyciąg do klatki na posadzeniu (seated row)","Przyciąg na maszynie posiadania linii","Przyciąg hantli w staniu","Shrugs ze sztangą","Shrugs z hantlami","Shrugs na maszynie","Shrugs na maszynie Smith","Shrugs z kettlebell","Shrugs na linie skrzyżowanej","Shrugs jedno-ręczne","Wyprostowania tułowia (back extensions)","Wyprostowania tułowia na maszynie","Wyprostowania tułowia na ziemi","Superman","Superman na maszynie","Twisting crunches (skręty w tułowiu)","Crunches brzuszne","Crunches na maszynie","Crunches na linie","Crunches na siedzisku","Hanging leg raises","Leg raises na równoległym drążku","Leg raises na urządzeniu do podciągów","Podnoszenia nóg w zwisie","Podnoszenia nóg nad drażek","Podnoszenia nóg siedząc","Podnoszenia nóg leżąc","Situps na maszynie","Situps na ławce pochyłej","Situps zwykłe","Skręty na maszynie","Skręty w pozycji siedzącej","Skręty w pozycji leżącej","Cable wood chops","Rotacje z kettlebell","Rotacje z hantlą","Landmine rotations","Planks","Planks boczne (side planks)","Planks dynamiczne","Hollow body holds","Ab wheel rollouts","Palof press","Pallof holds","Squats ze sztangą (przysiady)","Squats z hantlami","Squats na maszynie Smith","Squats na maszynie pneumatycznej","Hack squats","V-squats","Squats na maszynie do przysiadów","Squats goblet","Squats bułgarskie (Bulgarian split squats)","Squats rozdzielone","Squats jednoręczne","Squats pistol","Lunges (wypadki)","Lunges do przodu","Lunges do tyłu","Lunges boczne","Lunges z hantlami","Lunges ze sztangą","Lunges na maszynie Smith","Lunges na maszynie do szkolenia kończyn","Walking lunges","Jumping lunges","Reverse lunges","Leg press","Leg press (maszyna do przysiadów)","Leg press wąski","Leg press szeroki","Leg press jednoręczny","V-leg press","Hack leg press","Leg press siedział","Leg press na maszynie pneumatycznej","Rozciągania nóg (leg extensions)","Leg extensions na maszynie","Leg extensions jednoróżne","Leg extensions na siedzisku","Leg extensions w staniu","Leg extensions na linie","Leg extensions z hantlą","Leg extensions z kettlebell","Zginania nóg (leg curls)","Leg curls leżące","Leg curls siedząc","Leg curls stojąc","Leg curls na maszynie pneumatycznej","Leg curls jednonogie","Leg curls na linie","Leg curls z hantlą","Leg curls z kettlebell","Rumańskie martwe ciągi (Romanian deadlifts)","Rumańskie martwe ciągi z hantlami","Rumańskie martwe ciągi na maszynie Smith","Martwe ciągi (deadlifts)","Martwe ciągi konwencjonalne","Martwe ciągi sumo","Martwe ciągi na parapecie","Martwe ciągi z hantlami","Martwe ciągi na maszynie Smith","Trap bar deadlifts","Martwe ciągi jednoręczne","Martwe ciągi jednonóżne","Martwe ciągi na maszynie","Martwe ciągi na ziemi","Good mornings","Good mornings ze sztangą","Good mornings z hantlą","Good mornings na maszynie","Good mornings na linie","Hipereksensje (hyperextensions)","Hipereksensje na maszynie","Hipereksensje na ławce","Hipereksensje jednonóżne","Hipereksensje z hantlą","Hipereksensje z kettlebell","Głowica przyciąg (stiff legged deadlifts)","Stiff legged deadlifts ze sztangą","Stiff legged deadlifts z hantlami","Stiff legged deadlifts na maszynie","Abdukcja bioder (hip abduction)","Hip abduction na maszynie","Hip abduction z hantlą","Hip abduction z kettlebell","Hip abduction na linie","Addukcja bioder (hip adduction)","Hip adduction na maszynie","Hip adduction z hantlą","Hip adduction z kettlebell","Hip adduction na linie","Rotacja bioder","Hip rotations wewnętrzne","Hip rotations zewnętrzne","Hip thrusts","Hip thrusts na ławce","Hip thrusts ze sztangą","Hip thrusts z hantlą","Hip thrusts na maszynie","Hip thrusts jednonóżne","Glute bridges","Glute bridges na ławce","Glute bridges ze sztangą","Glute bridges z hantlą","Glute bridges jednonóżne","Calf raises (podnoszenia na palce)","Calf raises na maszynie","Calf raises ze sztangą","Calf raises z hantlami","Calf raises jednoróżne","Calf raises siedząc","Calf raises na drążku","Calf raises na podium","Calf raises na maszynie Smith","Calf raises na linie","Donkey calf raises","Calf raises na schodach","Hack calf raises","Wyciskanie sztangi leżąc na ławce","Wyciskanie hantli leżąc","Wyciskanie sztangi na maszynie","Wyciskanie hantli na maszynie","Wyciskanie na linie","Wyciskanie sztangi wąskie (close grip bench press)","Wyciskanie hantli wąskie","Wyciskanie na linie wąskie","Wyciskanie sztangi szerokie","Wyciskanie hantli szerokie","Wyciskanie Spoto (paused bench press)","Wyciskanie Smith bench press","Triceps dips","Dips asystujące","Triceps kickbacks","Triceps kickbacks z hantlą","Triceps kickbacks na linie","Triceps kickbacks jednoręczne","Triceps pushdowns (wciśnięcia w dół na linie)","Triceps pushdowns na linie","Triceps pushdowns z linką skakanką","Triceps pushdowns v-bar","Triceps pushdowns obrotowe","Triceps pushdowns jednoręczne","Triceps pushdowns na maszynie","Overhead triceps extension (rozciąganie tricepsów nad głową)","Overhead triceps extension ze sztangą","Overhead triceps extension z hantlą","Overhead triceps extension z linką","Overhead triceps extension jednoręczne","Triceps extensions na ławce","Skull crushers (leżące rozciąganie)","Skull crushers ze sztangą","Skull crushers z hantlami","Skull crushers na maszynie Smith","Skull crushers jednoręczne","Triceps extensions siedząc","Triceps extensions na linie","Rope triceps extensions","Triceps extensions na maszynie","Triceps extensions z kettlebell","Close grip pull-ups","Close grip lat pulldown","Biceps curls (uginania hantli)","Biceps curls ze sztangą","Biceps curls z hantlami","Biceps curls na maszynie","Biceps curls na linie","Biceps curls na maszynie Smith","Biceps curls siedząc","Biceps curls stojąc","Biceps curls nachylone","Hammer curls","Hammer curls jednoręczne","Preacher curls (uginania na ławce kaznodziei)","Preacher curls ze sztangą","Preacher curls z hantlami","Preacher curls na maszynie","Cable curls","Cable curls na siedzisku","Cable curls jednoręczne","Incline curls","Incline dumbbell curls","EZ bar curls","EZ bar curls siedząc","Barbell curls","Barbell curls stojąc","Dumbbell curls","Dumbbell curls siedząc","Concentration curls","Concentration curls siedząc","Concentration curls leżąc","Machine curls","Machine curls jednoręczne","Kettlebell curls","Kettlebell curls jednoręczne","21s biceps","Tempo biceps curls","Reverse curls (uginania odwrotne)","Reverse curls ze sztangą","Reverse curls z hantlami","Reverse curls na linie","Reverse curls na maszynie","Zginanie przedramion (wrist curls)","Wrist curls ze sztangą","Wrist curls z hantlami","Wrist curls na ławce","Reverse wrist curls","Reverse wrist curls ze sztangą","Reverse wrist curls z hantlami","Wrist curls na linie","Wrist curls jednoręczne","Wrist rotations","Wrist rotations z hantlą","Wrist rotations z kettlebell","Farmer's carry","Farmer's carry z hantlami","Farmer's carry ze sztangą","Farmer's carry jednoręczne","Farmer's carry z kettlebell","Suitcase carry","Suitcase carry jednoręczne","Waiter walks","Waiter walks jednoręczne","Bear hug carry","Chest carry","Back carry","Overhead carry","Waiter's carry","Prowler push","Prowler pull","Sled push","Sled drag","Battle ropes","Battle ropes dwuosobowe","Battle ropes jednoręczne","Tire flips","Med ball slams","Med ball throws","Med ball chest passes","Med ball rotations","Med ball side throws","Med ball Russian twists","Rope climbs","Box jumps","Box jumps jednonóżne","Box step-ups","Box step-ups jednonóżne","Burpees","Burpees box jumps","Mountain climbers","Mountain climbers szybkie","Jumping jacks","High knees","High knees biegi","Broad jumps","Long jumps","Vertical jumps","Plyo push-ups","Clap push-ups","Explosive push-ups","Jump squats","Jump lunges","Tuck jumps","Pike jumps","Rotational jumps","Lateral bounds","Single leg bounds","Double unders (skakanka)","Single leg jumps","Skipping","Sprawls","Lunge to twist","Lateral bounds to press","Kettlebell swings","Kettlebell swings jednoręczne","Kettlebell snatches","Kettlebell cleans","Kettlebell jerks","Kettlebell Turkish get-ups","Kettlebell windmills","Kettlebell figure-4","Kettlebell halo","Kettlebell lunges","Kettlebell deadlifts","Kettlebell goblet squats","Kettlebell high pulls","Kettlebell double swings","Kettlebell seesaw presses","Kettlebell rows","Kettlebell carries","Kettlebell pistol squats","Kettlebell around the body","Landmine squats","Landmine rows","Landmine presses","Landmine rotations","Landmine punches","Landmine crunches","Sandbag squats","Sandbag lunges","Sandbag cleans","Sandbag presses","Sandbag rows","Sandbag slams","Sandbag carries","Sandbag shoulder raises","Sandbag deadlifts","Sandbag rotations","Resistance band squats","Resistance band deadlifts","Resistance band rows","Resistance band chest press","Resistance band shoulder press","Resistance band biceps curls","Resistance band triceps extensions","Resistance band lateral raises","Resistance band leg extensions","Resistance band leg curls","Resistance band hip abductions","Resistance band hip adductions","Resistance band pull-aparts","Resistance band pull-downs","Resistance band rotations","Resistance band woodchops","TRX squats","TRX rows","TRX chest press","TRX push-ups","TRX mountain climbers","TRX suspension planks","TRX suspension curls","TRX suspension triceps","TRX suspension lunges","TRX suspension hamstring curls","TRX side planks","TRX atomic push-ups","TRX fallouts","Cable machine rotations","Cable machine chops","Cable machine high-to-low chops","Cable machine low-to-high chops","Cable machine side bends","Cable machine crunches","Cable machine leg curls","Cable machine leg extensions","Cable machine hip abductions","Cable machine hip adductions","Machine chest press","Machine row","Machine leg press","Machine leg extension","Machine leg curl","Machine shoulder press","Machine lateral raise","Machine seated row","Machine pec deck","Machine reverse pec deck","Machine hip abduction","Machine hip adduction","Machine glute drive","Machine calf raise","Machine triceps dips","Machine lat pulldown","Machine biceps curl","Machine triceps extension","Machine ab crunch","Machine back extension","Machine sit-up","Machine rotary torso","Barbell bench press","Barbell incline press","Barbell decline press","Barbell row","Barbell deadlift","Barbell squat","Barbell front squat","Barbell back squat","Barbell overhead press","Barbell high pull","Barbell clean","Barbell jerk","Barbell snatch","Barbell upright row","Barbell shrug","Barbell reverse curl","Barbell curl","Barbell close grip press","Barbell floor press","Barbell pin press","Barbell pause squat","Barbell deficit deadlift","Barbell rack pull","Dumbbell pullovers","Dumbbell floor press","Dumbbell goblet squats","Dumbbell snatches","Dumbbell clean and press","Dumbbell thrusters","Dumbbell Turkish get-ups","Dumbbell windmills","Dumbbell bench press","Dumbbell incline press","Dumbbell decline press","Dumbbell floor press","Dumbbell single arm rows","Dumbbell squat","Dumbbell front squat","Dumbbell deadlift","Dumbbell sumo deadlift","Dumbbell overhead press","Dumbbell push press","Dumbbell shoulder raise","Dumbbell lateral raise","Dumbbell reverse fly","Dumbbell alternating curls","Dumbbell concentrations curls","Dumbbell triceps kickbacks","Dumbbell overhead extension","Dumbbell lunges","Dumbbell walking lunges","Dumbbell step-ups","Dumbbell calf raises","Dumbbell carries","Dumbbell Turkish get-ups","Dumbbell suitcase carries","Dumbbell farmer's carry","Dumbbell overhead carry","Dumbbell single arm row","Dumbbell renegade rows","Dumbbell push-ups","Dumbbell pullovers","Dumbbell rotations","Dumbbell wood chops","Dumbbell side bends","Dumbbell Russian twists","Dumbbell single leg deadlifts","Dumbbell single leg squats","Dumbbell single leg rows","Dumbbell single leg carries","Dumbbell tempo squats","Dumbbell pause squats","Dumbbell pin presses","Dumbbell floor presses","Dumbbell neutral grip press","Dumbbell narrow grip press","Dumbbell wide grip press","Med ball chest passes","Med ball overhead throws","Med ball slams to floor","Med ball side throws","Med ball Russian twists","Med ball rotations","Med ball wall throws","Med ball bounces","Med ball chest catches","Med ball single leg squats","Med ball rotational slams","Med ball rainbow slams",
];

function truncateUrl(url: string, maxLen = 40): string {
  try {
    const parsed = new URL(url);
    const short = parsed.hostname.replace("www.", "") + parsed.pathname;
    return short.length > maxLen ? short.slice(0, maxLen) + "…" : short;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + "…" : url;
  }
}

export default function ExerciseLibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  const [form, setForm] = useState<ExerciseFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<Exercise[]>({
    queryKey: ["exercises-library"],
    queryFn: () => apiGet<Exercise[]>("/api/exercises/library"),
    enabled: !!user?.id,
  });

  const exercises = (data ?? []).filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (body: object) => apiPost<Exercise>("/api/exercises/library", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises-library"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeEditModal();
    },
    onError: () => {
      setFormError("Nie udało się dodać ćwiczenia. Spróbuj ponownie.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      apiPut<Exercise>(`/api/exercises/library/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises-library"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeEditModal();
    },
    onError: () => {
      setFormError("Nie udało się zaktualizować ćwiczenia. Spróbuj ponownie.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/api/exercises/library/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises-library"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się usunąć ćwiczenia.");
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: () =>
      apiPost<{ imported: number; skipped: number }>("/api/exercises/library/bulk-import", {
        names: PRESET_EXERCISES,
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["exercises-library"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Importowanie zakończone",
        `Dodano ${result.imported} ćwiczeń${result.skipped > 0 ? `, pominięto ${result.skipped} duplikatów` : ""}.`
      );
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się zaimportować ćwiczeń.");
    },
  });

  function handleBulkImport() {
    Alert.alert(
      "Wczytaj domyślne ćwiczenia",
      "Spowoduje to dodanie 597 predefiniowanych ćwiczeń do Twojej biblioteki. Duplikaty zostaną pominięte. Kontynuować?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Importuj",
          onPress: () => bulkImportMutation.mutate(),
        },
      ]
    );
  }

  function openAddModal() {
    setEditingExercise(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setEditModalVisible(true);
  }

  function openEditModal(ex: Exercise) {
    setEditingExercise(ex);
    setForm(exerciseToForm(ex));
    setFormError("");
    setEditModalVisible(true);
  }

  function closeEditModal() {
    setEditModalVisible(false);
    setEditingExercise(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openDetailsModal(ex: Exercise) {
    setViewingExercise(ex);
    setDetailsModalVisible(true);
  }

  function closeDetailsModal() {
    setDetailsModalVisible(false);
    setViewingExercise(null);
  }

  function handleCardPress(ex: Exercise, isOwn: boolean) {
    if (isOwn) {
      openEditModal(ex);
    } else {
      openDetailsModal(ex);
    }
  }

  function handleSave() {
    if (!form.name.trim()) {
      setFormError("Nazwa ćwiczenia jest wymagana.");
      return;
    }
    setFormError("");

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      videoUrl: form.videoUrl.trim() || null,
      defaultSets: form.defaultSets ? parseInt(form.defaultSets, 10) : null,
      defaultReps: form.defaultReps ? parseInt(form.defaultReps, 10) : null,
      defaultLoad: form.defaultLoad.trim() || null,
      defaultRestTime: form.defaultRestTime ? parseInt(form.defaultRestTime, 10) : null,
    };

    if (editingExercise) {
      updateMutation.mutate({ id: editingExercise.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function confirmDelete(ex: Exercise) {
    Alert.alert(
      "Usuń ćwiczenie",
      `Czy na pewno chcesz usunąć ćwiczenie "${ex.name}"?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => deleteMutation.mutate(ex.id),
        },
      ]
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const ownUserId = user?.id;

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Szukaj ćwiczenia..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            testID="input-exercise-search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} testID="button-clear-search">
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="button-add-exercise"
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Dodaj ćwiczenie</Text>
        </Pressable>

        <Pressable
          onPress={handleBulkImport}
          disabled={bulkImportMutation.isPending}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, opacity: pressed || bulkImportMutation.isPending ? 0.7 : 1 },
          ]}
        >
          {bulkImportMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          )}
          <Text style={[styles.addBtnText, { color: colors.primary }]}>
            {bulkImportMutation.isPending ? "Importowanie..." : "Wczytaj domyślne ćwiczenia"}
          </Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : isError ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.destructive} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Błąd ładowania</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Nie udało się załadować biblioteki ćwiczeń. Pociągnij, aby odświeżyć.
            </Text>
          </View>
        ) : exercises.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="barbell-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "Brak wyników" : "Brak ćwiczeń"}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {search
                ? `Nie znaleziono ćwiczeń pasujących do "${search}"`
                : "Dodaj pierwsze ćwiczenie do swojej biblioteki"}
            </Text>
          </View>
        ) : (
          exercises.map((ex) => {
            const isOwn = ex.trainerId === ownUserId;
            return (
              <Pressable
                key={ex.id}
                onPress={() => handleCardPress(ex, isOwn)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                testID={`card-exercise-${ex.id}`}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.primary + "1a" }]}>
                    <Ionicons name="barbell-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.foreground }]}>{ex.name}</Text>
                    {ex.description ? (
                      <Text
                        style={[styles.cardDesc, { color: colors.mutedForeground }]}
                        numberOfLines={2}
                      >
                        {ex.description}
                      </Text>
                    ) : null}
                    {ex.videoUrl ? (
                      <View style={styles.videoRow}>
                        <Ionicons name="videocam-outline" size={13} color={colors.primary} />
                        <Text style={[styles.videoUrl, { color: colors.primary }]} numberOfLines={1}>
                          {truncateUrl(ex.videoUrl)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {isOwn ? (
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openEditModal(ex);
                        }}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                        testID={`button-edit-exercise-${ex.id}`}
                        hitSlop={8}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          confirmDelete(ex);
                        }}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                        testID={`button-delete-exercise-${ex.id}`}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                      </Pressable>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} style={styles.chevron} />
                  )}
                </View>

                {(ex.defaultSets != null || ex.defaultReps != null || ex.defaultLoad || ex.defaultRestTime != null) && (
                  <View style={[styles.cardMeta, { borderTopColor: colors.border }]}>
                    {ex.defaultSets != null && (
                      <View style={styles.metaChip}>
                        <Ionicons name="layers-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {ex.defaultSets} serie
                        </Text>
                      </View>
                    )}
                    {ex.defaultReps != null && (
                      <View style={styles.metaChip}>
                        <Ionicons name="repeat-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {ex.defaultReps} pow.
                        </Text>
                      </View>
                    )}
                    {ex.defaultLoad ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="fitness-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {ex.defaultLoad}
                        </Text>
                      </View>
                    ) : null}
                    {ex.defaultRestTime != null && (
                      <View style={styles.metaChip}>
                        <Ionicons name="timer-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {ex.defaultRestTime}s odpoczynku
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Edit / Add Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeEditModal} />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingExercise ? "Edytuj ćwiczenie" : "Nowe ćwiczenie"}
              </Text>
              <Pressable
                onPress={closeEditModal}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                testID="button-close-exercise-modal"
              >
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formRow}>
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Nazwa *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="np. Wyciskanie sztangi leżąc"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  returnKeyType="next"
                  testID="input-form-name"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Opis</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputMultiline,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                  ]}
                  placeholder="Opis techniki wykonania..."
                  placeholderTextColor={colors.mutedForeground}
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  multiline
                  numberOfLines={3}
                  testID="input-form-description"
                />
              </View>

              <View style={styles.rowThree}>
                <View style={styles.rowThreeItem}>
                  <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Serie</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="3"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.defaultSets}
                    onChangeText={(v) => setForm((f) => ({ ...f, defaultSets: v.replace(/[^0-9]/g, "") }))}
                    keyboardType="numeric"
                    returnKeyType="next"
                    testID="input-form-sets"
                  />
                </View>
                <View style={styles.rowThreeItem}>
                  <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Powtórzenia</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="10"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.defaultReps}
                    onChangeText={(v) => setForm((f) => ({ ...f, defaultReps: v.replace(/[^0-9]/g, "") }))}
                    keyboardType="numeric"
                    returnKeyType="next"
                    testID="input-form-reps"
                  />
                </View>
                <View style={styles.rowThreeItem}>
                  <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Obciążenie</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="20kg"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.defaultLoad}
                    onChangeText={(v) => setForm((f) => ({ ...f, defaultLoad: v }))}
                    returnKeyType="next"
                    testID="input-form-load"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Odpoczynek (sekundy)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="60"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.defaultRestTime}
                  onChangeText={(v) => setForm((f) => ({ ...f, defaultRestTime: v.replace(/[^0-9]/g, "") }))}
                  keyboardType="numeric"
                  returnKeyType="next"
                  testID="input-form-rest"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Link do wideo</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="https://youtube.com/..."
                  placeholderTextColor={colors.mutedForeground}
                  value={form.videoUrl}
                  onChangeText={(v) => setForm((f) => ({ ...f, videoUrl: v }))}
                  keyboardType="url"
                  autoCapitalize="none"
                  returnKeyType="done"
                  testID="input-form-video"
                />
              </View>

              {formError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{formError}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: colors.primary, opacity: pressed || isSaving ? 0.75 : 1 },
                ]}
                testID="button-save-exercise"
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingExercise ? "Zapisz zmiany" : "Dodaj ćwiczenie"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Read-only Details Modal (for default / non-own exercises) */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeDetailsModal} />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {viewingExercise?.name ?? "Ćwiczenie"}
              </Text>
              <Pressable
                onPress={closeDetailsModal}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                testID="button-close-details-modal"
              >
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {viewingExercise?.description ? (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Opis</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    {viewingExercise.description}
                  </Text>
                </View>
              ) : null}

              {(viewingExercise?.defaultSets != null ||
                viewingExercise?.defaultReps != null ||
                viewingExercise?.defaultLoad ||
                viewingExercise?.defaultRestTime != null) && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Domyślne parametry</Text>
                  <View style={styles.detailGrid}>
                    {viewingExercise?.defaultSets != null && (
                      <View style={[styles.detailGridItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.detailGridNum, { color: colors.foreground }]}>{viewingExercise.defaultSets}</Text>
                        <Text style={[styles.detailGridLbl, { color: colors.mutedForeground }]}>serie</Text>
                      </View>
                    )}
                    {viewingExercise?.defaultReps != null && (
                      <View style={[styles.detailGridItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.detailGridNum, { color: colors.foreground }]}>{viewingExercise.defaultReps}</Text>
                        <Text style={[styles.detailGridLbl, { color: colors.mutedForeground }]}>pow.</Text>
                      </View>
                    )}
                    {viewingExercise?.defaultLoad ? (
                      <View style={[styles.detailGridItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.detailGridNum, { color: colors.foreground }]}>{viewingExercise.defaultLoad}</Text>
                        <Text style={[styles.detailGridLbl, { color: colors.mutedForeground }]}>obciążenie</Text>
                      </View>
                    ) : null}
                    {viewingExercise?.defaultRestTime != null && (
                      <View style={[styles.detailGridItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.detailGridNum, { color: colors.foreground }]}>{viewingExercise.defaultRestTime}s</Text>
                        <Text style={[styles.detailGridLbl, { color: colors.mutedForeground }]}>odpoczynek</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {viewingExercise?.videoUrl ? (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Link do wideo</Text>
                  <Pressable
                    onPress={() => viewingExercise.videoUrl && Linking.openURL(viewingExercise.videoUrl)}
                    style={({ pressed }) => [
                      styles.videoLinkBtn,
                      { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                    testID="button-open-video"
                  >
                    <Ionicons name="videocam-outline" size={18} color={colors.primary} />
                    <Text style={[styles.videoLinkText, { color: colors.primary }]} numberOfLines={1}>
                      {truncateUrl(viewingExercise.videoUrl, 48)}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              ) : null}

              {!viewingExercise?.description &&
                viewingExercise?.defaultSets == null &&
                viewingExercise?.defaultReps == null &&
                !viewingExercise?.defaultLoad &&
                viewingExercise?.defaultRestTime == null &&
                !viewingExercise?.videoUrl && (
                  <Text style={[styles.noDetails, { color: colors.mutedForeground }]}>
                    Brak dodatkowych informacji o tym ćwiczeniu.
                  </Text>
                )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  loader: { marginTop: 40 },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 2,
  },
  videoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  videoUrl: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
  },
  cardActions: { flexDirection: "row", gap: 4, flexShrink: 0 },
  iconBtn: { padding: 6 },
  chevron: { marginTop: 2, flexShrink: 0 },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, marginRight: 8 },
  modalScroll: { paddingHorizontal: 20 },
  formRow: { marginBottom: 14 },
  formRowLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowThree: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  rowThreeItem: { flex: 1 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailGridItem: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 70,
  },
  detailGridNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  detailGridLbl: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  videoLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  videoLinkText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  noDetails: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, marginBottom: 16 },
});
