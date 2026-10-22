import type { Express } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { dietMeals, exercises, exerciseSwapRequests, mealSwapRequests, users, workouts } from "@workspace/db";
import { sendPushToUserAndRecord } from "../services/push";
import { isDecision, validateNote, validateReason, validateReplacement } from "../lib/swapRequest";

const fullName = (user: { firstName?: string | null; lastName?: string | null } | undefined | null, fallback: string) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") || fallback;

/** Substitute-exercise requests: the client asks, the trainer approves with a replacement (for that client only) or rejects. */
export function registerSwapRoutes(app: Express) {
  // The client asks for a substitute for an exercise of their current plan
  app.post("/api/client/exercise-swaps", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getUser(req.session.userId!);
      if (client?.role !== "client") return res.status(403).json({ message: "Tylko podopieczni" });
      const reason = validateReason(req.body?.reason);
      if (!reason) return res.status(400).json({ message: "Napisz krótko, dlaczego potrzebujesz zamiennika (3–300 znaków)" });

      const assignment = await storage.getClientAssignment(client.id);
      const exercise = typeof req.body?.exerciseId === "string" ? await storage.getExerciseById(req.body.exerciseId) : undefined;
      const workout = exercise ? await storage.getWorkoutById(exercise.workoutId) : undefined;
      // only an exercise of the plan assigned to this client; anything else looks the same as a missing one
      if (!assignment || !exercise || !workout || workout.planId !== assignment.planId) {
        return res.status(404).json({ message: "Nie znaleziono ćwiczenia w Twoim planie" });
      }
      const plan = await storage.getTrainingPlan(assignment.planId);
      if (!plan) return res.status(404).json({ message: "Nie znaleziono ćwiczenia w Twoim planie" });

      const [pending] = await db
        .select({ id: exerciseSwapRequests.id })
        .from(exerciseSwapRequests)
        .where(and(eq(exerciseSwapRequests.clientId, client.id), eq(exerciseSwapRequests.exerciseId, exercise.id), eq(exerciseSwapRequests.status, "pending")))
        .limit(1);
      if (pending) return res.status(409).json({ message: "Czekasz już na odpowiedź trenera w sprawie tego ćwiczenia" });

      const [created] = await db
        .insert(exerciseSwapRequests)
        .values({ clientId: client.id, trainerId: plan.trainerId, exerciseId: exercise.id, reason })
        .returning();
      res.status(201).json(created);

      void sendPushToUserAndRecord(
        plan.trainerId,
        "Prośba o zamiennik ćwiczenia",
        `${fullName(client, "Podopieczny")}: ${exercise.name} — ${reason}`,
        { type: "swap_request", requestId: created.id },
        "swap_request",
      ).catch((err) => console.error("Failed to push swap request:", err));
    } catch (error) {
      console.error("Error creating swap request:", error);
      res.status(500).json({ message: "Nie udało się wysłać prośby" });
    }
  });

  // The client's own requests, newest first (the app shows approved replacements next to the exercise)
  app.get("/api/client/exercise-swaps", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getUser(req.session.userId!);
      if (client?.role !== "client") return res.status(403).json({ message: "Tylko podopieczni" });
      const rows = await db
        .select({
          id: exerciseSwapRequests.id,
          exerciseId: exerciseSwapRequests.exerciseId,
          exercise: exercises.name,
          reason: exerciseSwapRequests.reason,
          status: exerciseSwapRequests.status,
          replacementName: exerciseSwapRequests.replacementName,
          trainerNote: exerciseSwapRequests.trainerNote,
          createdAt: exerciseSwapRequests.createdAt,
          decidedAt: exerciseSwapRequests.decidedAt,
        })
        .from(exerciseSwapRequests)
        .innerJoin(exercises, eq(exercises.id, exerciseSwapRequests.exerciseId))
        .where(eq(exerciseSwapRequests.clientId, client.id))
        .orderBy(desc(exerciseSwapRequests.createdAt))
        .limit(100);
      res.json(rows);
    } catch (error) {
      console.error("Error listing swap requests:", error);
      res.status(500).json({ message: "Nie udało się pobrać próśb" });
    }
  });

  // The trainer's inbox: requests of their own clients (pending by default)
  app.get("/api/trainer/exercise-swaps", isAuthenticated, async (req, res) => {
    try {
      const trainer = await storage.getUser(req.session.userId!);
      if (trainer?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      const status = req.query.status === "all" ? null : "pending";
      const rows = await db
        .select({
          id: exerciseSwapRequests.id,
          clientId: exerciseSwapRequests.clientId,
          clientFirstName: users.firstName,
          clientLastName: users.lastName,
          exerciseId: exerciseSwapRequests.exerciseId,
          exercise: exercises.name,
          workout: workouts.name,
          reason: exerciseSwapRequests.reason,
          status: exerciseSwapRequests.status,
          replacementName: exerciseSwapRequests.replacementName,
          createdAt: exerciseSwapRequests.createdAt,
        })
        .from(exerciseSwapRequests)
        .innerJoin(users, eq(users.id, exerciseSwapRequests.clientId))
        .innerJoin(exercises, eq(exercises.id, exerciseSwapRequests.exerciseId))
        .innerJoin(workouts, eq(workouts.id, exercises.workoutId))
        .where(status ? and(eq(exerciseSwapRequests.trainerId, trainer.id), eq(exerciseSwapRequests.status, status)) : eq(exerciseSwapRequests.trainerId, trainer.id))
        .orderBy(desc(exerciseSwapRequests.createdAt))
        .limit(100);
      res.json(rows);
    } catch (error) {
      console.error("Error listing swap requests for the trainer:", error);
      res.status(500).json({ message: "Nie udało się pobrać próśb" });
    }
  });

  // The trainer's answer: approve with a replacement (valid for this client only) or reject
  app.put("/api/trainer/exercise-swaps/:id", isAuthenticated, async (req, res) => {
    try {
      const trainer = await storage.getUser(req.session.userId!);
      if (trainer?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      const [request] = await db
        .select()
        .from(exerciseSwapRequests)
        .where(and(eq(exerciseSwapRequests.id, String(req.params.id)), eq(exerciseSwapRequests.trainerId, trainer.id)))
        .limit(1);
      if (!request) return res.status(404).json({ message: "Nie znaleziono prośby" });
      if (request.status !== "pending") return res.status(409).json({ message: "Na tę prośbę już odpowiedziano" });
      if (!isDecision(req.body?.decision)) return res.status(400).json({ message: "Wybierz: zatwierdź albo odrzuć" });
      const note = validateNote(req.body?.note);
      if (note === undefined) return res.status(400).json({ message: "Uwaga może mieć najwyżej 300 znaków" });

      let replacement: string | null = null;
      if (req.body.decision === "approve") {
        replacement = validateReplacement(req.body?.replacementName);
        if (!replacement) return res.status(400).json({ message: "Podaj nazwę ćwiczenia zastępczego" });
      }
      const [updated] = await db
        .update(exerciseSwapRequests)
        .set({ status: req.body.decision === "approve" ? "approved" : "rejected", replacementName: replacement, trainerNote: note, decidedAt: new Date() })
        .where(and(eq(exerciseSwapRequests.id, request.id), eq(exerciseSwapRequests.status, "pending")))
        .returning();
      if (!updated) return res.status(409).json({ message: "Na tę prośbę już odpowiedziano" });
      res.json(updated);

      const [exercise] = await db.select({ name: exercises.name }).from(exercises).where(inArray(exercises.id, [request.exerciseId]));
      void sendPushToUserAndRecord(
        request.clientId,
        req.body.decision === "approve" ? "Zamiennik zatwierdzony" : "Prośba o zamiennik odrzucona",
        req.body.decision === "approve"
          ? `${exercise?.name ?? "Ćwiczenie"}: zrób zamiast tego ${replacement}.${note ? ` ${note}` : ""}`
          : `${exercise?.name ?? "Ćwiczenie"}: zostaje bez zmian.${note ? ` ${note}` : ""}`,
        { type: "swap_answer", requestId: request.id },
        "swap_answer",
      ).catch((err) => console.error("Failed to push swap answer:", err));
    } catch (error) {
      console.error("Error answering swap request:", error);
      res.status(500).json({ message: "Nie udało się zapisać odpowiedzi" });
    }
  });

  // ── The same for meals of the client's diet ─────────────────────────────────────────────────────────────────

  app.post("/api/client/meal-swaps", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getUser(req.session.userId!);
      if (client?.role !== "client") return res.status(403).json({ message: "Tylko podopieczni" });
      const reason = validateReason(req.body?.reason);
      if (!reason) return res.status(400).json({ message: "Napisz krótko, dlaczego potrzebujesz zamiennika (3–300 znaków)" });

      const [meal] = typeof req.body?.mealId === "string" ? await db.select().from(dietMeals).where(eq(dietMeals.id, req.body.mealId)).limit(1) : [];
      const plan = meal ? await storage.getDietPlanById(meal.planId) : null;
      // only a meal of a diet that belongs to this client
      if (!meal || !plan || plan.clientId !== client.id) return res.status(404).json({ message: "Nie znaleziono posiłku w Twojej diecie" });

      const [pending] = await db
        .select({ id: mealSwapRequests.id })
        .from(mealSwapRequests)
        .where(and(eq(mealSwapRequests.clientId, client.id), eq(mealSwapRequests.mealId, meal.id), eq(mealSwapRequests.status, "pending")))
        .limit(1);
      if (pending) return res.status(409).json({ message: "Czekasz już na odpowiedź trenera w sprawie tego posiłku" });

      const [created] = await db.insert(mealSwapRequests).values({ clientId: client.id, trainerId: plan.trainerId, mealId: meal.id, reason }).returning();
      res.status(201).json(created);
      void sendPushToUserAndRecord(
        plan.trainerId,
        "Prośba o zamiennik posiłku",
        `${fullName(client, "Podopieczny")}: ${meal.name} — ${reason}`,
        { type: "swap_request", requestId: created.id },
        "swap_request",
      ).catch((err) => console.error("Failed to push meal swap request:", err));
    } catch (error) {
      console.error("Error creating meal swap request:", error);
      res.status(500).json({ message: "Nie udało się wysłać prośby" });
    }
  });

  app.get("/api/client/meal-swaps", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getUser(req.session.userId!);
      if (client?.role !== "client") return res.status(403).json({ message: "Tylko podopieczni" });
      res.json(
        await db
          .select({
            id: mealSwapRequests.id,
            mealId: mealSwapRequests.mealId,
            meal: dietMeals.name,
            reason: mealSwapRequests.reason,
            status: mealSwapRequests.status,
            replacementName: mealSwapRequests.replacementName,
            trainerNote: mealSwapRequests.trainerNote,
            createdAt: mealSwapRequests.createdAt,
          })
          .from(mealSwapRequests)
          .innerJoin(dietMeals, eq(dietMeals.id, mealSwapRequests.mealId))
          .where(eq(mealSwapRequests.clientId, client.id))
          .orderBy(desc(mealSwapRequests.createdAt))
          .limit(100),
      );
    } catch (error) {
      console.error("Error listing meal swap requests:", error);
      res.status(500).json({ message: "Nie udało się pobrać próśb" });
    }
  });

  app.get("/api/trainer/meal-swaps", isAuthenticated, async (req, res) => {
    try {
      const trainer = await storage.getUser(req.session.userId!);
      if (trainer?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      const onlyPending = req.query.status !== "all";
      res.json(
        await db
          .select({
            id: mealSwapRequests.id,
            clientId: mealSwapRequests.clientId,
            clientFirstName: users.firstName,
            clientLastName: users.lastName,
            mealId: mealSwapRequests.mealId,
            meal: dietMeals.name,
            reason: mealSwapRequests.reason,
            status: mealSwapRequests.status,
            replacementName: mealSwapRequests.replacementName,
            createdAt: mealSwapRequests.createdAt,
          })
          .from(mealSwapRequests)
          .innerJoin(users, eq(users.id, mealSwapRequests.clientId))
          .innerJoin(dietMeals, eq(dietMeals.id, mealSwapRequests.mealId))
          .where(onlyPending ? and(eq(mealSwapRequests.trainerId, trainer.id), eq(mealSwapRequests.status, "pending")) : eq(mealSwapRequests.trainerId, trainer.id))
          .orderBy(desc(mealSwapRequests.createdAt))
          .limit(100),
      );
    } catch (error) {
      console.error("Error listing meal swap requests for the trainer:", error);
      res.status(500).json({ message: "Nie udało się pobrać próśb" });
    }
  });

  app.put("/api/trainer/meal-swaps/:id", isAuthenticated, async (req, res) => {
    try {
      const trainer = await storage.getUser(req.session.userId!);
      if (trainer?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      const [request] = await db
        .select()
        .from(mealSwapRequests)
        .where(and(eq(mealSwapRequests.id, String(req.params.id)), eq(mealSwapRequests.trainerId, trainer.id)))
        .limit(1);
      if (!request) return res.status(404).json({ message: "Nie znaleziono prośby" });
      if (request.status !== "pending") return res.status(409).json({ message: "Na tę prośbę już odpowiedziano" });
      if (!isDecision(req.body?.decision)) return res.status(400).json({ message: "Wybierz: zatwierdź albo odrzuć" });
      const note = validateNote(req.body?.note);
      if (note === undefined) return res.status(400).json({ message: "Uwaga może mieć najwyżej 300 znaków" });
      let replacement: string | null = null;
      if (req.body.decision === "approve") {
        replacement = validateReplacement(req.body?.replacementName);
        if (!replacement) return res.status(400).json({ message: "Podaj posiłek zastępczy" });
      }
      const [updated] = await db
        .update(mealSwapRequests)
        .set({ status: req.body.decision === "approve" ? "approved" : "rejected", replacementName: replacement, trainerNote: note, decidedAt: new Date() })
        .where(and(eq(mealSwapRequests.id, request.id), eq(mealSwapRequests.status, "pending")))
        .returning();
      if (!updated) return res.status(409).json({ message: "Na tę prośbę już odpowiedziano" });
      res.json(updated);

      const [meal] = await db.select({ name: dietMeals.name }).from(dietMeals).where(eq(dietMeals.id, request.mealId));
      void sendPushToUserAndRecord(
        request.clientId,
        req.body.decision === "approve" ? "Zamiennik posiłku zatwierdzony" : "Prośba o zamiennik posiłku odrzucona",
        req.body.decision === "approve"
          ? `${meal?.name ?? "Posiłek"}: zjedz zamiast tego ${replacement}.${note ? ` ${note}` : ""}`
          : `${meal?.name ?? "Posiłek"}: zostaje bez zmian.${note ? ` ${note}` : ""}`,
        { type: "swap_answer", requestId: request.id },
        "swap_answer",
      ).catch((err) => console.error("Failed to push meal swap answer:", err));
    } catch (error) {
      console.error("Error answering meal swap request:", error);
      res.status(500).json({ message: "Nie udało się zapisać odpowiedzi" });
    }
  });
}
