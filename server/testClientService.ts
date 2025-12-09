import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users,
  clientRelationships,
  trainingPlans,
  workouts,
  exercises,
  planAssignments,
  weeklyReports,
  dietPlans,
  dietMeals,
  medicalTests,
  clientPayments,
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

/**
 * Creates a test client ("ghost user") for a newly registered trainer.
 * This provides trainers with sample data to explore all platform features.
 * 
 * The test client:
 * - Cannot log in (random password)
 * - Is marked with isTestUser=true
 * - Is linked to trainer via testUserTrainerId
 * - Has sample training plans, diet plans, weekly reports, medical tests, and payments
 * - Should be excluded from client limits and revenue stats
 */
export async function createTestClientWithSampleData(trainerId: string): Promise<{ success: boolean; testClientId?: string; error?: string }> {
  try {
    // Generate unique email for test client
    const testEmail = `test-${trainerId.slice(0, 8)}@paneltrenera.test`;
    
    // Check if test client already exists for this trainer
    const existingTestClient = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.testUserTrainerId, trainerId),
    });
    
    if (existingTestClient) {
      return { success: true, testClientId: existingTestClient.id };
    }
    
    // Generate random password (test client won't log in)
    const randomPassword = randomUUID();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    
    // Create test client user
    const testClientId = randomUUID();
    const result = await db.insert(users).values({
      id: testClientId,
      email: testEmail,
      password: hashedPassword,
      firstName: "Jan",
      lastName: "Testowy",
      role: "client",
      isTestUser: true,
      testUserTrainerId: trainerId,
      emailVerified: true,
    }).returning();
    const testClient = Array.isArray(result) ? result[0] : null;
    if (!testClient) {
      throw new Error("Failed to create test client");
    }
    
    // Create client relationship
    await db.insert(clientRelationships).values({
      id: randomUUID(),
      trainerId: trainerId,
      clientId: testClientId,
      status: "active",
    });
    
    // Create training plans with workouts and exercises
    await createSampleTrainingPlans(trainerId, testClientId);
    
    // Create weekly reports
    await createSampleWeeklyReports(testClientId);
    
    // Create diet plan with meals
    await createSampleDietPlan(trainerId, testClientId);
    
    // Create medical tests
    await createSampleMedicalTests(testClientId);
    
    // Create payments
    await createSamplePayments(trainerId, testClientId);
    
    return { success: true, testClientId };
  } catch (error) {
    console.error("Error creating test client:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function createSampleTrainingPlans(trainerId: string, clientId: string): Promise<void> {
  const plansData = [
    {
      name: "Push Day - Klatka, Barki, Triceps",
      description: "Trening mięśni pchających. Skupienie na klatce piersiowej, barkach i tricepsach.",
      exercises: [
        { name: "Wyciskanie sztangi na ławce płaskiej", sets: 4, reps: 8, load: "60kg", restTime: 120, description: "Klasyczne ćwiczenie na klatkę piersiową" },
        { name: "Wyciskanie hantli na ławce skośnej", sets: 3, reps: 10, load: "22kg", restTime: 90, description: "Skupienie na górnej części klatki" },
        { name: "Rozpiętki na maszynie", sets: 3, reps: 12, load: "15kg", restTime: 60, description: "Izolacja klatki piersiowej" },
        { name: "Wyciskanie żołnierskie", sets: 4, reps: 8, load: "40kg", restTime: 120, description: "Główne ćwiczenie na barki" },
        { name: "Francuskie wyciskanie", sets: 3, reps: 12, load: "25kg", restTime: 60, description: "Izolacja tricepsów" },
      ],
    },
    {
      name: "Pull Day - Plecy, Biceps",
      description: "Trening mięśni ciągnących. Skupienie na plecach i bicepsach.",
      exercises: [
        { name: "Podciąganie na drążku", sets: 4, reps: 8, load: "bodyweight", restTime: 120, description: "Fundamentalne ćwiczenie na plecy" },
        { name: "Wiosłowanie sztangą", sets: 4, reps: 8, load: "60kg", restTime: 90, description: "Budowanie grubości pleców" },
        { name: "Ściąganie drążka wyciągu górnego", sets: 3, reps: 10, load: "50kg", restTime: 60, description: "Rozbudowa szerokości pleców" },
        { name: "Wiosłowanie hantlem jednorącz", sets: 3, reps: 10, load: "30kg", restTime: 60, description: "Praca jednostronna" },
        { name: "Uginanie ramion ze sztangą", sets: 3, reps: 12, load: "25kg", restTime: 60, description: "Izolacja bicepsów" },
      ],
    },
    {
      name: "Leg Day - Nogi",
      description: "Kompletny trening nóg. Ćwiczenia na czworogłowe, dwugłowe i łydki.",
      exercises: [
        { name: "Przysiady ze sztangą", sets: 4, reps: 8, load: "80kg", restTime: 180, description: "Król ćwiczeń na nogi" },
        { name: "Wykroki z hantlami", sets: 3, reps: 10, load: "20kg", restTime: 90, description: "Praca na każdą nogę osobno" },
        { name: "Prostowanie nóg na maszynie", sets: 3, reps: 12, load: "40kg", restTime: 60, description: "Izolacja czworogłowych" },
        { name: "Uginanie nóg na maszynie", sets: 3, reps: 12, load: "35kg", restTime: 60, description: "Izolacja dwugłowych" },
        { name: "Wspięcia na palce", sets: 4, reps: 15, load: "60kg", restTime: 45, description: "Trening łydek" },
      ],
    },
  ];
  
  for (const planData of plansData) {
    const planId = randomUUID();
    
    // Create training plan
    await db.insert(trainingPlans).values({
      id: planId,
      name: planData.name,
      description: planData.description,
      trainerId: trainerId,
    });
    
    // Create workout
    const workoutId = randomUUID();
    await db.insert(workouts).values({
      id: workoutId,
      planId: planId,
      name: planData.name,
      description: planData.description,
      orderIndex: 0,
    });
    
    // Create exercises
    for (let i = 0; i < planData.exercises.length; i++) {
      const ex = planData.exercises[i];
      await db.insert(exercises).values({
        id: randomUUID(),
        workoutId: workoutId,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        load: ex.load,
        restTime: ex.restTime,
        description: ex.description,
        orderIndex: i,
      });
    }
    
    // Assign plan to test client
    await db.insert(planAssignments).values({
      id: randomUUID(),
      planId: planId,
      clientId: clientId,
    });
  }
}

async function createSampleWeeklyReports(clientId: string): Promise<void> {
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
  
  for (const report of reportsData) {
    const reportDate = new Date(now);
    reportDate.setDate(reportDate.getDate() - (report.weeksAgo * 7));
    
    await db.insert(weeklyReports).values({
      id: randomUUID(),
      clientId: clientId,
      reportDate: reportDate,
      weight: report.weight,
      chest: report.chest,
      waist: report.waist,
      hips: report.hips,
      arm: report.arm,
      leg: report.leg,
      mood: report.mood,
      cardio: report.cardio,
      supplements: report.supplements,
      viewedByTrainer: false,
    });
  }
}

async function createSampleDietPlan(trainerId: string, clientId: string): Promise<void> {
  const dietPlanId = randomUUID();
  
  // Create diet plan
  await db.insert(dietPlans).values({
    id: dietPlanId,
    trainerId: trainerId,
    clientId: clientId,
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
  });
  
  // Create meals
  const mealsData = [
    { orderIndex: 1, name: "Śniadanie", description: "Owsianka z bananami i masłem orzechowym + 3 jajka", suggestedTime: "07:00", calories: 550, protein: 30, fat: 22, carbs: 60 },
    { orderIndex: 2, name: "Drugie śniadanie", description: "Shake proteinowy z owocami + garść orzechów", suggestedTime: "10:00", calories: 400, protein: 35, fat: 15, carbs: 35 },
    { orderIndex: 3, name: "Obiad", description: "Pierś z kurczaka z ryżem i warzywami na parze", suggestedTime: "13:00", calories: 650, protein: 50, fat: 15, carbs: 75 },
    { orderIndex: 4, name: "Podwieczorek", description: "Serek wiejski z pomidorami i pieczywem pełnoziarnistym", suggestedTime: "16:00", calories: 350, protein: 25, fat: 10, carbs: 40 },
    { orderIndex: 5, name: "Kolacja", description: "Łosoś pieczony z ziemniakami i surówką", suggestedTime: "19:00", calories: 550, protein: 40, fat: 18, carbs: 70 },
  ];
  
  for (const meal of mealsData) {
    await db.insert(dietMeals).values({
      id: randomUUID(),
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
    });
  }
}

async function createSampleMedicalTests(clientId: string): Promise<void> {
  const now = new Date();
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  
  const testsData = [
    // Morfologia
    { testName: "Leukocyty (WBC)", testType: "blood", resultValue: "6.2", unit: "tys./µl", referenceRange: "4.0 - 10.0", testDate: twoMonthsAgo },
    { testName: "Erytrocyty (RBC)", testType: "blood", resultValue: "5.1", unit: "mln/µl", referenceRange: "4.5 - 5.5", testDate: twoMonthsAgo },
    { testName: "Hemoglobina (HGB)", testType: "blood", resultValue: "15.2", unit: "g/dl", referenceRange: "14.0 - 18.0", testDate: twoMonthsAgo },
    // Lipidogram
    { testName: "Cholesterol całkowity", testType: "blood", resultValue: "185", unit: "mg/dl", referenceRange: "< 200", testDate: twoMonthsAgo },
    { testName: "Cholesterol LDL", testType: "blood", resultValue: "110", unit: "mg/dl", referenceRange: "< 130", testDate: twoMonthsAgo },
    { testName: "Cholesterol HDL", testType: "blood", resultValue: "55", unit: "mg/dl", referenceRange: "> 40", testDate: twoMonthsAgo },
    { testName: "Triglicerydy", testType: "blood", resultValue: "95", unit: "mg/dl", referenceRange: "< 150", testDate: twoMonthsAgo },
    // Glukoza
    { testName: "Glukoza na czczo", testType: "blood", resultValue: "92", unit: "mg/dl", referenceRange: "70 - 100", testDate: twoMonthsAgo },
  ];
  
  for (const test of testsData) {
    await db.insert(medicalTests).values({
      id: randomUUID(),
      clientId: clientId,
      testName: test.testName,
      testType: test.testType,
      resultValue: test.resultValue,
      unit: test.unit,
      referenceRange: test.referenceRange,
      testDate: test.testDate,
      orderingProvider: "Dr. Anna Kowalska",
      notes: null,
      attachments: null,
    });
  }
}

async function createSamplePayments(trainerId: string, clientId: string): Promise<void> {
  const now = new Date();
  
  const paymentsData = [
    {
      amount: 20000, // 200 PLN
      notes: "Pakiet trenerski - opłacono",
      daysAgo: 60,
      isPaid: true,
    },
    {
      amount: 15000, // 150 PLN
      notes: "Dieta miesięczna - opłacono",
      daysAgo: 30,
      isPaid: true,
    },
    {
      amount: 10000, // 100 PLN
      notes: "Konsultacja online - opłacono",
      daysAgo: 7,
      isPaid: true,
    },
  ];
  
  for (const payment of paymentsData) {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() - payment.daysAgo);
    
    const paidAt = payment.isPaid ? dueDate : null;
    
    await db.insert(clientPayments).values({
      id: randomUUID(),
      clientId: clientId,
      trainerId: trainerId,
      amount: payment.amount,
      dueDate: dueDate,
      isPaid: payment.isPaid,
      paidAt: paidAt,
      notes: payment.notes,
      isRecurring: false,
    });
  }
}

