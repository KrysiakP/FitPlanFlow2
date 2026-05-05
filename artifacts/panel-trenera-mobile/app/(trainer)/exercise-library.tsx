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
  category?: string | null;
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
  category: string;
  description: string;
  videoUrl: string;
  defaultSets: string;
  defaultReps: string;
  defaultLoad: string;
  defaultRestTime: string;
}

const EXERCISE_CATEGORIES = [
  "Klatka piersiowa","Plecy","Barki","Brzuch","Nogi","Triceps","Biceps",
  "Przedramiona","Kondycja","Kettlebell","Landmine","Worek z piaskiem",
  "Taśmy oporowe","TRX","Maszyny kablowe","Maszyny","Sztanga","Hantle","Piłka lekarska",
];

const EMPTY_FORM: ExerciseFormState = {
  name: "",
  category: "",
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
    category: ex.category ?? "",
    description: ex.description ?? "",
    videoUrl: ex.videoUrl ?? "",
    defaultSets: ex.defaultSets != null ? String(ex.defaultSets) : "",
    defaultReps: ex.defaultReps != null ? String(ex.defaultReps) : "",
    defaultLoad: ex.defaultLoad ?? "",
    defaultRestTime: ex.defaultRestTime != null ? String(ex.defaultRestTime) : "",
  };
}

