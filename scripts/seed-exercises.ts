import { db } from "../server/db";
import { globalExercises } from "../shared/schema";

const exercisesData = [
  // CHEST (20 exercises)
  { namePl: "Wyciskanie sztangi na ławce poziomej", nameEn: "Barbell Bench Press", muscleGroup: "chest" },
  { namePl: "Wyciskanie hantli na ławce poziomej", nameEn: "Dumbbell Bench Press", muscleGroup: "chest" },
  { namePl: "Wyciskanie sztangi na ławce dodatniej", nameEn: "Incline Barbell Bench Press", muscleGroup: "chest" },
  { namePl: "Wyciskanie hantli na ławce dodatniej", nameEn: "Incline Dumbbell Bench Press", muscleGroup: "chest" },
  { namePl: "Wyciskanie sztangi na ławce ujemnej", nameEn: "Decline Barbell Bench Press", muscleGroup: "chest" },
  { namePl: "Wyciskanie hantli na ławce ujemnej", nameEn: "Decline Dumbbell Bench Press", muscleGroup: "chest" },
  { namePl: "Rozpiętki hantlami na ławce poziomej", nameEn: "Dumbbell Chest Fly", muscleGroup: "chest" },
  { namePl: "Rozpiętki na ławce dodatniej", nameEn: "Incline Dumbbell Fly", muscleGroup: "chest" },
  { namePl: "Rozpiętki kablowe stojąc", nameEn: "Standing Cable Fly", muscleGroup: "chest" },
  { namePl: "Krzyżowanie linek wyciągu góra–dół", nameEn: "High Cable Crossover", muscleGroup: "chest" },
  { namePl: "Krzyżowanie linek wyciągu dół–góra", nameEn: "Low Cable Crossover", muscleGroup: "chest" },
  { namePl: "Pompki klasyczne", nameEn: "Push-ups", muscleGroup: "chest" },
  { namePl: "Pompki diamentowe", nameEn: "Diamond Push-ups", muscleGroup: "chest" },
  { namePl: "Pompki szerokie", nameEn: "Wide Push-ups", muscleGroup: "chest" },
  { namePl: "Pompki na poręczach (dipy)", nameEn: "Chest Dips", muscleGroup: "chest" },
  { namePl: "Maszyna chest press", nameEn: "Chest Press Machine", muscleGroup: "chest" },
  { namePl: "Maszyna pec deck", nameEn: "Pec Deck Machine", muscleGroup: "chest" },
  { namePl: "Wyciskanie hantli neutralnym chwytem", nameEn: "Neutral Grip Dumbbell Press", muscleGroup: "chest" },
  { namePl: "Izolacja kablami — single arm pec fly", nameEn: "Single Arm Cable Pec Fly", muscleGroup: "chest" },
  { namePl: "Pompki z obciążeniem", nameEn: "Weighted Push-ups", muscleGroup: "chest" },

  // BACK (20 exercises)
  { namePl: "Podciąganie nachwytem", nameEn: "Pull-ups (Overhand Grip)", muscleGroup: "back" },
  { namePl: "Podciąganie podchwytem", nameEn: "Chin-ups (Underhand Grip)", muscleGroup: "back" },
  { namePl: "Wiosłowanie sztangą", nameEn: "Barbell Row", muscleGroup: "back" },
  { namePl: "Wiosłowanie hantlą", nameEn: "Dumbbell Row", muscleGroup: "back" },
  { namePl: "Ściąganie drążka wyciągu szerokim chwytem", nameEn: "Wide Grip Lat Pulldown", muscleGroup: "back" },
  { namePl: "Ściąganie drążka wąskim chwytem", nameEn: "Close Grip Lat Pulldown", muscleGroup: "back" },
  { namePl: "Wiosłowanie siedząc na wyciągu", nameEn: "Seated Cable Row", muscleGroup: "back" },
  { namePl: "Wiosłowanie T-bar", nameEn: "T-Bar Row", muscleGroup: "back" },
  { namePl: "Martwy ciąg klasyczny", nameEn: "Conventional Deadlift", muscleGroup: "back" },
  { namePl: "Martwy ciąg sumo", nameEn: "Sumo Deadlift", muscleGroup: "back" },
  { namePl: "Martwy ciąg rumuński", nameEn: "Romanian Deadlift", muscleGroup: "back" },
  { namePl: "Face pull", nameEn: "Face Pull", muscleGroup: "back" },
  { namePl: "Przenoszenie hantla w leżeniu", nameEn: "Dumbbell Pullover", muscleGroup: "back" },
  { namePl: "Pullover z linką wyciągu", nameEn: "Cable Pullover", muscleGroup: "back" },
  { namePl: "Wiosłowanie na maszynie Hammer", nameEn: "Hammer Strength Row", muscleGroup: "back" },
  { namePl: "Ściąganie linki wyciągu do bioder", nameEn: "Straight Arm Pulldown", muscleGroup: "back" },
  { namePl: "Unoszenie tułowia na ławce rzymskiej", nameEn: "Back Extension", muscleGroup: "back" },
  { namePl: "Superman", nameEn: "Superman", muscleGroup: "back" },
  { namePl: "Reverse hyper", nameEn: "Reverse Hyperextension", muscleGroup: "back" },
  { namePl: "Podciąganie australijskie (inverted row)", nameEn: "Inverted Row", muscleGroup: "back" },

  // SHOULDERS (20 exercises)
  { namePl: "Wyciskanie hantli nad głowę", nameEn: "Dumbbell Shoulder Press", muscleGroup: "shoulders" },
  { namePl: "Military press sztangą", nameEn: "Military Press", muscleGroup: "shoulders" },
  { namePl: "Arnold press", nameEn: "Arnold Press", muscleGroup: "shoulders" },
  { namePl: "Unoszenie hantli bokiem", nameEn: "Lateral Raise", muscleGroup: "shoulders" },
  { namePl: "Unoszenie hantli przodem", nameEn: "Front Raise", muscleGroup: "shoulders" },
  { namePl: "Face pull", nameEn: "Face Pull", muscleGroup: "shoulders" },
  { namePl: "Odwrotne rozpiętki w opadzie", nameEn: "Reverse Fly", muscleGroup: "shoulders" },
  { namePl: "Unoszenie kabli bokiem", nameEn: "Cable Lateral Raise", muscleGroup: "shoulders" },
  { namePl: "Wznosy hantli w opadzie", nameEn: "Bent Over Dumbbell Raise", muscleGroup: "shoulders" },
  { namePl: "Y-raise", nameEn: "Y-Raise", muscleGroup: "shoulders" },
  { namePl: "Wyciskanie jednorącz na wyciągu", nameEn: "Single Arm Cable Press", muscleGroup: "shoulders" },
  { namePl: "Wyciskanie maszynowe shoulder press", nameEn: "Machine Shoulder Press", muscleGroup: "shoulders" },
  { namePl: "OHP z kettlem", nameEn: "Kettlebell Overhead Press", muscleGroup: "shoulders" },
  { namePl: "Pompki pike", nameEn: "Pike Push-ups", muscleGroup: "shoulders" },
  { namePl: "Handstand push-up", nameEn: "Handstand Push-up", muscleGroup: "shoulders" },
  { namePl: "Cuban press", nameEn: "Cuban Press", muscleGroup: "shoulders" },
  { namePl: "Rotacja zewnętrzna na gumach", nameEn: "External Rotation with Band", muscleGroup: "shoulders" },
  { namePl: "Rotacja wewnętrzna na gumach", nameEn: "Internal Rotation with Band", muscleGroup: "shoulders" },
  { namePl: "Lateral raise przy wyciągu niskim", nameEn: "Low Cable Lateral Raise", muscleGroup: "shoulders" },
  { namePl: "Unoszenie hantli do brody (upright row)", nameEn: "Upright Row", muscleGroup: "shoulders" },

  // BICEPS (20 exercises)
  { namePl: "Uginanie hantli stojąc", nameEn: "Standing Dumbbell Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie sztangi stojąc", nameEn: "Standing Barbell Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie młotkowe", nameEn: "Hammer Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie supinowane", nameEn: "Supinating Dumbbell Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie na modlitewniku", nameEn: "Preacher Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie hantli z rotacją", nameEn: "Dumbbell Curl with Rotation", muscleGroup: "biceps" },
  { namePl: "Uginanie na wyciągu dolnym", nameEn: "Low Cable Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie liną młotkowe", nameEn: "Rope Hammer Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie na maszynie", nameEn: "Machine Bicep Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie jednorącz na kablu", nameEn: "Single Arm Cable Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie koncentracyjne", nameEn: "Concentration Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie na ławce skośnej", nameEn: "Incline Dumbbell Curl", muscleGroup: "biceps" },
  { namePl: "Drag curl", nameEn: "Drag Curl", muscleGroup: "biceps" },
  { namePl: "Reverse curl", nameEn: "Reverse Curl", muscleGroup: "biceps" },
  { namePl: "Zottman curl", nameEn: "Zottman Curl", muscleGroup: "biceps" },
  { namePl: "Przerzuty kettlem (biceps emphasis)", nameEn: "Kettlebell Swing (Biceps Emphasis)", muscleGroup: "biceps" },
  { namePl: "Izometria bicepsowa przy ścianie", nameEn: "Wall Isometric Bicep Hold", muscleGroup: "biceps" },
  { namePl: "Uginanie gumami oporowymi", nameEn: "Resistance Band Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie na TRX", nameEn: "TRX Bicep Curl", muscleGroup: "biceps" },
  { namePl: "Uginanie z pauzą na górze", nameEn: "Pause Curl", muscleGroup: "biceps" },

  // TRICEPS (20 exercises)
  { namePl: "Prostowanie ramion na wyciągu", nameEn: "Cable Tricep Pushdown", muscleGroup: "triceps" },
  { namePl: "Francuskie wyciskanie hantli", nameEn: "Dumbbell Skull Crusher", muscleGroup: "triceps" },
  { namePl: "Francuskie wyciskanie sztangi", nameEn: "Barbell Skull Crusher", muscleGroup: "triceps" },
  { namePl: "Dipy na poręczach", nameEn: "Tricep Dips", muscleGroup: "triceps" },
  { namePl: "Prostowanie jednorącz nad głową", nameEn: "Single Arm Overhead Extension", muscleGroup: "triceps" },
  { namePl: "Prostowanie ramion z liną", nameEn: "Rope Tricep Pushdown", muscleGroup: "triceps" },
  { namePl: "Kickback hantlem", nameEn: "Dumbbell Kickback", muscleGroup: "triceps" },
  { namePl: "Wyciskanie wąskim chwytem", nameEn: "Close Grip Bench Press", muscleGroup: "triceps" },
  { namePl: "Pompki tricepsowe", nameEn: "Tricep Push-ups", muscleGroup: "triceps" },
  { namePl: "Prostowanie na maszynie", nameEn: "Tricep Extension Machine", muscleGroup: "triceps" },
  { namePl: "Triceps press na wyciągu leżąc", nameEn: "Lying Cable Tricep Extension", muscleGroup: "triceps" },
  { namePl: "Reverse grip pushdown", nameEn: "Reverse Grip Pushdown", muscleGroup: "triceps" },
  { namePl: "Tate press", nameEn: "Tate Press", muscleGroup: "triceps" },
  { namePl: "Diamond push-up", nameEn: "Diamond Push-up", muscleGroup: "triceps" },
  { namePl: "Triceps dips z podwyższenia", nameEn: "Bench Dips", muscleGroup: "triceps" },
  { namePl: "Izolacja kablowa jednorącz", nameEn: "Single Arm Cable Pushdown", muscleGroup: "triceps" },
  { namePl: "JM Press", nameEn: "JM Press", muscleGroup: "triceps" },
  { namePl: "Prostowanie ramion gumą", nameEn: "Band Tricep Extension", muscleGroup: "triceps" },
  { namePl: "Triceps extension kettlem", nameEn: "Kettlebell Tricep Extension", muscleGroup: "triceps" },
  { namePl: "Izometria tricepsowa (push-down hold)", nameEn: "Isometric Tricep Hold", muscleGroup: "triceps" },

  // QUADS (20 exercises)
  { namePl: "Przysiad ze sztangą", nameEn: "Barbell Back Squat", muscleGroup: "quads" },
  { namePl: "Przysiad przedni", nameEn: "Front Squat", muscleGroup: "quads" },
  { namePl: "Przysiad goblet", nameEn: "Goblet Squat", muscleGroup: "quads" },
  { namePl: "Przysiad bułgarski", nameEn: "Bulgarian Split Squat", muscleGroup: "quads" },
  { namePl: "Wykroki chodzone", nameEn: "Walking Lunges", muscleGroup: "quads" },
  { namePl: "Wykroki w miejscu", nameEn: "Stationary Lunges", muscleGroup: "quads" },
  { namePl: "Step-up na skrzynię", nameEn: "Step-ups", muscleGroup: "quads" },
  { namePl: "Prostowanie nóg na maszynie", nameEn: "Leg Extension", muscleGroup: "quads" },
  { namePl: "Hack squat", nameEn: "Hack Squat", muscleGroup: "quads" },
  { namePl: "Przysiad sumo", nameEn: "Sumo Squat", muscleGroup: "quads" },
  { namePl: "Split squat", nameEn: "Split Squat", muscleGroup: "quads" },
  { namePl: "Cyclist squat", nameEn: "Cyclist Squat", muscleGroup: "quads" },
  { namePl: "Przysiad z pauzą", nameEn: "Pause Squat", muscleGroup: "quads" },
  { namePl: "Przysiad na maszynie smith", nameEn: "Smith Machine Squat", muscleGroup: "quads" },
  { namePl: "Sissy squat", nameEn: "Sissy Squat", muscleGroup: "quads" },
  { namePl: "Przysiad z kettlem (front)", nameEn: "Kettlebell Front Squat", muscleGroup: "quads" },
  { namePl: "Zercher squat", nameEn: "Zercher Squat", muscleGroup: "quads" },
  { namePl: "Przysiad na jednej nodze (pistol squat)", nameEn: "Pistol Squat", muscleGroup: "quads" },
  { namePl: "Wykrok tylny (reverse lunge)", nameEn: "Reverse Lunge", muscleGroup: "quads" },
  { namePl: "Wspięcia na palce stojąc (dodatkowe obciążenie quads)", nameEn: "Standing Calf Raise (Quad Emphasis)", muscleGroup: "quads" },

  // HAMSTRINGS (20 exercises)
  { namePl: "Martwy ciąg rumuński", nameEn: "Romanian Deadlift", muscleGroup: "hamstrings" },
  { namePl: "Martwy ciąg na prostych nogach", nameEn: "Stiff Leg Deadlift", muscleGroup: "hamstrings" },
  { namePl: "Uginanie nóg leżąc", nameEn: "Lying Leg Curl", muscleGroup: "hamstrings" },
  { namePl: "Uginanie nóg siedząc", nameEn: "Seated Leg Curl", muscleGroup: "hamstrings" },
  { namePl: "Glute-ham raise", nameEn: "Glute-Ham Raise", muscleGroup: "hamstrings" },
  { namePl: "Hip hinge z hantlami", nameEn: "Dumbbell Hip Hinge", muscleGroup: "hamstrings" },
  { namePl: "Most biodrowy jednonóż", nameEn: "Single Leg Hip Bridge", muscleGroup: "hamstrings" },
  { namePl: "Reverse hyper", nameEn: "Reverse Hyperextension", muscleGroup: "hamstrings" },
  { namePl: "Kettlebell swing", nameEn: "Kettlebell Swing", muscleGroup: "hamstrings" },
  { namePl: "Pull-through na wyciągu", nameEn: "Cable Pull-Through", muscleGroup: "hamstrings" },
  { namePl: "Martwy ciąg jednonóż", nameEn: "Single Leg Deadlift", muscleGroup: "hamstrings" },
  { namePl: "Hamstring curl na piłce", nameEn: "Stability Ball Hamstring Curl", muscleGroup: "hamstrings" },
  { namePl: "Slider leg curl", nameEn: "Slider Leg Curl", muscleGroup: "hamstrings" },
  { namePl: "Nordic hamstring curl", nameEn: "Nordic Hamstring Curl", muscleGroup: "hamstrings" },
  { namePl: "Martwy ciąg sumo lekko", nameEn: "Light Sumo Deadlift", muscleGroup: "hamstrings" },
  { namePl: "Back extension z naciskiem na tył uda", nameEn: "Hamstring-Focused Back Extension", muscleGroup: "hamstrings" },
  { namePl: "Good morning ze sztangą", nameEn: "Barbell Good Morning", muscleGroup: "hamstrings" },
  { namePl: "Good morning z gumą", nameEn: "Band Good Morning", muscleGroup: "hamstrings" },
  { namePl: "RDL z kettlem", nameEn: "Kettlebell RDL", muscleGroup: "hamstrings" },
  { namePl: "Uginanie gumą w klęku", nameEn: "Kneeling Band Leg Curl", muscleGroup: "hamstrings" },

  // GLUTES (20 exercises)
  { namePl: "Hip thrust", nameEn: "Hip Thrust", muscleGroup: "glutes" },
  { namePl: "Glute bridge", nameEn: "Glute Bridge", muscleGroup: "glutes" },
  { namePl: "Frog pump", nameEn: "Frog Pump", muscleGroup: "glutes" },
  { namePl: "Donkey kicks", nameEn: "Donkey Kicks", muscleGroup: "glutes" },
  { namePl: "Fire hydrant", nameEn: "Fire Hydrant", muscleGroup: "glutes" },
  { namePl: "Kickback na wyciągu", nameEn: "Cable Glute Kickback", muscleGroup: "glutes" },
  { namePl: "Kickback z gumą", nameEn: "Band Glute Kickback", muscleGroup: "glutes" },
  { namePl: "Odwodzenie nóg siedząc", nameEn: "Seated Hip Abduction", muscleGroup: "glutes" },
  { namePl: "Odwodzenie nóg stojąc", nameEn: "Standing Hip Abduction", muscleGroup: "glutes" },
  { namePl: "Most biodrowy jednonóż", nameEn: "Single Leg Glute Bridge", muscleGroup: "glutes" },
  { namePl: "Step-up na skrzynię", nameEn: "Step-ups (Glute Focus)", muscleGroup: "glutes" },
  { namePl: "Bulgarian split squat (glute focus)", nameEn: "Bulgarian Split Squat (Glute Focus)", muscleGroup: "glutes" },
  { namePl: "Martwy ciąg rumuński (glute emphasis)", nameEn: "Romanian Deadlift (Glute Focus)", muscleGroup: "glutes" },
  { namePl: "Pull-through", nameEn: "Cable Pull-Through", muscleGroup: "glutes" },
  { namePl: "Hip abduction machine", nameEn: "Hip Abduction Machine", muscleGroup: "glutes" },
  { namePl: "Reverse lunge (glute emphasis)", nameEn: "Reverse Lunge (Glute Focus)", muscleGroup: "glutes" },
  { namePl: "Curtsy lunge", nameEn: "Curtsy Lunge", muscleGroup: "glutes" },
  { namePl: "Side step z gumą", nameEn: "Band Side Step", muscleGroup: "glutes" },
  { namePl: "Monster walk z gumą", nameEn: "Monster Walk", muscleGroup: "glutes" },
  { namePl: "Glute bridge z gumą nad kolanami", nameEn: "Banded Glute Bridge", muscleGroup: "glutes" },

  // CORE (20 exercises)
  { namePl: "Deska (plank)", nameEn: "Plank", muscleGroup: "core" },
  { namePl: "Side plank", nameEn: "Side Plank", muscleGroup: "core" },
  { namePl: "Crunch", nameEn: "Crunch", muscleGroup: "core" },
  { namePl: "Reverse crunch", nameEn: "Reverse Crunch", muscleGroup: "core" },
  { namePl: "Leg raises", nameEn: "Leg Raises", muscleGroup: "core" },
  { namePl: "Hanging leg raises", nameEn: "Hanging Leg Raises", muscleGroup: "core" },
  { namePl: "Knee raises", nameEn: "Knee Raises", muscleGroup: "core" },
  { namePl: "Russian twist", nameEn: "Russian Twist", muscleGroup: "core" },
  { namePl: "Mountain climbers", nameEn: "Mountain Climbers", muscleGroup: "core" },
  { namePl: "Dead bug", nameEn: "Dead Bug", muscleGroup: "core" },
  { namePl: "Bird dog", nameEn: "Bird Dog", muscleGroup: "core" },
  { namePl: "Bicycle crunch", nameEn: "Bicycle Crunch", muscleGroup: "core" },
  { namePl: "Hollow body hold", nameEn: "Hollow Body Hold", muscleGroup: "core" },
  { namePl: "Roll-out na wałku", nameEn: "Ab Wheel Rollout", muscleGroup: "core" },
  { namePl: "Roll-out na wyciągu", nameEn: "Cable Rollout", muscleGroup: "core" },
  { namePl: "Pallof press", nameEn: "Pallof Press", muscleGroup: "core" },
  { namePl: "Woodchopper", nameEn: "Woodchopper", muscleGroup: "core" },
  { namePl: "Toe touches", nameEn: "Toe Touches", muscleGroup: "core" },
  { namePl: "Flutter kicks", nameEn: "Flutter Kicks", muscleGroup: "core" },
  { namePl: "Jackknife sit-up", nameEn: "Jackknife Sit-up", muscleGroup: "core" },
];

async function seedExercises() {
  console.log("Starting global exercises seed...");
  console.log(`Total exercises to insert: ${exercisesData.length}`);

  try {
    const existing = await db.select().from(globalExercises);
    if (existing.length > 0) {
      console.log(`Found ${existing.length} existing exercises. Skipping seed.`);
      console.log("To re-seed, first clear the global_exercises table.");
      process.exit(0);
    }

    const inserted = await db.insert(globalExercises).values(exercisesData).returning();
    console.log(`Successfully inserted ${inserted.length} exercises!`);

    const groups = exercisesData.reduce((acc, ex) => {
      acc[ex.muscleGroup] = (acc[ex.muscleGroup] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\nExercises by muscle group:");
    Object.entries(groups).forEach(([group, count]) => {
      console.log(`  ${group}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding exercises:", error);
    process.exit(1);
  }
}

seedExercises();