/**
 * Deletes the test client and all associated data for a trainer.
 * This is called when a trainer explicitly removes their test client.
 * 
 * Note: We need to explicitly delete training plans assigned to the test client
 * because plans belong to trainerId (not clientId), so they won't cascade-delete.
 */
export async function deleteTestClient(trainerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Find test client for this trainer
    const testClient = await db.query.users.findFirst({
      where: (u, { and, eq }) => and(
        eq(u.testUserTrainerId, trainerId),
        eq(u.isTestUser, true)
      ),
    });
    
    if (!testClient) {
      return { success: false, error: "Nie znaleziono podopiecznego testowego" };
    }
    
    // Find plan assignments for the test client to get the plan IDs
    const assignments = await db.query.planAssignments.findMany({
      where: (pa, { eq }) => eq(pa.clientId, testClient.id),
    });
    
    // Delete the training plans that were created ONLY for the test client
    // Safety: Don't delete plans that are also assigned to real clients
    for (const assignment of assignments) {
      // Only delete plans owned by this trainer (safety check)
      const plan = await db.query.trainingPlans.findFirst({
        where: (p, { and, eq }) => and(
          eq(p.id, assignment.planId),
          eq(p.trainerId, trainerId)
        ),
      });
      
      if (plan) {
        // Check if this plan is assigned to any other clients (real clients)
        const allAssignmentsForPlan = await db.query.planAssignments.findMany({
          where: (pa, { eq }) => eq(pa.planId, plan.id),
        });
        
        const hasRealClientAssignment = allAssignmentsForPlan.some(
          a => a.clientId !== testClient.id
        );
        
        // Only delete if the plan is ONLY assigned to the test client
        if (!hasRealClientAssignment) {
          await db.delete(trainingPlans).where(eq(trainingPlans.id, plan.id));
        }
      }
    }
    
    // Delete the test client (remaining cascading will clean up related data)
    await db.delete(users).where(
      eq(users.id, testClient.id)
    );
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting test client:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Check if a user is a test client
 */
export function isTestClient(user: { isTestUser?: boolean | null }): boolean {
  return user.isTestUser === true;
}