const PRESET_EXERCISES: Array<{ name: string; category: string }> = [
  // Klatka piersiowa
  {name:"Wyciskanie sztangi na ławce płaskiej",category:"Klatka piersiowa"},{name:"Wyciskanie hantli na ławce płaskiej",category:"Klatka piersiowa"},{name:"Wyciskanie na maszynie pneumatycznej",category:"Klatka piersiowa"},{name:"Rozpiętki hantli na ławce płaskiej",category:"Klatka piersiowa"},{name:"Rozpiętki na maszynie motylkowej",category:"Klatka piersiowa"},{name:"Rozpiętki na linie skrzyżowanej",category:"Klatka piersiowa"},{name:"Pull-overy z hantlą",category:"Klatka piersiowa"},{name:"Pull-overy na maszynie",category:"Klatka piersiowa"},{name:"Wyciskanie sztangi na ławce pochyłej",category:"Klatka piersiowa"},{name:"Wyciskanie hantli na ławce pochyłej",category:"Klatka piersiowa"},{name:"Wyciskanie sztangi na ławce ujemnej",category:"Klatka piersiowa"},{name:"Wyciskanie hantli na ławce ujemnej",category:"Klatka piersiowa"},{name:"Rozpiętki hantli na ławce pochyłej",category:"Klatka piersiowa"},{name:"Rozpiętki na linie skrzyżowanej (górna)",category:"Klatka piersiowa"},{name:"Wyciskanie sztangi do klatki piersiowej na maszynie Smith",category:"Klatka piersiowa"},{name:"Wyciskanie hantli na ławce Smith",category:"Klatka piersiowa"},{name:"Uciśnięcia z liny na klatce",category:"Klatka piersiowa"},{name:"Wyciskanie sztangi na ławce Smitha pochyłej",category:"Klatka piersiowa"},{name:"Dumbbell press na podłodze",category:"Klatka piersiowa"},{name:"Push-ups zwykłe",category:"Klatka piersiowa"},{name:"Push-ups szerokie",category:"Klatka piersiowa"},{name:"Push-ups wąskie",category:"Klatka piersiowa"},{name:"Push-ups diamendowe",category:"Klatka piersiowa"},{name:"Push-ups na deklinacji",category:"Klatka piersiowa"},{name:"Push-ups na inklinacji",category:"Klatka piersiowa"},
  // Plecy
  {name:"Przyciągi sztangi do klatki",category:"Klatka piersiowa"},{name:"Przyciągi hantli do klatki",category:"Klatka piersiowa"},{name:"Przyciągi na maszynie rządowej",category:"Klatka piersiowa"},{name:"Przyciągi na maszynie pneumatycznej",category:"Klatka piersiowa"},{name:"Przyciągi liny do klatki",category:"Klatka piersiowa"},{name:"Przyciągi szerokie na linie skrzyżowanej",category:"Klatka piersiowa"},{name:"Przyciągi wąskie na linie skrzyżowanej",category:"Klatka piersiowa"},{name:"Przyciągi na pochyłej linie",category:"Klatka piersiowa"},{name:"Przyciągi na maszynie Smith",category:"Klatka piersiowa"},{name:"Przyciągi jednoręczne na linie",category:"Klatka piersiowa"},{name:"Przedni pull down na linie",category:"Klatka piersiowa"},{name:"Przyciągi tyłem głowy na linie",category:"Klatka piersiowa"},{name:"Przyciągi z hantlą jednoręczne",category:"Klatka piersiowa"},{name:"Przyciągi z kettlebell",category:"Klatka piersiowa"},
  // Barki
  {name:"Wyciskanie sztangi nad głową",category:"Barki"},{name:"Wyciskanie hantli nad głową",category:"Barki"},{name:"Wyciskanie sztangi sztaba nad głową (military press)",category:"Barki"},{name:"Wyciskanie hantli nad głową (dumbbell shoulder press)",category:"Barki"},{name:"Wyciskanie na maszynie pressa ramion",category:"Barki"},{name:"Wyciskanie na linie skrzyżowanej",category:"Barki"},{name:"Wyciskanie Arnold (Arnold press)",category:"Barki"},{name:"Podnoszenia hantli boczne",category:"Barki"},{name:"Podnoszenia hantli boczne na maszynie kablowej",category:"Barki"},{name:"Podnoszenia sztangi do brody (upright row)",category:"Barki"},{name:"Podnoszenia liny do brody",category:"Barki"},{name:"Podnoszenia hantli do brody",category:"Barki"},{name:"Podnoszenia ramion z hantlami",category:"Barki"},{name:"Podnoszenia ramion na maszynie",category:"Barki"},{name:"Podnoszenia ramion z kettlebell",category:"Barki"},{name:"Skłony głowy do przodu na maszynie",category:"Barki"},{name:"Skłony głowy na maszynie blokującej",category:"Barki"},{name:"Ty-raisy (podnoszenia hantli w przód)",category:"Barki"},{name:"Ty-raisy na maszynie kablowej",category:"Barki"},{name:"Reverse pec deck (reverse flyes)",category:"Barki"},{name:"Reverse pec deck na maszynie",category:"Barki"},{name:"Ty-raisy z liną",category:"Barki"},{name:"Ty-raisy w przekroczeniu (crossover)",category:"Barki"},{name:"Ty-raisy jednoręczne z hantlą",category:"Barki"},{name:"Żuraw",category:"Barki"},{name:"Żuraw na maszynie",category:"Barki"},{name:"Żuraw jedno nóżka",category:"Barki"},
  // Plecy (ciąg dalszy)
  {name:"Przyciąg pionowy (lat pulldown)",category:"Plecy"},{name:"Przyciąg pionowy wąski",category:"Plecy"},{name:"Przyciąg pionowy szerokie uchwyty",category:"Plecy"},{name:"Przyciąg za głowę (behind the neck lat pulldown)",category:"Plecy"},{name:"Przyciąg na maszynie pneumatycznej",category:"Plecy"},{name:"Przyciąg na maszynie rządowej",category:"Plecy"},{name:"Podciągania na drążku (pull-ups)",category:"Plecy"},{name:"Podciągania szerokie (wide grip pull-ups)",category:"Plecy"},{name:"Podciągania wąskie (close grip pull-ups)",category:"Plecy"},{name:"Podciągania neutralnym uchwytem",category:"Plecy"},{name:"Podciągania za głowę",category:"Plecy"},{name:"Podciągania australijskie",category:"Plecy"},{name:"Podciągania na asystującym urządzeniu",category:"Plecy"},{name:"Przyciągania (lat pull down) na linie",category:"Plecy"},{name:"Przyciąg hantli do klatki (single arm row)",category:"Plecy"},{name:"Przyciąg sztangi do klatki",category:"Plecy"},{name:"Przyciąg hantli do klatki (one arm dumbbell row)",category:"Plecy"},{name:"Przyciąg sztangi do klatki na maszynie Smith",category:"Plecy"},{name:"Przyciąg sztangi w pozycji nachylonej (bent over row)",category:"Plecy"},{name:"Przyciąg hantli w pozycji nachylonej",category:"Plecy"},{name:"Przyciąg sztangi na maszynie T-bar",category:"Plecy"},{name:"Przyciąg na maszynie rządowej (machine row)",category:"Plecy"},{name:"Przyciąg na maszynie pneumatycznej",category:"Plecy"},{name:"Przyciąg na linie (cable row)",category:"Plecy"},{name:"Przyciąg jedno-ręczny na linie",category:"Plecy"},{name:"Przyciąg jedno-ręczny na maszynie",category:"Plecy"},{name:"Przyciąg ze zmianią uchwytu",category:"Plecy"},{name:"Przyciąg z kettlebell",category:"Plecy"},{name:"Przyciąg z kablem na tulejach",category:"Plecy"},{name:"Przyciąg na drążku (pendulum row)",category:"Plecy"},{name:"Przyciąg do klatki v-bar",category:"Plecy"},{name:"Przyciąg do klatki na posadzeniu (seated row)",category:"Plecy"},{name:"Przyciąg na maszynie posiadania linii",category:"Plecy"},{name:"Przyciąg hantli w staniu",category:"Plecy"},{name:"Shrugs ze sztangą",category:"Plecy"},{name:"Shrugs z hantlami",category:"Plecy"},{name:"Shrugs na maszynie",category:"Plecy"},{name:"Shrugs na maszynie Smith",category:"Plecy"},{name:"Shrugs z kettlebell",category:"Plecy"},{name:"Shrugs na linie skrzyżowanej",category:"Plecy"},{name:"Shrugs jedno-ręczne",category:"Plecy"},{name:"Wyprostowania tułowia (back extensions)",category:"Plecy"},{name:"Wyprostowania tułowia na maszynie",category:"Plecy"},{name:"Wyprostowania tułowia na ziemi",category:"Plecy"},{name:"Superman",category:"Plecy"},{name:"Superman na maszynie",category:"Plecy"},
  // Brzuch
  {name:"Twisting crunches (skręty w tułowiu)",category:"Brzuch"},{name:"Crunches brzuszne",category:"Brzuch"},{name:"Crunches na maszynie",category:"Brzuch"},{name:"Crunches na linie",category:"Brzuch"},{name:"Crunches na siedzisku",category:"Brzuch"},{name:"Hanging leg raises",category:"Brzuch"},{name:"Leg raises na równoległym drążku",category:"Brzuch"},{name:"Leg raises na urządzeniu do podciągów",category:"Brzuch"},{name:"Podnoszenia nóg w zwisie",category:"Brzuch"},{name:"Podnoszenia nóg nad drażek",category:"Brzuch"},{name:"Podnoszenia nóg siedząc",category:"Brzuch"},{name:"Podnoszenia nóg leżąc",category:"Brzuch"},{name:"Situps na maszynie",category:"Brzuch"},{name:"Situps na ławce pochyłej",category:"Brzuch"},{name:"Situps zwykłe",category:"Brzuch"},{name:"Skręty na maszynie",category:"Brzuch"},{name:"Skręty w pozycji siedzącej",category:"Brzuch"},{name:"Skręty w pozycji leżącej",category:"Brzuch"},{name:"Cable wood chops",category:"Brzuch"},{name:"Rotacje z kettlebell",category:"Brzuch"},{name:"Rotacje z hantlą",category:"Brzuch"},{name:"Landmine rotations",category:"Brzuch"},{name:"Planks",category:"Brzuch"},{name:"Planks boczne (side planks)",category:"Brzuch"},{name:"Planks dynamiczne",category:"Brzuch"},{name:"Hollow body holds",category:"Brzuch"},{name:"Ab wheel rollouts",category:"Brzuch"},{name:"Palof press",category:"Brzuch"},{name:"Pallof holds",category:"Brzuch"},
  // Nogi
  {name:"Squats ze sztangą (przysiady)",category:"Nogi"},{name:"Squats z hantlami",category:"Nogi"},{name:"Squats na maszynie Smith",category:"Nogi"},{name:"Squats na maszynie pneumatycznej",category:"Nogi"},{name:"Hack squats",category:"Nogi"},{name:"V-squats",category:"Nogi"},{name:"Squats na maszynie do przysiadów",category:"Nogi"},{name:"Squats goblet",category:"Nogi"},{name:"Squats bułgarskie (Bulgarian split squats)",category:"Nogi"},{name:"Squats rozdzielone",category:"Nogi"},{name:"Squats jednoręczne",category:"Nogi"},{name:"Squats pistol",category:"Nogi"},{name:"Lunges (wypadki)",category:"Nogi"},{name:"Lunges do przodu",category:"Nogi"},{name:"Lunges do tyłu",category:"Nogi"},{name:"Lunges boczne",category:"Nogi"},{name:"Lunges z hantlami",category:"Nogi"},{name:"Lunges ze sztangą",category:"Nogi"},{name:"Lunges na maszynie Smith",category:"Nogi"},{name:"Lunges na maszynie do szkolenia kończyn",category:"Nogi"},{name:"Walking lunges",category:"Nogi"},{name:"Jumping lunges",category:"Nogi"},{name:"Reverse lunges",category:"Nogi"},{name:"Leg press",category:"Nogi"},{name:"Leg press (maszyna do przysiadów)",category:"Nogi"},{name:"Leg press wąski",category:"Nogi"},{name:"Leg press szeroki",category:"Nogi"},{name:"Leg press jednoręczny",category:"Nogi"},{name:"V-leg press",category:"Nogi"},{name:"Hack leg press",category:"Nogi"},{name:"Leg press siedział",category:"Nogi"},{name:"Leg press na maszynie pneumatycznej",category:"Nogi"},{name:"Rozciągania nóg (leg extensions)",category:"Nogi"},{name:"Leg extensions na maszynie",category:"Nogi"},{name:"Leg extensions jednoróżne",category:"Nogi"},{name:"Leg extensions na siedzisku",category:"Nogi"},{name:"Leg extensions w staniu",category:"Nogi"},{name:"Leg extensions na linie",category:"Nogi"},{name:"Leg extensions z hantlą",category:"Nogi"},{name:"Leg extensions z kettlebell",category:"Nogi"},{name:"Zginania nóg (leg curls)",category:"Nogi"},{name:"Leg curls leżące",category:"Nogi"},{name:"Leg curls siedząc",category:"Nogi"},{name:"Leg curls stojąc",category:"Nogi"},{name:"Leg curls na maszynie pneumatycznej",category:"Nogi"},{name:"Leg curls jednonogie",category:"Nogi"},{name:"Leg curls na linie",category:"Nogi"},{name:"Leg curls z hantlą",category:"Nogi"},{name:"Leg curls z kettlebell",category:"Nogi"},{name:"Rumańskie martwe ciągi (Romanian deadlifts)",category:"Nogi"},{name:"Rumańskie martwe ciągi z hantlami",category:"Nogi"},{name:"Rumańskie martwe ciągi na maszynie Smith",category:"Nogi"},{name:"Martwe ciągi (deadlifts)",category:"Nogi"},{name:"Martwe ciągi konwencjonalne",category:"Nogi"},{name:"Martwe ciągi sumo",category:"Nogi"},{name:"Martwe ciągi na parapecie",category:"Nogi"},{name:"Martwe ciągi z hantlami",category:"Nogi"},{name:"Martwe ciągi na maszynie Smith",category:"Nogi"},{name:"Trap bar deadlifts",category:"Nogi"},{name:"Martwe ciągi jednoręczne",category:"Nogi"},{name:"Martwe ciągi jednonóżne",category:"Nogi"},{name:"Martwe ciągi na maszynie",category:"Nogi"},{name:"Martwe ciągi na ziemi",category:"Nogi"},{name:"Good mornings",category:"Nogi"},{name:"Good mornings ze sztangą",category:"Nogi"},{name:"Good mornings z hantlą",category:"Nogi"},{name:"Good mornings na maszynie",category:"Nogi"},{name:"Good mornings na linie",category:"Nogi"},{name:"Hipereksensje (hyperextensions)",category:"Nogi"},{name:"Hipereksensje na maszynie",category:"Nogi"},{name:"Hipereksensje na ławce",category:"Nogi"},{name:"Hipereksensje jednonóżne",category:"Nogi"},{name:"Hipereksensje z hantlą",category:"Nogi"},{name:"Hipereksensje z kettlebell",category:"Nogi"},{name:"Głowica przyciąg (stiff legged deadlifts)",category:"Nogi"},{name:"Stiff legged deadlifts ze sztangą",category:"Nogi"},{name:"Stiff legged deadlifts z hantlami",category:"Nogi"},{name:"Stiff legged deadlifts na maszynie",category:"Nogi"},{name:"Abdukcja bioder (hip abduction)",category:"Nogi"},{name:"Hip abduction na maszynie",category:"Nogi"},{name:"Hip abduction z hantlą",category:"Nogi"},{name:"Hip abduction z kettlebell",category:"Nogi"},{name:"Hip abduction na linie",category:"Nogi"},{name:"Addukcja bioder (hip adduction)",category:"Nogi"},{name:"Hip adduction na maszynie",category:"Nogi"},{name:"Hip adduction z hantlą",category:"Nogi"},{name:"Hip adduction z kettlebell",category:"Nogi"},{name:"Hip adduction na linie",category:"Nogi"},{name:"Rotacja bioder",category:"Nogi"},{name:"Hip rotations wewnętrzne",category:"Nogi"},{name:"Hip rotations zewnętrzne",category:"Nogi"},{name:"Hip thrusts",category:"Nogi"},{name:"Hip thrusts na ławce",category:"Nogi"},{name:"Hip thrusts ze sztangą",category:"Nogi"},{name:"Hip thrusts z hantlą",category:"Nogi"},{name:"Hip thrusts na maszynie",category:"Nogi"},{name:"Hip thrusts jednonóżne",category:"Nogi"},{name:"Glute bridges",category:"Nogi"},{name:"Glute bridges na ławce",category:"Nogi"},{name:"Glute bridges ze sztangą",category:"Nogi"},{name:"Glute bridges z hantlą",category:"Nogi"},{name:"Glute bridges jednonóżne",category:"Nogi"},{name:"Calf raises (podnoszenia na palce)",category:"Nogi"},{name:"Calf raises na maszynie",category:"Nogi"},{name:"Calf raises ze sztangą",category:"Nogi"},{name:"Calf raises z hantlami",category:"Nogi"},{name:"Calf raises jednoróżne",category:"Nogi"},{name:"Calf raises siedząc",category:"Nogi"},{name:"Calf raises na drążku",category:"Nogi"},{name:"Calf raises na podium",category:"Nogi"},{name:"Calf raises na maszynie Smith",category:"Nogi"},{name:"Calf raises na linie",category:"Nogi"},{name:"Donkey calf raises",category:"Nogi"},{name:"Calf raises na schodach",category:"Nogi"},{name:"Hack calf raises",category:"Nogi"},
  // Triceps
  {name:"Wyciskanie sztangi leżąc na ławce",category:"Triceps"},{name:"Wyciskanie hantli leżąc",category:"Triceps"},{name:"Wyciskanie sztangi na maszynie",category:"Triceps"},{name:"Wyciskanie hantli na maszynie",category:"Triceps"},{name:"Wyciskanie na linie",category:"Triceps"},{name:"Wyciskanie sztangi wąskie (close grip bench press)",category:"Triceps"},{name:"Wyciskanie hantli wąskie",category:"Triceps"},{name:"Wyciskanie na linie wąskie",category:"Triceps"},{name:"Wyciskanie sztangi szerokie",category:"Triceps"},{name:"Wyciskanie hantli szerokie",category:"Triceps"},{name:"Wyciskanie Spoto (paused bench press)",category:"Triceps"},{name:"Wyciskanie Smith bench press",category:"Triceps"},{name:"Triceps dips",category:"Triceps"},{name:"Dips asystujące",category:"Triceps"},{name:"Triceps kickbacks",category:"Triceps"},{name:"Triceps kickbacks z hantlą",category:"Triceps"},{name:"Triceps kickbacks na linie",category:"Triceps"},{name:"Triceps kickbacks jednoręczne",category:"Triceps"},{name:"Triceps pushdowns (wciśnięcia w dół na linie)",category:"Triceps"},{name:"Triceps pushdowns na linie",category:"Triceps"},{name:"Triceps pushdowns z linką skakanką",category:"Triceps"},{name:"Triceps pushdowns v-bar",category:"Triceps"},{name:"Triceps pushdowns obrotowe",category:"Triceps"},{name:"Triceps pushdowns jednoręczne",category:"Triceps"},{name:"Triceps pushdowns na maszynie",category:"Triceps"},{name:"Overhead triceps extension (rozciąganie tricepsów nad głową)",category:"Triceps"},{name:"Overhead triceps extension ze sztangą",category:"Triceps"},{name:"Overhead triceps extension z hantlą",category:"Triceps"},{name:"Overhead triceps extension z linką",category:"Triceps"},{name:"Overhead triceps extension jednoręczne",category:"Triceps"},{name:"Triceps extensions na ławce",category:"Triceps"},{name:"Skull crushers (leżące rozciąganie)",category:"Triceps"},{name:"Skull crushers ze sztangą",category:"Triceps"},{name:"Skull crushers z hantlami",category:"Triceps"},{name:"Skull crushers na maszynie Smith",category:"Triceps"},{name:"Skull crushers jednoręczne",category:"Triceps"},{name:"Triceps extensions siedząc",category:"Triceps"},{name:"Triceps extensions na linie",category:"Triceps"},{name:"Rope triceps extensions",category:"Triceps"},{name:"Triceps extensions na maszynie",category:"Triceps"},{name:"Triceps extensions z kettlebell",category:"Triceps"},{name:"Close grip pull-ups",category:"Triceps"},{name:"Close grip lat pulldown",category:"Triceps"},
  // Biceps
  {name:"Biceps curls (uginania hantli)",category:"Biceps"},{name:"Biceps curls ze sztangą",category:"Biceps"},{name:"Biceps curls z hantlami",category:"Biceps"},{name:"Biceps curls na maszynie",category:"Biceps"},{name:"Biceps curls na linie",category:"Biceps"},{name:"Biceps curls na maszynie Smith",category:"Biceps"},{name:"Biceps curls siedząc",category:"Biceps"},{name:"Biceps curls stojąc",category:"Biceps"},{name:"Biceps curls nachylone",category:"Biceps"},{name:"Hammer curls",category:"Biceps"},{name:"Hammer curls jednoręczne",category:"Biceps"},{name:"Preacher curls (uginania na ławce kaznodziei)",category:"Biceps"},{name:"Preacher curls ze sztangą",category:"Biceps"},{name:"Preacher curls z hantlami",category:"Biceps"},{name:"Preacher curls na maszynie",category:"Biceps"},{name:"Cable curls",category:"Biceps"},{name:"Cable curls na siedzisku",category:"Biceps"},{name:"Cable curls jednoręczne",category:"Biceps"},{name:"Incline curls",category:"Biceps"},{name:"Incline dumbbell curls",category:"Biceps"},{name:"EZ bar curls",category:"Biceps"},{name:"EZ bar curls siedząc",category:"Biceps"},{name:"Barbell curls",category:"Biceps"},{name:"Barbell curls stojąc",category:"Biceps"},{name:"Dumbbell curls",category:"Biceps"},{name:"Dumbbell curls siedząc",category:"Biceps"},{name:"Concentration curls",category:"Biceps"},{name:"Concentration curls siedząc",category:"Biceps"},{name:"Concentration curls leżąc",category:"Biceps"},{name:"Machine curls",category:"Biceps"},{name:"Machine curls jednoręczne",category:"Biceps"},{name:"Kettlebell curls",category:"Biceps"},{name:"Kettlebell curls jednoręczne",category:"Biceps"},{name:"21s biceps",category:"Biceps"},{name:"Tempo biceps curls",category:"Biceps"},
  // Przedramiona
  {name:"Reverse curls (uginania odwrotne)",category:"Przedramiona"},{name:"Reverse curls ze sztangą",category:"Przedramiona"},{name:"Reverse curls z hantlami",category:"Przedramiona"},{name:"Reverse curls na linie",category:"Przedramiona"},{name:"Reverse curls na maszynie",category:"Przedramiona"},{name:"Zginanie przedramion (wrist curls)",category:"Przedramiona"},{name:"Wrist curls ze sztangą",category:"Przedramiona"},{name:"Wrist curls z hantlami",category:"Przedramiona"},{name:"Wrist curls na ławce",category:"Przedramiona"},{name:"Reverse wrist curls",category:"Przedramiona"},{name:"Reverse wrist curls ze sztangą",category:"Przedramiona"},{name:"Reverse wrist curls z hantlami",category:"Przedramiona"},{name:"Wrist curls na linie",category:"Przedramiona"},{name:"Wrist curls jednoręczne",category:"Przedramiona"},{name:"Wrist rotations",category:"Przedramiona"},{name:"Wrist rotations z hantlą",category:"Przedramiona"},{name:"Wrist rotations z kettlebell",category:"Przedramiona"},
  // Kondycja
  {name:"Farmer's carry",category:"Kondycja"},{name:"Farmer's carry z hantlami",category:"Kondycja"},{name:"Farmer's carry ze sztangą",category:"Kondycja"},{name:"Farmer's carry jednoręczne",category:"Kondycja"},{name:"Farmer's carry z kettlebell",category:"Kondycja"},{name:"Suitcase carry",category:"Kondycja"},{name:"Suitcase carry jednoręczne",category:"Kondycja"},{name:"Waiter walks",category:"Kondycja"},{name:"Waiter walks jednoręczne",category:"Kondycja"},{name:"Bear hug carry",category:"Kondycja"},{name:"Chest carry",category:"Kondycja"},{name:"Back carry",category:"Kondycja"},{name:"Overhead carry",category:"Kondycja"},{name:"Waiter's carry",category:"Kondycja"},{name:"Prowler push",category:"Kondycja"},{name:"Prowler pull",category:"Kondycja"},{name:"Sled push",category:"Kondycja"},{name:"Sled drag",category:"Kondycja"},{name:"Battle ropes",category:"Kondycja"},{name:"Battle ropes dwuosobowe",category:"Kondycja"},{name:"Battle ropes jednoręczne",category:"Kondycja"},{name:"Tire flips",category:"Kondycja"},{name:"Med ball slams",category:"Kondycja"},{name:"Med ball throws",category:"Kondycja"},{name:"Med ball chest passes",category:"Kondycja"},{name:"Med ball rotations",category:"Kondycja"},{name:"Med ball side throws",category:"Kondycja"},{name:"Med ball Russian twists",category:"Kondycja"},{name:"Rope climbs",category:"Kondycja"},{name:"Box jumps",category:"Kondycja"},{name:"Box jumps jednonóżne",category:"Kondycja"},{name:"Box step-ups",category:"Kondycja"},{name:"Box step-ups jednonóżne",category:"Kondycja"},{name:"Burpees",category:"Kondycja"},{name:"Burpees box jumps",category:"Kondycja"},{name:"Mountain climbers",category:"Kondycja"},{name:"Mountain climbers szybkie",category:"Kondycja"},{name:"Jumping jacks",category:"Kondycja"},{name:"High knees",category:"Kondycja"},{name:"High knees biegi",category:"Kondycja"},{name:"Broad jumps",category:"Kondycja"},{name:"Long jumps",category:"Kondycja"},{name:"Vertical jumps",category:"Kondycja"},{name:"Plyo push-ups",category:"Kondycja"},{name:"Clap push-ups",category:"Kondycja"},{name:"Explosive push-ups",category:"Kondycja"},{name:"Jump squats",category:"Kondycja"},{name:"Jump lunges",category:"Kondycja"},{name:"Tuck jumps",category:"Kondycja"},{name:"Pike jumps",category:"Kondycja"},{name:"Rotational jumps",category:"Kondycja"},{name:"Lateral bounds",category:"Kondycja"},{name:"Single leg bounds",category:"Kondycja"},{name:"Double unders (skakanka)",category:"Kondycja"},{name:"Single leg jumps",category:"Kondycja"},{name:"Skipping",category:"Kondycja"},{name:"Sprawls",category:"Kondycja"},{name:"Lunge to twist",category:"Kondycja"},{name:"Lateral bounds to press",category:"Kondycja"},
  // Kettlebell
  {name:"Kettlebell swings",category:"Kettlebell"},{name:"Kettlebell swings jednoręczne",category:"Kettlebell"},{name:"Kettlebell snatches",category:"Kettlebell"},{name:"Kettlebell cleans",category:"Kettlebell"},{name:"Kettlebell jerks",category:"Kettlebell"},{name:"Kettlebell Turkish get-ups",category:"Kettlebell"},{name:"Kettlebell windmills",category:"Kettlebell"},{name:"Kettlebell figure-4",category:"Kettlebell"},{name:"Kettlebell halo",category:"Kettlebell"},{name:"Kettlebell lunges",category:"Kettlebell"},{name:"Kettlebell deadlifts",category:"Kettlebell"},{name:"Kettlebell goblet squats",category:"Kettlebell"},{name:"Kettlebell high pulls",category:"Kettlebell"},{name:"Kettlebell double swings",category:"Kettlebell"},{name:"Kettlebell seesaw presses",category:"Kettlebell"},{name:"Kettlebell rows",category:"Kettlebell"},{name:"Kettlebell carries",category:"Kettlebell"},{name:"Kettlebell pistol squats",category:"Kettlebell"},{name:"Kettlebell around the body",category:"Kettlebell"},
  // Landmine
  {name:"Landmine squats",category:"Landmine"},{name:"Landmine rows",category:"Landmine"},{name:"Landmine presses",category:"Landmine"},{name:"Landmine rotations",category:"Landmine"},{name:"Landmine punches",category:"Landmine"},{name:"Landmine crunches",category:"Landmine"},
  // Worek z piaskiem
  {name:"Sandbag squats",category:"Worek z piaskiem"},{name:"Sandbag lunges",category:"Worek z piaskiem"},{name:"Sandbag cleans",category:"Worek z piaskiem"},{name:"Sandbag presses",category:"Worek z piaskiem"},{name:"Sandbag rows",category:"Worek z piaskiem"},{name:"Sandbag slams",category:"Worek z piaskiem"},{name:"Sandbag carries",category:"Worek z piaskiem"},{name:"Sandbag shoulder raises",category:"Worek z piaskiem"},{name:"Sandbag deadlifts",category:"Worek z piaskiem"},{name:"Sandbag rotations",category:"Worek z piaskiem"},
  // Taśmy oporowe
  {name:"Resistance band squats",category:"Taśmy oporowe"},{name:"Resistance band deadlifts",category:"Taśmy oporowe"},{name:"Resistance band rows",category:"Taśmy oporowe"},{name:"Resistance band chest press",category:"Taśmy oporowe"},{name:"Resistance band shoulder press",category:"Taśmy oporowe"},{name:"Resistance band biceps curls",category:"Taśmy oporowe"},{name:"Resistance band triceps extensions",category:"Taśmy oporowe"},{name:"Resistance band lateral raises",category:"Taśmy oporowe"},{name:"Resistance band leg extensions",category:"Taśmy oporowe"},{name:"Resistance band leg curls",category:"Taśmy oporowe"},{name:"Resistance band hip abductions",category:"Taśmy oporowe"},{name:"Resistance band hip adductions",category:"Taśmy oporowe"},{name:"Resistance band pull-aparts",category:"Taśmy oporowe"},{name:"Resistance band pull-downs",category:"Taśmy oporowe"},{name:"Resistance band rotations",category:"Taśmy oporowe"},{name:"Resistance band woodchops",category:"Taśmy oporowe"},
  // TRX
  {name:"TRX squats",category:"TRX"},{name:"TRX rows",category:"TRX"},{name:"TRX chest press",category:"TRX"},{name:"TRX push-ups",category:"TRX"},{name:"TRX mountain climbers",category:"TRX"},{name:"TRX suspension planks",category:"TRX"},{name:"TRX suspension curls",category:"TRX"},{name:"TRX suspension triceps",category:"TRX"},{name:"TRX suspension lunges",category:"TRX"},{name:"TRX suspension hamstring curls",category:"TRX"},{name:"TRX side planks",category:"TRX"},{name:"TRX atomic push-ups",category:"TRX"},{name:"TRX fallouts",category:"TRX"},
  // Maszyny kablowe
  {name:"Cable machine rotations",category:"Maszyny kablowe"},{name:"Cable machine chops",category:"Maszyny kablowe"},{name:"Cable machine high-to-low chops",category:"Maszyny kablowe"},{name:"Cable machine low-to-high chops",category:"Maszyny kablowe"},{name:"Cable machine side bends",category:"Maszyny kablowe"},{name:"Cable machine crunches",category:"Maszyny kablowe"},{name:"Cable machine leg curls",category:"Maszyny kablowe"},{name:"Cable machine leg extensions",category:"Maszyny kablowe"},{name:"Cable machine hip abductions",category:"Maszyny kablowe"},{name:"Cable machine hip adductions",category:"Maszyny kablowe"},
  // Maszyny
  {name:"Machine chest press",category:"Maszyny"},{name:"Machine row",category:"Maszyny"},{name:"Machine leg press",category:"Maszyny"},{name:"Machine leg extension",category:"Maszyny"},{name:"Machine leg curl",category:"Maszyny"},{name:"Machine shoulder press",category:"Maszyny"},{name:"Machine lateral raise",category:"Maszyny"},{name:"Machine seated row",category:"Maszyny"},{name:"Machine pec deck",category:"Maszyny"},{name:"Machine reverse pec deck",category:"Maszyny"},{name:"Machine hip abduction",category:"Maszyny"},{name:"Machine hip adduction",category:"Maszyny"},{name:"Machine glute drive",category:"Maszyny"},{name:"Machine calf raise",category:"Maszyny"},{name:"Machine triceps dips",category:"Maszyny"},{name:"Machine lat pulldown",category:"Maszyny"},{name:"Machine biceps curl",category:"Maszyny"},{name:"Machine triceps extension",category:"Maszyny"},{name:"Machine ab crunch",category:"Maszyny"},{name:"Machine back extension",category:"Maszyny"},{name:"Machine sit-up",category:"Maszyny"},{name:"Machine rotary torso",category:"Maszyny"},
  // Sztanga
  {name:"Barbell bench press",category:"Sztanga"},{name:"Barbell incline press",category:"Sztanga"},{name:"Barbell decline press",category:"Sztanga"},{name:"Barbell row",category:"Sztanga"},{name:"Barbell deadlift",category:"Sztanga"},{name:"Barbell squat",category:"Sztanga"},{name:"Barbell front squat",category:"Sztanga"},{name:"Barbell back squat",category:"Sztanga"},{name:"Barbell overhead press",category:"Sztanga"},{name:"Barbell high pull",category:"Sztanga"},{name:"Barbell clean",category:"Sztanga"},{name:"Barbell jerk",category:"Sztanga"},{name:"Barbell snatch",category:"Sztanga"},{name:"Barbell upright row",category:"Sztanga"},{name:"Barbell shrug",category:"Sztanga"},{name:"Barbell reverse curl",category:"Sztanga"},{name:"Barbell curl",category:"Sztanga"},{name:"Barbell close grip press",category:"Sztanga"},{name:"Barbell floor press",category:"Sztanga"},{name:"Barbell pin press",category:"Sztanga"},{name:"Barbell pause squat",category:"Sztanga"},{name:"Barbell deficit deadlift",category:"Sztanga"},{name:"Barbell rack pull",category:"Sztanga"},
  // Hantle
  {name:"Dumbbell pullovers",category:"Hantle"},{name:"Dumbbell floor press",category:"Hantle"},{name:"Dumbbell goblet squats",category:"Hantle"},{name:"Dumbbell snatches",category:"Hantle"},{name:"Dumbbell clean and press",category:"Hantle"},{name:"Dumbbell thrusters",category:"Hantle"},{name:"Dumbbell Turkish get-ups",category:"Hantle"},{name:"Dumbbell windmills",category:"Hantle"},{name:"Dumbbell bench press",category:"Hantle"},{name:"Dumbbell incline press",category:"Hantle"},{name:"Dumbbell decline press",category:"Hantle"},{name:"Dumbbell single arm rows",category:"Hantle"},{name:"Dumbbell squat",category:"Hantle"},{name:"Dumbbell front squat",category:"Hantle"},{name:"Dumbbell deadlift",category:"Hantle"},{name:"Dumbbell sumo deadlift",category:"Hantle"},{name:"Dumbbell overhead press",category:"Hantle"},{name:"Dumbbell push press",category:"Hantle"},{name:"Dumbbell shoulder raise",category:"Hantle"},{name:"Dumbbell lateral raise",category:"Hantle"},{name:"Dumbbell reverse fly",category:"Hantle"},{name:"Dumbbell alternating curls",category:"Hantle"},{name:"Dumbbell concentrations curls",category:"Hantle"},{name:"Dumbbell triceps kickbacks",category:"Hantle"},{name:"Dumbbell overhead extension",category:"Hantle"},{name:"Dumbbell lunges",category:"Hantle"},{name:"Dumbbell walking lunges",category:"Hantle"},{name:"Dumbbell step-ups",category:"Hantle"},{name:"Dumbbell calf raises",category:"Hantle"},{name:"Dumbbell carries",category:"Hantle"},{name:"Dumbbell suitcase carries",category:"Hantle"},{name:"Dumbbell farmer's carry",category:"Hantle"},{name:"Dumbbell overhead carry",category:"Hantle"},{name:"Dumbbell single arm row",category:"Hantle"},{name:"Dumbbell renegade rows",category:"Hantle"},{name:"Dumbbell push-ups",category:"Hantle"},{name:"Dumbbell rotations",category:"Hantle"},{name:"Dumbbell wood chops",category:"Hantle"},{name:"Dumbbell side bends",category:"Hantle"},{name:"Dumbbell Russian twists",category:"Hantle"},{name:"Dumbbell single leg deadlifts",category:"Hantle"},{name:"Dumbbell single leg squats",category:"Hantle"},{name:"Dumbbell single leg rows",category:"Hantle"},{name:"Dumbbell single leg carries",category:"Hantle"},{name:"Dumbbell tempo squats",category:"Hantle"},{name:"Dumbbell pause squats",category:"Hantle"},{name:"Dumbbell pin presses",category:"Hantle"},{name:"Dumbbell floor presses",category:"Hantle"},{name:"Dumbbell neutral grip press",category:"Hantle"},{name:"Dumbbell narrow grip press",category:"Hantle"},{name:"Dumbbell wide grip press",category:"Hantle"},
  // Piłka lekarska
  {name:"Med ball chest passes",category:"Piłka lekarska"},{name:"Med ball overhead throws",category:"Piłka lekarska"},{name:"Med ball slams to floor",category:"Piłka lekarska"},{name:"Med ball side throws",category:"Piłka lekarska"},{name:"Med ball Russian twists",category:"Piłka lekarska"},{name:"Med ball rotations",category:"Piłka lekarska"},{name:"Med ball wall throws",category:"Piłka lekarska"},{name:"Med ball bounces",category:"Piłka lekarska"},{name:"Med ball chest catches",category:"Piłka lekarska"},{name:"Med ball single leg squats",category:"Piłka lekarska"},{name:"Med ball rotational slams",category:"Piłka lekarska"},{name:"Med ball rainbow slams",category:"Piłka lekarska"},
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
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
        exercises: PRESET_EXERCISES,
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["exercises-library"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Importowanie zakończone", `Dodano ${result.imported} ćwiczeń do biblioteki.`);
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
      category: form.category.trim() || null,
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
          (() => {
            const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
              const key = ex.category || "Inne";
              if (!acc[key]) acc[key] = [];
              acc[key].push(ex);
              return acc;
            }, {});
            const categoryOrder = [...EXERCISE_CATEGORIES, "Inne"];
            const sortedKeys = Object.keys(grouped).sort(
              (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
            );
            return sortedKeys.map((cat) => {
              const isCollapsed = collapsedCategories.has(cat);
              const toggleCollapse = () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCollapsedCategories((prev) => {
                  const next = new Set(prev);
                  if (next.has(cat)) next.delete(cat);
                  else next.add(cat);
                  return next;
                });
              };
              return (
              <View key={cat}>
                <Pressable
                  onPress={toggleCollapse}
                  style={({ pressed }) => [
                    styles.categoryHeader,
                    { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.categoryHeaderText, { color: colors.foreground }]}>{cat}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>
                      {grouped[cat].length}
                    </Text>
                    <Ionicons
                      name={isCollapsed ? "chevron-down" : "chevron-up"}
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </View>
                </Pressable>
                {!isCollapsed && grouped[cat].map((ex) => {
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
                            <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
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
                              onPress={(e) => { e.stopPropagation?.(); openEditModal(ex); }}
                              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                              testID={`button-edit-exercise-${ex.id}`}
                              hitSlop={8}
                            >
                              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                            </Pressable>
                            <Pressable
                              onPress={(e) => { e.stopPropagation?.(); confirmDelete(ex); }}
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
                              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{ex.defaultSets} serie</Text>
                            </View>
                          )}
                          {ex.defaultReps != null && (
                            <View style={styles.metaChip}>
                              <Ionicons name="repeat-outline" size={13} color={colors.mutedForeground} />
                              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{ex.defaultReps} pow.</Text>
                            </View>
                          )}
                          {ex.defaultLoad ? (
                            <View style={styles.metaChip}>
                              <Ionicons name="fitness-outline" size={13} color={colors.mutedForeground} />
                              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{ex.defaultLoad}</Text>
                            </View>
                          ) : null}
                          {ex.defaultRestTime != null && (
                            <View style={styles.metaChip}>
                              <Ionicons name="timer-outline" size={13} color={colors.mutedForeground} />
                              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{ex.defaultRestTime}s odpoczynku</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
            });
          })()
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
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Kategoria</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChips}
                  keyboardShouldPersistTaps="handled"
                >
                  {EXERCISE_CATEGORIES.map((cat) => {
                    const active = form.category === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setForm((f) => ({ ...f, category: active ? "" : cat }))}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: active ? colors.primary : colors.background,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
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
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  categoryHeaderText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.1,
  },
  categoryCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  categoryChips: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
