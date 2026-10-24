import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import {
  insertDailyHabitLogSchema,
  insertDietMealSchema,
  insertDietPlanSchema,
  insertDietSupplementSchema,
  syncDietMealSchema,
} from "@workspace/db";
import { getDemoDietPlan, isDemoId } from "../demoDataService";

/** Diet plans and meals (trainer), the client's diet, meal logs and diet statistics. */
export function registerDietRoutes(app: Express) {
  // Diet Plans - Trainer endpoints
  app.post("/api/diets/plans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą tworzyć plany dietetyczne" });
      }

      const validationResult = insertDietPlanSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const plan = await storage.createDietPlan({
        ...validationResult.data,
        trainerId: userId,
        mealsPerDay: validationResult.data.mealsPerDay ?? 3,
      });
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating diet plan:", error);
      res.status(500).json({ message: "Nie udało się utworzyć planu dietetycznego" });
    }
  });

  app.get("/api/diets/plans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą przeglądać plany dietetyczne" });
      }

      const plans = await storage.getTrainerDietPlans(userId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching diet plans:", error);
      res.status(500).json({ message: "Nie udało się pobrać planów dietetycznych" });
    }
  });

  app.get("/api/diets/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params as Record<string, string>;
      
      const plan = await storage.getDietPlanById(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (user?.role === "trainer" && plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      if (user?.role === "client" && plan.clientId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      res.json(plan);
    } catch (error) {
      console.error("Error fetching diet plan:", error);
      res.status(500).json({ message: "Nie udało się pobrać planu dietetycznego" });
    }
  });

  app.put("/api/diets/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą aktualizować plany dietetyczne" });
      }

      const plan = await storage.getDietPlanById(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const validationResult = insertDietPlanSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const updatedPlan = await storage.updateDietPlan(id, validationResult.data);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating diet plan:", error);
      res.status(500).json({ message: "Nie udało się zaktualizować planu dietetycznego" });
    }
  });

  app.delete("/api/diets/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać plany dietetyczne" });
      }

      const plan = await storage.getDietPlanById(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      await storage.deleteDietPlan(id);
      res.json({ message: "Plan dietetyczny został usunięty" });
    } catch (error) {
      console.error("Error deleting diet plan:", error);
      res.status(500).json({ message: "Nie udało się usunąć planu dietetycznego" });
    }
  });

  app.post("/api/diets/plans/:id/copy", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params as Record<string, string>;

      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą kopiować plany dietetyczne" });
      }

      const plan = await storage.getDietPlanById(id);
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }
      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const copiedPlan = await storage.copyDietPlan(id, userId);
      res.status(201).json(copiedPlan);
    } catch (error) {
      console.error("Error copying diet plan:", error);
      res.status(500).json({ message: "Nie udało się skopiować planu dietetycznego" });
    }
  });

  // Diet Meals - Trainer endpoints
  app.post("/api/diets/plans/:planId/meals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą dodawać posiłki" });
      }

      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const validationResult = insertDietMealSchema.safeParse({
        ...req.body,
        planId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const meal = await storage.createDietMeal(validationResult.data);
      res.status(201).json(meal);
    } catch (error) {
      console.error("Error creating diet meal:", error);
      res.status(500).json({ message: "Nie udało się utworzyć posiłku" });
    }
  });

  // Saves the whole week of meals at once, keeping the rows that stay (and with them the client's eaten-meal history)
  app.put("/api/diets/plans/:planId/meals/sync", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const planId = String(req.params.planId);
      if (user?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy mogą zmieniać posiłki" });
      const plan = await storage.getDietPlanById(planId);
      if (!plan) return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      if (plan.trainerId !== userId) return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });

      const rows = Array.isArray(req.body?.meals) ? req.body.meals : null;
      if (!rows || rows.length > 100) return res.status(400).json({ message: "Brak listy posiłków" });
      const meals: Parameters<typeof storage.syncDietMeals>[1] = [];
      for (const row of rows) {
        const parsed = syncDietMealSchema.safeParse({ ...row, planId });
        if (!parsed.success) {
          return res.status(400).json({ message: "Nieprawidłowe dane wejściowe", errors: parsed.error.issues });
        }
        meals.push({ ...parsed.data, id: typeof parsed.data.id === "string" ? parsed.data.id : undefined });
      }
      res.json(await storage.syncDietMeals(planId, meals));
    } catch (error) {
      console.error("Error syncing diet meals:", error);
      res.status(500).json({ message: "Nie udało się zapisać posiłków" });
    }
  });

  app.get("/api/diets/plans/:planId/meals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params as Record<string, string>;
      
      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (user?.role === "trainer" && plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      if (user?.role === "client" && plan.clientId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const meals = await storage.getDietPlanMeals(planId);
      res.json(meals);
    } catch (error) {
      console.error("Error fetching diet meals:", error);
      res.status(500).json({ message: "Nie udało się pobrać posiłków" });
    }
  });

  // Get meals for a specific day of week
  app.get("/api/diets/plans/:planId/meals/day/:dayOfWeek", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId, dayOfWeek } = req.params as Record<string, string>;
      const dayNum = parseInt(dayOfWeek);
      
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 7) {
        return res.status(400).json({ message: "Dzień musi być liczbą od 1 do 7" });
      }
      
      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (user?.role === "trainer" && plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      if (user?.role === "client" && plan.clientId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const meals = await storage.getDietPlanMealsForDay(planId, dayNum);
      res.json(meals);
    } catch (error) {
      console.error("Error fetching diet meals for day:", error);
      res.status(500).json({ message: "Nie udało się pobrać posiłków" });
    }
  });

  app.put("/api/diets/meals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą aktualizować posiłki" });
      }

      const meal = await storage.getDietMealById(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Posiłek nie został znaleziony" });
      }

      const plan = await storage.getDietPlanById(meal.planId);
      
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego posiłku" });
      }

      const validationResult = insertDietMealSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const updatedMeal = await storage.updateDietMeal(id, validationResult.data);
      res.json(updatedMeal);
    } catch (error) {
      console.error("Error updating diet meal:", error);
      res.status(500).json({ message: "Nie udało się zaktualizować posiłku" });
    }
  });

  app.delete("/api/diets/meals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać posiłki" });
      }

      const meal = await storage.getDietMealById(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Posiłek nie został znaleziony" });
      }

      const plan = await storage.getDietPlanById(meal.planId);
      
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego posiłku" });
      }

      await storage.deleteDietMeal(id);
      res.json({ message: "Posiłek został usunięty" });
    } catch (error) {
      console.error("Error deleting diet meal:", error);
      res.status(500).json({ message: "Nie udało się usunąć posiłku" });
    }
  });

  app.delete("/api/diets/plans/:planId/meals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać posiłki" });
      }

      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      await storage.deleteDietMealsByPlanId(planId);
      res.json({ message: "Wszystkie posiłki zostały usunięte" });
    } catch (error) {
      console.error("Error deleting diet meals:", error);
      res.status(500).json({ message: "Nie udało się usunąć posiłków" });
    }
  });

  // Diet supplements endpoints
  app.get("/api/diet-plans/:planId/supplements", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params as Record<string, string>;
      
      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }
      
      // Allow both trainer and assigned client to view supplements
      if (user?.role === "trainer" && plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }
      
      if (user?.role === "client" && plan.clientId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const supplements = await storage.getDietSupplements(planId);
      res.json(supplements);
    } catch (error) {
      console.error("Error fetching diet supplements:", error);
      res.status(500).json({ message: "Nie udało się pobrać suplementów" });
    }
  });

  app.post("/api/diet-plans/:planId/supplements", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą dodawać suplementy" });
      }

      const plan = await storage.getDietPlanById(planId);
      
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const validationResult = insertDietSupplementSchema.safeParse({
        ...req.body,
        dietPlanId: planId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const supplement = await storage.createDietSupplement(validationResult.data);
      res.status(201).json(supplement);
    } catch (error) {
      console.error("Error creating diet supplement:", error);
      res.status(500).json({ message: "Nie udało się utworzyć suplementu" });
    }
  });

  app.patch("/api/diet-supplements/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą edytować suplementy" });
      }

      const supplement = await storage.getDietSupplementById(id);
      
      if (!supplement) {
        return res.status(404).json({ message: "Suplement nie został znaleziony" });
      }

      const plan = await storage.getDietPlanById(supplement.dietPlanId);
      
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego suplementu" });
      }

      const validationResult = insertDietSupplementSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const updatedSupplement = await storage.updateDietSupplement(id, validationResult.data);
      res.json(updatedSupplement);
    } catch (error) {
      console.error("Error updating diet supplement:", error);
      res.status(500).json({ message: "Nie udało się zaktualizować suplementu" });
    }
  });

  app.delete("/api/diet-supplements/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params as Record<string, string>;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać suplementy" });
      }

      const supplement = await storage.getDietSupplementById(id);
      
      if (!supplement) {
        return res.status(404).json({ message: "Suplement nie został znaleziony" });
      }

      const plan = await storage.getDietPlanById(supplement.dietPlanId);
      
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego suplementu" });
      }

      await storage.deleteDietSupplement(id);
      res.json({ message: "Suplement został usunięty" });
    } catch (error) {
      console.error("Error deleting diet supplement:", error);
      res.status(500).json({ message: "Nie udało się usunąć suplementu" });
    }
  });

  // Client diet endpoints
  app.get("/api/client/diet", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą przeglądać swoje plany dietetyczne" });
      }

      const plan = await storage.getClientActiveDietPlan(userId);
      
      if (!plan) {
        return res.status(404).json({ message: "Nie masz aktywnego planu dietetycznego" });
      }

      const meals = await storage.getDietPlanMeals(plan.id);
      res.json({ ...plan, meals });
    } catch (error) {
      console.error("Error fetching client diet:", error);
      res.status(500).json({ message: "Nie udało się pobrać planu dietetycznego" });
    }
  });

  app.post("/api/client/diet/log", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą logować nawyki" });
      }

      const { date, waterLiters, hitCalories, hitProtein, hitFat, hitCarbs, actualCalories, actualProtein, actualFat, actualCarbs, mealCheckmarks, planId } = req.body;

      if (!planId) {
        return res.status(400).json({ message: "planId jest wymagane" });
      }

      const validationResult = insertDailyHabitLogSchema.safeParse({
        clientId: userId,
        planId,
        date,
        waterLiters,
        hitCalories,
        hitProtein,
        hitFat,
        hitCarbs,
        actualCalories: actualCalories != null ? Number(actualCalories) : undefined,
        actualProtein: actualProtein != null ? Number(actualProtein) : undefined,
        actualFat: actualFat != null ? Number(actualFat) : undefined,
        actualCarbs: actualCarbs != null ? Number(actualCarbs) : undefined,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.issues 
        });
      }

      const habitLog = await storage.upsertDailyHabitLog({
        ...validationResult.data,
        clientId: userId,
        date: validationResult.data.date.toISOString().split('T')[0],
      });

      if (mealCheckmarks && Array.isArray(mealCheckmarks)) {
        await Promise.all(
          mealCheckmarks.map((checkmark: { mealId: string, completed: boolean, eatenCalories?: number | null, eatenProtein?: number | null, eatenFat?: number | null, eatenCarbs?: number | null }) =>
            storage.upsertMealCheckmark({
              habitLogId: habitLog.id,
              mealId: checkmark.mealId,
              completed: checkmark.completed,
              eatenCalories: checkmark.eatenCalories ?? null,
              eatenProtein: checkmark.eatenProtein ?? null,
              eatenFat: checkmark.eatenFat ?? null,
              eatenCarbs: checkmark.eatenCarbs ?? null,
            })
          )
        );
      }

      const checkmarks = await storage.getHabitLogCheckmarks(habitLog.id);
      res.json({ habitLog, checkmarks });
    } catch (error) {
      console.error("Error logging daily habits:", error);
      res.status(500).json({ message: "Nie udało się zapisać dziennika nawyków" });
    }
  });

  app.get("/api/client/diet/today", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const plan = await storage.getClientActiveDietPlan(userId);
      if (!plan) return res.json(null);
      const today = new Date();
      const log = await storage.getDailyHabitLog(userId, plan.id, today);
      if (!log) return res.json(null);
      const checkmarks = await storage.getHabitLogCheckmarks(log.id);
      res.json({ ...log, checkmarks });
    } catch (error) {
      req.log.error(error, "Error fetching today diet log");
      res.status(500).json({ message: "Nie udało się pobrać dziennika" });
    }
  });

  app.get("/api/client/diet/logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą przeglądać swoje logi" });
      }

      const { startDate, endDate, planId } = req.query;

      if (!planId || !startDate || !endDate) {
        return res.status(400).json({ message: "planId, startDate i endDate są wymagane" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const logs = await storage.getClientHabitLogs(userId, planId as string, start, end);

      const logsWithCheckmarks = await Promise.all(
        logs.map(async (log) => {
          const checkmarks = await storage.getHabitLogCheckmarks(log.id);
          return { ...log, checkmarks };
        })
      );

      res.json(logsWithCheckmarks);
    } catch (error) {
      console.error("Error fetching client habit logs:", error);
      res.status(500).json({ message: "Nie udało się pobrać logów nawyków" });
    }
  });

  // Trainer - get client's active diet plan
  app.get("/api/trainer/clients/:clientId/active-diet", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą przeglądać plany podopiecznych" });
      }

      const { clientId } = req.params as Record<string, string>;
      
      // Return demo diet plan for demo client
      if (isDemoId(clientId)) {
        const demoDietPlan = getDemoDietPlan(userId);
        return res.json(demoDietPlan);
      }
      
      const activePlan = await storage.getClientActiveDietPlan(clientId);
      
      if (activePlan && activePlan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }
      if (!activePlan && !(await storage.hasActiveClientRelationship(userId, clientId))) {
        return res.status(403).json({ message: "To nie jest Twój podopieczny" });
      }

      res.json(activePlan);
    } catch (error) {
      console.error("Error fetching client active diet plan:", error);
      res.status(500).json({ message: "Nie udało się pobrać aktywnego planu diety" });
    }
  });

  // Trainer stats endpoint
  app.get("/api/trainer/clients/:clientId/diet-stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą przeglądać statystyki podopiecznych" });
      }

      const { clientId } = req.params as Record<string, string>;
      const { planId, days = '7' } = req.query;

      if (!planId) {
        return res.status(400).json({ message: "planId jest wymagane" });
      }

      const plan = await storage.getDietPlanById(planId as string);
      
      if (!plan || plan.trainerId !== userId || plan.clientId !== clientId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tych statystyk" });
      }

      const daysCount = parseInt(days as string);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);

      const logs = await storage.getClientHabitLogs(clientId, planId as string, startDate, endDate);
      const meals = await storage.getDietPlanMeals(planId as string);

      let totalCompletedMeals = 0;
      let totalPossibleMeals = 0;
      let totalWater = 0;
      let streak = 0;
      let currentStreak = 0;

      const logsWithCheckmarks = await Promise.all(
        logs.map(async (log) => {
          const checkmarks = await storage.getHabitLogCheckmarks(log.id);
          return { log, checkmarks };
        })
      );

      const dailyStats = [];

      for (let i = 0; i < logsWithCheckmarks.length; i++) {
        const { log, checkmarks } = logsWithCheckmarks[i];
        
        const waterLiters = parseFloat(log.waterLiters || '0');
        totalWater += waterLiters;
        
        const completedMealsCount = checkmarks.filter(c => c.completed).length;
        totalPossibleMeals += meals.length;
        totalCompletedMeals += completedMealsCount;

        const completedMealsPercent = meals.length > 0 
          ? (completedMealsCount / meals.length) * 100 
          : 0;

        dailyStats.push({
          date: log.date,
          completedMealsPercent: Math.round(completedMealsPercent * 10) / 10,
          waterLiters: Math.round(waterLiters * 10) / 10,
        });

        if (checkmarks.length > 0) {
          currentStreak++;
          if (currentStreak > streak) {
            streak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }
      }

      const avgCompletedMealsPercent = totalPossibleMeals > 0 
        ? (totalCompletedMeals / totalPossibleMeals) * 100 
        : 0;
      
      const avgWaterLiters = logs.length > 0 
        ? totalWater / logs.length 
        : 0;

      res.json({
        avgCompletedMealsPercent: Math.round(avgCompletedMealsPercent * 10) / 10,
        streakDays: streak,
        avgWaterLiters: Math.round(avgWaterLiters * 10) / 10,
        totalDaysLogged: logs.length,
        dailyStats: dailyStats.sort((a, b) => a.date.localeCompare(b.date)),
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
      });
    } catch (error) {
      console.error("Error fetching client diet stats:", error);
      res.status(500).json({ message: "Nie udało się pobrać statystyk" });
    }
  });
}
