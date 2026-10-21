/** Ready-made plans a trainer can start from; they are copied into the trainer's own plans and edited from there. */

export interface TemplateExercise {
  name: string;
  sets: number;
  reps: number;
  restTime: number; // seconds
  description?: string; // a short technique cue
}

export interface TemplateWorkout {
  name: string;
  exercises: TemplateExercise[];
}

export interface PlanTemplate {
  key: string;
  name: string;
  description: string;
  level: "początkujący" | "średniozaawansowany";
  daysPerWeek: number;
  workouts: TemplateWorkout[];
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    key: "fbw-3",
    name: "FBW – całe ciało, 3 dni",
    description: "Trzy treningi całego ciała w tygodniu, najlepiej z dniem przerwy między nimi. Dobry start dla osoby, która dopiero zaczyna.",
    level: "początkujący",
    daysPerWeek: 3,
    workouts: [
      {
        name: "FBW A",
        exercises: [
          { name: "Przysiad ze sztangą", sets: 3, reps: 8, restTime: 120, description: "Kolana w linii stóp, plecy proste, zejdź do równoległości ud." },
          { name: "Wyciskanie sztangi leżąc", sets: 3, reps: 8, restTime: 120, description: "Łopatki ściągnięte, sztanga do dolnej części klatki." },
          { name: "Wiosłowanie sztangą w opadzie", sets: 3, reps: 10, restTime: 90, description: "Tułów stabilny, przyciągaj do pępka." },
          { name: "Wyciskanie nad głowę", sets: 2, reps: 10, restTime: 90 },
          { name: "Plank", sets: 3, reps: 30, restTime: 60, description: "Powtórzenia to sekundy w pozycji." },
        ],
      },
      {
        name: "FBW B",
        exercises: [
          { name: "Martwy ciąg rumuński", sets: 3, reps: 8, restTime: 120, description: "Biodra do tyłu, sztanga blisko nóg, lekko ugięte kolana." },
          { name: "Wyciskanie hantli na skosie", sets: 3, reps: 10, restTime: 90 },
          { name: "Podciąganie na drążku z gumą", sets: 3, reps: 6, restTime: 90 },
          { name: "Wykroki z hantlami", sets: 3, reps: 10, restTime: 90 },
          { name: "Unoszenie nóg w zwisie", sets: 3, reps: 10, restTime: 60 },
        ],
      },
      {
        name: "FBW C",
        exercises: [
          { name: "Przysiad bułgarski", sets: 3, reps: 8, restTime: 90 },
          { name: "Pompki", sets: 3, reps: 12, restTime: 90 },
          { name: "Wiosłowanie hantlą jednorącz", sets: 3, reps: 10, restTime: 90 },
          { name: "Hip thrust", sets: 3, reps: 10, restTime: 90 },
          { name: "Martwy robak (dead bug)", sets: 3, reps: 12, restTime: 60 },
        ],
      },
    ],
  },
  {
    key: "ppl-3",
    name: "Push / Pull / Legs, 3 dni",
    description: "Podział na ruchy pchające, ciągnące i nogi. Każda partia raz w tygodniu, więcej objętości na jeden trening.",
    level: "średniozaawansowany",
    daysPerWeek: 3,
    workouts: [
      {
        name: "Push (klatka, barki, triceps)",
        exercises: [
          { name: "Wyciskanie sztangi leżąc", sets: 4, reps: 6, restTime: 150 },
          { name: "Wyciskanie hantli na skosie", sets: 3, reps: 10, restTime: 90 },
          { name: "Wyciskanie nad głowę", sets: 3, reps: 8, restTime: 120 },
          { name: "Unoszenie hantli bokiem", sets: 3, reps: 15, restTime: 60 },
          { name: "Prostowanie ramion na wyciągu", sets: 3, reps: 12, restTime: 60 },
        ],
      },
      {
        name: "Pull (plecy, biceps)",
        exercises: [
          { name: "Martwy ciąg", sets: 3, reps: 5, restTime: 180, description: "Napięty brzuch, sztanga przy goleniach, prosty kręgosłup." },
          { name: "Podciąganie nachwytem", sets: 4, reps: 8, restTime: 120 },
          { name: "Wiosłowanie na wyciągu siedząc", sets: 3, reps: 10, restTime: 90 },
          { name: "Face pull", sets: 3, reps: 15, restTime: 60 },
          { name: "Uginanie ramion z hantlami", sets: 3, reps: 12, restTime: 60 },
        ],
      },
      {
        name: "Legs (nogi, brzuch)",
        exercises: [
          { name: "Przysiad ze sztangą", sets: 4, reps: 6, restTime: 150 },
          { name: "Martwy ciąg rumuński", sets: 3, reps: 8, restTime: 120 },
          { name: "Wypychanie nóg na suwnicy", sets: 3, reps: 12, restTime: 90 },
          { name: "Uginanie nóg leżąc", sets: 3, reps: 12, restTime: 60 },
          { name: "Wspięcia na palce stojąc", sets: 4, reps: 15, restTime: 60 },
        ],
      },
    ],
  },
  {
    key: "upper-lower-4",
    name: "Góra / Dół, 4 dni",
    description: "Dwa treningi górnej i dwa dolnej części ciała w tygodniu. Każda partia dwa razy, dobra równowaga objętości i regeneracji.",
    level: "średniozaawansowany",
    daysPerWeek: 4,
    workouts: [
      {
        name: "Góra 1 (siła)",
        exercises: [
          { name: "Wyciskanie sztangi leżąc", sets: 4, reps: 5, restTime: 150 },
          { name: "Wiosłowanie sztangą w opadzie", sets: 4, reps: 6, restTime: 120 },
          { name: "Wyciskanie nad głowę", sets: 3, reps: 8, restTime: 90 },
          { name: "Podciąganie nachwytem", sets: 3, reps: 8, restTime: 90 },
          { name: "Uginanie ramion ze sztangą", sets: 2, reps: 10, restTime: 60 },
        ],
      },
      {
        name: "Dół 1 (siła)",
        exercises: [
          { name: "Przysiad ze sztangą", sets: 4, reps: 5, restTime: 180 },
          { name: "Martwy ciąg rumuński", sets: 3, reps: 8, restTime: 120 },
          { name: "Wykroki chodzone", sets: 3, reps: 10, restTime: 90 },
          { name: "Wspięcia na palce stojąc", sets: 4, reps: 12, restTime: 60 },
          { name: "Unoszenie nóg w zwisie", sets: 3, reps: 10, restTime: 60 },
        ],
      },
      {
        name: "Góra 2 (objętość)",
        exercises: [
          { name: "Wyciskanie hantli na skosie", sets: 4, reps: 10, restTime: 90 },
          { name: "Wiosłowanie hantlą jednorącz", sets: 4, reps: 10, restTime: 90 },
          { name: "Unoszenie hantli bokiem", sets: 4, reps: 15, restTime: 60 },
          { name: "Ściąganie drążka wyciągu górnego", sets: 3, reps: 12, restTime: 75 },
          { name: "Prostowanie ramion na wyciągu", sets: 3, reps: 12, restTime: 60 },
        ],
      },
      {
        name: "Dół 2 (objętość)",
        exercises: [
          { name: "Wypychanie nóg na suwnicy", sets: 4, reps: 12, restTime: 90 },
          { name: "Przysiad bułgarski", sets: 3, reps: 10, restTime: 90 },
          { name: "Uginanie nóg leżąc", sets: 4, reps: 12, restTime: 60 },
          { name: "Hip thrust", sets: 4, reps: 10, restTime: 90 },
          { name: "Plank", sets: 3, reps: 45, restTime: 60, description: "Powtórzenia to sekundy w pozycji." },
        ],
      },
    ],
  },
  {
    key: "home-3",
    name: "Trening w domu bez sprzętu, 3 dni",
    description: "Trzy krótkie treningi z masą własnego ciała. Wystarczy mata i krzesło, więc nadaje się na początek albo na podróż.",
    level: "początkujący",
    daysPerWeek: 3,
    workouts: [
      {
        name: "Dom A (nogi i brzuch)",
        exercises: [
          { name: "Przysiad z masą ciała", sets: 3, reps: 15, restTime: 60 },
          { name: "Wykroki w miejscu", sets: 3, reps: 10, restTime: 60 },
          { name: "Mostek biodrowy", sets: 3, reps: 15, restTime: 60 },
          { name: "Plank", sets: 3, reps: 30, restTime: 45, description: "Powtórzenia to sekundy w pozycji." },
          { name: "Martwy robak (dead bug)", sets: 3, reps: 12, restTime: 45 },
        ],
      },
      {
        name: "Dom B (góra ciała)",
        exercises: [
          { name: "Pompki", sets: 3, reps: 10, restTime: 75, description: "Zbyt trudne? Zacznij od pompek z rękami na krześle." },
          { name: "Pompki odwrotne na krześle", sets: 3, reps: 10, restTime: 60 },
          { name: "Superman", sets: 3, reps: 12, restTime: 45 },
          { name: "Pozycja psa z głową w dół – unoszenie ramion", sets: 3, reps: 10, restTime: 60 },
          { name: "Deska boczna", sets: 2, reps: 20, restTime: 45, description: "Powtórzenia to sekundy, na każdą stronę." },
        ],
      },
      {
        name: "Dom C (całe ciało)",
        exercises: [
          { name: "Przysiad z wyskokiem", sets: 3, reps: 10, restTime: 60 },
          { name: "Pompki diamentowe", sets: 3, reps: 8, restTime: 75 },
          { name: "Wykroki w tył", sets: 3, reps: 10, restTime: 60 },
          { name: "Burpees", sets: 3, reps: 8, restTime: 75 },
          { name: "Brzuszki rowerowe", sets: 3, reps: 20, restTime: 45 },
        ],
      },
    ],
  },
];

export function findPlanTemplate(key: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find((template) => template.key === key);
}

/** The payload `POST /api/plans/bulk` expects, built from a template. */
export function planFromTemplate(template: PlanTemplate, name?: string) {
  return {
    name: (name ?? "").trim() || template.name,
    description: template.description,
    workouts: template.workouts.map((workout, workoutIndex) => ({
      name: workout.name,
      orderIndex: workoutIndex,
      exercises: workout.exercises.map((exercise, exerciseIndex) => ({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restTime: exercise.restTime,
        description: exercise.description ?? null,
        orderIndex: exerciseIndex,
      })),
    })),
  };
}
