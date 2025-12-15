import type {
  User,
  TrainingPlan,
  Workout,
  Exercise,
  WeeklyReport,
  DietPlan,
  DietMeal,
  MedicalTest,
  ClientPayment,
} from "@shared/schema";

export const DEMO_CLIENT_ID = "demo-client-000000";

const DEMO_PREFIX = "demo-";

export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_PREFIX);
}

export function getDemoClient(trainerId: string): User & { isDemo: true } {
  return {
    id: DEMO_CLIENT_ID,
    email: `demo-${trainerId.slice(0, 8)}@paneltrenera.demo`,
    password: "",
    firstName: "Jan",
    lastName: "Demonstracyjny",
    profileImageUrl: null,
    role: "client",
    isAdmin: false,
    hasFreeAccess: false,
    isTestUser: false,
    testUserTrainerId: null,
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationTokenExpiresAt: null,
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionTier: "start",
    subscriptionCancelledAt: null,
    trialEndsAt: null,
    referredByTrainerId: null,
    referralBonusDays: 0,
    clientCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDemo: true,
  };
}

interface DemoExercise extends Omit<Exercise, "workoutId"> {
  isDemo: true;
}

interface DemoWorkout extends Omit<Workout, "planId"> {
  exercises: DemoExercise[];
  isDemo: true;
}

interface DemoTrainingPlan extends TrainingPlan {
  workouts: DemoWorkout[];
  isDemo: true;
}

export function getDemoTrainingPlans(trainerId: string): DemoTrainingPlan[] {
  const now = new Date();
  const planId = "demo-plan-001";

  const workoutsData = [
    {
      id: "demo-workout-001",
      name: "Push Day - Klatka, Barki, Triceps",
      description: "Trening mięśni pchających. Skupienie na klatce piersiowej, barkach i tricepsach.",
      exercises: [
        { id: "demo-ex-001", name: "Wyciskanie sztangi na ławce płaskiej", sets: 4, reps: 8, load: "60kg", restTime: 120, description: "Klasyczne ćwiczenie na klatkę piersiową" },
        { id: "demo-ex-002", name: "Wyciskanie hantli na ławce skośnej", sets: 3, reps: 10, load: "22kg", restTime: 90, description: "Skupienie na górnej części klatki" },
        { id: "demo-ex-003", name: "Rozpiętki na maszynie", sets: 3, reps: 12, load: "15kg", restTime: 60, description: "Izolacja klatki piersiowej" },
        { id: "demo-ex-004", name: "Wyciskanie żołnierskie", sets: 4, reps: 8, load: "40kg", restTime: 120, description: "Główne ćwiczenie na barki" },
        { id: "demo-ex-005", name: "Francuskie wyciskanie", sets: 3, reps: 12, load: "25kg", restTime: 60, description: "Izolacja tricepsów" },
      ],
    },
    {
      id: "demo-workout-002",
      name: "Pull Day - Plecy, Biceps",
      description: "Trening mięśni ciągnących. Skupienie na plecach i bicepsach.",
      exercises: [
        { id: "demo-ex-006", name: "Podciąganie na drążku", sets: 4, reps: 8, load: "bodyweight", restTime: 120, description: "Fundamentalne ćwiczenie na plecy" },
        { id: "demo-ex-007", name: "Wiosłowanie sztangą", sets: 4, reps: 8, load: "60kg", restTime: 90, description: "Budowanie grubości pleców" },
        { id: "demo-ex-008", name: "Ściąganie drążka wyciągu górnego", sets: 3, reps: 10, load: "50kg", restTime: 60, description: "Rozbudowa szerokości pleców" },
        { id: "demo-ex-009", name: "Wiosłowanie hantlem jednorącz", sets: 3, reps: 10, load: "30kg", restTime: 60, description: "Praca jednostronna" },
        { id: "demo-ex-010", name: "Uginanie ramion ze sztangą", sets: 3, reps: 12, load: "25kg", restTime: 60, description: "Izolacja bicepsów" },
      ],
    },
    {
      id: "demo-workout-003",
      name: "Leg Day - Nogi",
      description: "Kompletny trening nóg. Ćwiczenia na czworogłowe, dwugłowe i łydki.",
      exercises: [
        { id: "demo-ex-011", name: "Przysiady ze sztangą", sets: 4, reps: 8, load: "80kg", restTime: 180, description: "Król ćwiczeń na nogi" },
        { id: "demo-ex-012", name: "Wykroki z hantlami", sets: 3, reps: 10, load: "20kg", restTime: 90, description: "Praca na każdą nogę osobno" },
        { id: "demo-ex-013", name: "Prostowanie nóg na maszynie", sets: 3, reps: 12, load: "40kg", restTime: 60, description: "Izolacja czworogłowych" },
        { id: "demo-ex-014", name: "Uginanie nóg na maszynie", sets: 3, reps: 12, load: "35kg", restTime: 60, description: "Izolacja dwugłowych" },
        { id: "demo-ex-015", name: "Wspięcia na palce", sets: 4, reps: 15, load: "60kg", restTime: 45, description: "Trening łydek" },
      ],
    },
  ];

  const workouts: DemoWorkout[] = workoutsData.map((w, workoutIndex) => ({
    id: w.id,
    planId: planId,
    name: w.name,
    description: w.description,
    orderIndex: workoutIndex,
    createdAt: now,
    updatedAt: now,
    isDemo: true as const,
    exercises: w.exercises.map((ex, exIndex) => ({
      id: ex.id,
      workoutId: w.id,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      load: ex.load,
      restTime: ex.restTime,
      description: ex.description,
      orderIndex: exIndex,
      videoUrl: null,
      technique: null,
      rir: null,
      tempo: null,
      isDemo: true as const,
    })),
  }));

  return [
    {
      id: planId,
      name: "Plan demonstracyjny - Push/Pull/Legs",
      description: "Klasyczny podział treningowy PPL. Trzy jednostki treningowe: Push (mięśnie pchające), Pull (mięśnie ciągnące) i Legs (nogi).",
      trainerId: trainerId,
      createdAt: now,
      updatedAt: now,
      workouts: workouts,
      isDemo: true as const,
    },
  ];
}

export function getDemoWeeklyReports(): (WeeklyReport & { isDemo: true })[] {
  const now = new Date();

  const reportsData = [
    {
      weeksAgo: 4,
      weight: "82",
      chest: "102",
      waist: "86",
      hips: "100",
      arm: "38",
      leg: "60",
      mood: "Dobry tydzień, czuję się zmotywowany do dalszej pracy.",
      cardio: "3x30min bieganie",
      supplements: "Kreatyna 5g/dzień, Witamina D3 2000IU",
    },
    {
      weeksAgo: 3,
      weight: "81.5",
      chest: "102.5",
      waist: "85",
      hips: "99.5",
      arm: "38.5",
      leg: "60",
      mood: "Lekkie zmęczenie po intensywnym tygodniu, ale wyniki są widoczne.",
      cardio: "4x25min rower stacjonarny",
      supplements: "Kreatyna 5g/dzień, Omega-3 2g/dzień",
    },
    {
      weeksAgo: 2,
      weight: "81",
      chest: "103",
      waist: "84",
      hips: "99",
      arm: "39",
      leg: "60.5",
      mood: "Świetne samopoczucie, widoczne postępy w sile.",
      cardio: "3x35min pływanie",
      supplements: "Kreatyna 5g/dzień, Magnez 400mg",
    },
    {
      weeksAgo: 1,
      weight: "80.5",
      chest: "103.5",
      waist: "83",
      hips: "98.5",
      arm: "39.5",
      leg: "61",
      mood: "Bardzo dobry tydzień! Osiągnąłem nowy rekord w martwym ciągu.",
      cardio: "4x30min bieganie interwałowe",
      supplements: "Kreatyna 5g/dzień, Witamina D3 4000IU, ZMA",
    },
  ];

  return reportsData.map((report, index) => {
    const reportDate = new Date(now);
    reportDate.setDate(reportDate.getDate() - (report.weeksAgo * 7));

    return {
      id: `demo-report-${String(index + 1).padStart(3, "0")}`,
      clientId: DEMO_CLIENT_ID,
      reportDate: reportDate,
      weight: report.weight,
      saturation: null,
      chest: report.chest,
      waist: report.waist,
      hips: report.hips,
      arm: report.arm,
      leg: report.leg,
      cardio: report.cardio,
      supplements: report.supplements,
      mood: report.mood,
      thoughts: null,
      photoUrl: null,
      viewedByTrainer: false,
      createdAt: reportDate,
      isDemo: true as const,
    };
  });
}

interface DemoDietPlanWithMeals extends DietPlan {
  meals: (DietMeal & { isDemo: true })[];
  isDemo: true;
}

export function getDemoDietPlan(trainerId: string): DemoDietPlanWithMeals {
  const now = new Date();
  const dietPlanId = "demo-diet-001";

  const mealsData = [
    { orderIndex: 1, name: "Śniadanie", description: "Owsianka z bananami i masłem orzechowym + 3 jajka", suggestedTime: "07:00", calories: 550, protein: 30, fat: 22, carbs: 60 },
    { orderIndex: 2, name: "Drugie śniadanie", description: "Shake proteinowy z owocami + garść orzechów", suggestedTime: "10:00", calories: 400, protein: 35, fat: 15, carbs: 35 },
    { orderIndex: 3, name: "Obiad", description: "Pierś z kurczaka z ryżem i warzywami na parze", suggestedTime: "13:00", calories: 650, protein: 50, fat: 15, carbs: 75 },
    { orderIndex: 4, name: "Podwieczorek", description: "Serek wiejski z pomidorami i pieczywem pełnoziarnistym", suggestedTime: "16:00", calories: 350, protein: 25, fat: 10, carbs: 40 },
    { orderIndex: 5, name: "Kolacja", description: "Łosoś pieczony z ziemniakami i surówką", suggestedTime: "19:00", calories: 550, protein: 40, fat: 18, carbs: 70 },
  ];

  const meals: (DietMeal & { isDemo: true })[] = mealsData.map((meal, index) => ({
    id: `demo-meal-${String(index + 1).padStart(3, "0")}`,
    planId: dietPlanId,
    dayOfWeek: 1,
    orderIndex: meal.orderIndex,
    name: meal.name,
    description: meal.description,
    suggestedTime: meal.suggestedTime,
    calories: meal.calories,
    protein: meal.protein,
    fat: meal.fat,
    carbs: meal.carbs,
    isDemo: true as const,
  }));

  return {
    id: dietPlanId,
    trainerId: trainerId,
    clientId: DEMO_CLIENT_ID,
    name: "Plan redukcyjny - 2500 kcal",
    description: "Plan żywieniowy ukierunkowany na redukcję tkanki tłuszczowej przy zachowaniu masy mięśniowej.",
    targetCalories: 2500,
    targetProtein: 180,
    targetFat: 80,
    targetCarbs: 280,
    mealsPerDay: 5,
    mode: "macro_only",
    status: "active",
    recommendedProducts: "Kurczak, indyk, ryby, jajka, ryż, ziemniaki, warzywa zielone, owoce, orzechy, oliwa z oliwek",
    startDate: null,
    endDate: null,
    createdAt: now,
    meals: meals,
    isDemo: true as const,
  };
}

export function getDemoMedicalTests(): (MedicalTest & { isDemo: true })[] {
  const now = new Date();
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  const testsData = [
    { testName: "Leukocyty (WBC)", testType: "blood", resultValue: "6.2", unit: "tys./µl", referenceRange: "4.0 - 10.0" },
    { testName: "Erytrocyty (RBC)", testType: "blood", resultValue: "5.1", unit: "mln/µl", referenceRange: "4.5 - 5.5" },
    { testName: "Hemoglobina (HGB)", testType: "blood", resultValue: "15.2", unit: "g/dl", referenceRange: "14.0 - 18.0" },
    { testName: "Cholesterol całkowity", testType: "blood", resultValue: "185", unit: "mg/dl", referenceRange: "< 200" },
    { testName: "Cholesterol LDL", testType: "blood", resultValue: "110", unit: "mg/dl", referenceRange: "< 130" },
    { testName: "Cholesterol HDL", testType: "blood", resultValue: "55", unit: "mg/dl", referenceRange: "> 40" },
    { testName: "Triglicerydy", testType: "blood", resultValue: "95", unit: "mg/dl", referenceRange: "< 150" },
    { testName: "Glukoza na czczo", testType: "blood", resultValue: "92", unit: "mg/dl", referenceRange: "70 - 100" },
  ];

  return testsData.map((test, index) => ({
    id: `demo-test-${String(index + 1).padStart(3, "0")}`,
    clientId: DEMO_CLIENT_ID,
    testName: test.testName,
    testType: test.testType,
    resultValue: test.resultValue,
    unit: test.unit,
    referenceRange: test.referenceRange,
    testDate: twoMonthsAgo,
    orderingProvider: "Dr. Anna Kowalska",
    notes: null,
    attachments: null,
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo,
    isDemo: true as const,
  }));
}

export function getDemoPayments(trainerId: string): (ClientPayment & { isDemo: true })[] {
  const now = new Date();

  const paymentsData = [
    {
      amount: 20000,
      notes: "Pakiet trenerski - opłacono",
      daysAgo: 60,
      isPaid: true,
    },
    {
      amount: 15000,
      notes: "Dieta miesięczna - opłacono",
      daysAgo: 30,
      isPaid: true,
    },
    {
      amount: 10000,
      notes: "Konsultacja online - opłacono",
      daysAgo: 7,
      isPaid: true,
    },
  ];

  return paymentsData.map((payment, index) => {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() - payment.daysAgo);

    return {
      id: `demo-payment-${String(index + 1).padStart(3, "0")}`,
      clientId: DEMO_CLIENT_ID,
      trainerId: trainerId,
      amount: payment.amount,
      dueDate: dueDate,
      isPaid: payment.isPaid,
      paidAt: payment.isPaid ? dueDate : null,
      notes: payment.notes,
      isRecurring: false,
      recurringAmount: null,
      recurringDayOfMonth: null,
      lastRecurringCreatedAt: null,
      createdAt: dueDate,
      isDemo: true as const,
    };
  });
}
