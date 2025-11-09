import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword, comparePassword } from "./auth";
import {
  insertTrainingPlanSchema,
  insertWorkoutSchema,
  insertExerciseSchema,
  insertPlanAssignmentSchema,
  insertExerciseLibrarySchema,
  insertUserProfileSchema,
  updateUserProfileSchema,
  insertClientProgressSchema,
  updateClientProgressSchema,
  insertExerciseLogSchema,
  insertWeeklyReportSchema,
  updateUserRoleSchema,
  registerSchema,
  loginSchema,
  insertPlanWithWorkoutsSchema,
  insertPlanInvitationSchema,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const uploadsDir = path.join(process.cwd(), "attached_assets", "uploads");

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
  const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const allowedTypes = [...allowedVideoTypes, ...allowedImageTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Nieprawidłowy typ pliku. Dozwolone są tylko wideo (mp4, mov, avi, webm) i obrazy (jpg, jpeg, png, webp)"));
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // File upload endpoint
  app.post("/api/upload", isAuthenticated, (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ 
            message: "Plik jest za duży. Maksymalny rozmiar to 50MB dla wideo i 5MB dla obrazów" 
          });
        }
        return res.status(400).json({ message: `Błąd uploadu: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nie przesłano pliku" });
      }

      const isVideo = req.file.mimetype.startsWith("video/");
      const isImage = req.file.mimetype.startsWith("image/");
      const maxImageSize = 5 * 1024 * 1024;

      if (isImage && req.file.size > maxImageSize) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: "Obraz jest za duży. Maksymalny rozmiar to 5MB" 
        });
      }

      const fileUrl = `/attached_assets/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    });
  });

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const { email, password, firstName, lastName, role } = validationResult.data;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Użytkownik z tym adresem email już istnieje" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      });

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Nie udało się utworzyć sesji" });
        }
        
        req.session.userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Nie udało się zapisać sesji" });
          }
          
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Nie udało się zarejestrować użytkownika" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const { email, password } = validationResult.data;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Nieprawidłowy email lub hasło" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Nieprawidłowy email lub hasło" });
      }

      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Nie udało się utworzyć sesji" });
        }
        
        req.session.userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Nie udało się zapisać sesji" });
          }
          
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Nie udało się zalogować" });
    }
  });

  app.post("/api/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Nie udało się wylogować" });
      }
      res.json({ message: "Wylogowano pomyślnie" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/update-role", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { role } = updateUserRoleSchema.parse(req.body);
      const user = await storage.updateUserRole(userId, role);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Training plan routes
  app.get("/api/plans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access plans" });
      }

      const plans = await storage.getTrainerPlans(userId);
      
      const plansWithDetails = await Promise.all(
        plans.map(async (plan) => {
          const workouts = await storage.getWorkoutsByPlanId(plan.id);
          const workoutsWithExercises = await Promise.all(
            workouts.map(async (workout) => {
              const exercises = await storage.getExercisesByWorkoutId(workout.id);
              return { ...workout, exercises };
            })
          );
          const assignments = await storage.getAssignmentsByPlan(plan.id);
          return {
            ...plan,
            workouts: workoutsWithExercises,
            assignmentCount: assignments.length,
          };
        })
      );
      
      res.json(plansWithDetails);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.get("/api/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      const plan = await storage.getTrainingPlan(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (plan.trainerId !== userId) {
        if (user?.role === 'client') {
          const assignment = await storage.getClientAssignment(userId);
          if (!assignment || assignment.planId !== id) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const workouts = await storage.getWorkoutsByPlanId(id);
      const workoutsWithExercises = await Promise.all(
        workouts.map(async (workout) => {
          const exercises = await storage.getExercisesByWorkoutId(workout.id);
          return { ...workout, exercises };
        })
      );
      
      res.json({ ...plan, workouts: workoutsWithExercises });
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ message: "Failed to fetch plan" });
    }
  });

  app.post("/api/plans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can create plans" });
      }

      const validationResult = insertTrainingPlanSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }
      
      const plan = await storage.createTrainingPlan(validationResult.data, userId);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating plan:", error);
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  app.put("/api/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      
      const existingPlan = await storage.getTrainingPlan(id);
      if (!existingPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      if (existingPlan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only edit your own plans" });
      }

      const validationResult = insertTrainingPlanSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }
      
      const updatedPlan = await storage.updateTrainingPlan(id, validationResult.data);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  app.delete("/api/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      
      const plan = await storage.getTrainingPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only delete your own plans" });
      }

      await storage.deleteTrainingPlan(id);
      res.json({ message: "Plan deleted" });
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });

  app.post("/api/plans/:id/copy", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can copy plans" });
      }

      const originalPlan = await storage.getTrainingPlan(id);
      if (!originalPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (originalPlan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only copy your own plans" });
      }

      const copiedPlan = await storage.copyTrainingPlan(id, userId);
      res.status(201).json(copiedPlan);
    } catch (error) {
      console.error("Error copying plan:", error);
      res.status(500).json({ message: "Failed to copy plan" });
    }
  });

  app.post("/api/plans/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can create plans" });
      }

      const validationResult = insertPlanWithWorkoutsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }
      
      const newPlan = await storage.createTrainingPlanWithWorkouts(userId, validationResult.data);
      res.status(201).json(newPlan);
    } catch (error) {
      console.error("Error creating plan with workouts:", error);
      res.status(500).json({ message: "Failed to create plan with workouts" });
    }
  });

  app.put("/api/plans/:id/bulk", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can update plans" });
      }

      const plan = await storage.getTrainingPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validationResult = insertPlanWithWorkoutsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }
      
      const updatedPlan = await storage.updateTrainingPlanWithWorkouts(id, userId, validationResult.data);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating plan with workouts:", error);
      res.status(500).json({ message: "Failed to update plan with workouts" });
    }
  });

  // Workout routes
  app.get("/api/plans/:planId/workouts", isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access workouts" });
      }

      const plan = await storage.getTrainingPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only access workouts from your own plans" });
      }

      const workouts = await storage.getWorkoutsByPlanId(planId);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  app.post("/api/plans/:planId/workouts", isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can create workouts" });
      }

      const plan = await storage.getTrainingPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only add workouts to your own plans" });
      }

      const validationResult = insertWorkoutSchema.omit({ planId: true }).safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const workout = await storage.createWorkout(planId, validationResult.data);
      res.status(201).json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(500).json({ message: "Failed to create workout" });
    }
  });

  app.get("/api/workouts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access workouts" });
      }

      const workout = await storage.getWorkoutById(id);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only access your own workouts" });
      }

      const exercises = await storage.getExercisesByWorkoutId(id);
      res.json({ ...workout, exercises });
    } catch (error) {
      console.error("Error fetching workout:", error);
      res.status(500).json({ message: "Failed to fetch workout" });
    }
  });

  app.put("/api/workouts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can update workouts" });
      }

      const workout = await storage.getWorkoutById(id);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only update your own workouts" });
      }

      const validationResult = insertWorkoutSchema.omit({ planId: true }).partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedWorkout = await storage.updateWorkout(id, validationResult.data);
      res.json(updatedWorkout);
    } catch (error) {
      console.error("Error updating workout:", error);
      res.status(500).json({ message: "Failed to update workout" });
    }
  });

  app.delete("/api/workouts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can delete workouts" });
      }

      const workout = await storage.getWorkoutById(id);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only delete your own workouts" });
      }

      await storage.deleteWorkout(id);
      res.json({ message: "Workout deleted" });
    } catch (error) {
      console.error("Error deleting workout:", error);
      res.status(500).json({ message: "Failed to delete workout" });
    }
  });

  // Exercise routes
  app.get("/api/workouts/:workoutId/exercises", isAuthenticated, async (req, res) => {
    try {
      const { workoutId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access exercises" });
      }

      const workout = await storage.getWorkoutById(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only access exercises from your own workouts" });
      }

      const exercises = await storage.getExercisesByWorkoutId(workoutId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  app.post("/api/workouts/:workoutId/exercises", isAuthenticated, async (req, res) => {
    try {
      const { workoutId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can create exercises" });
      }

      const workout = await storage.getWorkoutById(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only add exercises to your own workouts" });
      }

      const exerciseSchema = z.array(insertExerciseSchema);
      const validationResult = exerciseSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const exercises = await storage.createExercises(workoutId, validationResult.data);
      res.status(201).json(exercises);
    } catch (error) {
      console.error("Error creating exercises:", error);
      res.status(500).json({ message: "Failed to create exercises" });
    }
  });

  app.put("/api/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can update exercises" });
      }

      const exercise = await storage.getExerciseById(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      const workout = await storage.getWorkoutById(exercise.workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validationResult = insertExerciseSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedExercise = await storage.updateExercise(id, validationResult.data);
      res.json(updatedExercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ message: "Failed to update exercise" });
    }
  });

  app.delete("/api/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can delete exercises" });
      }

      const exercise = await storage.getExerciseById(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      const workout = await storage.getWorkoutById(exercise.workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteExercise(id);
      res.json({ message: "Exercise deleted" });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ message: "Failed to delete exercise" });
    }
  });

  // Exercise library routes
  app.get("/api/exercises/library", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access exercise library" });
      }

      const exercises = await storage.getTrainerExerciseLibrary(userId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercise library:", error);
      res.status(500).json({ message: "Failed to fetch exercise library" });
    }
  });

  app.post("/api/exercises/library", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can create exercises" });
      }

      const validationResult = insertExerciseLibrarySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const exercise = await storage.createExerciseLibrary({ ...validationResult.data, trainerId: userId }, userId);
      res.json(exercise);
    } catch (error) {
      console.error("Error creating exercise:", error);
      res.status(500).json({ message: "Failed to create exercise" });
    }
  });

  app.get("/api/exercises/library/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      
      const exercise = await storage.getExerciseFromLibrary(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      if (exercise.trainerId !== userId) {
        return res.status(403).json({ message: "You can only access your own exercises" });
      }

      res.json(exercise);
    } catch (error) {
      console.error("Error fetching exercise:", error);
      res.status(500).json({ message: "Failed to fetch exercise" });
    }
  });

  app.put("/api/exercises/library/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can update exercises" });
      }
      
      const existingExercise = await storage.getExerciseFromLibrary(id);
      if (!existingExercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      if (existingExercise.trainerId !== userId) {
        return res.status(403).json({ message: "You can only update your own exercises" });
      }

      const validationResult = insertExerciseLibrarySchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedExercise = await storage.updateExerciseLibrary(id, validationResult.data);
      res.json(updatedExercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ message: "Failed to update exercise" });
    }
  });

  app.delete("/api/exercises/library/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can delete exercises" });
      }
      
      const exercise = await storage.getExerciseFromLibrary(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }
      
      if (exercise.trainerId !== userId) {
        return res.status(403).json({ message: "You can only delete your own exercises" });
      }

      await storage.deleteExerciseLibrary(id);
      res.json({ message: "Exercise deleted" });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ message: "Failed to delete exercise" });
    }
  });

  // User profile routes
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getUserProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      const existingProfile = await storage.getUserProfile(userId);
      if (existingProfile) {
        return res.status(400).json({ message: "Profile already exists" });
      }

      const validationResult = insertUserProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const profile = await storage.createUserProfile({ ...validationResult.data, userId });
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.put("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;

      const validationResult = updateUserProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedProfile = await storage.updateUserProfile(userId, validationResult.data);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Client progress routes
  app.get("/api/client/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Only clients can access their progress" });
      }

      const progress = await storage.getClientProgress(userId);
      res.json(progress || null);
    } catch (error) {
      console.error("Error fetching client progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.put("/api/client/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Only clients can update their progress" });
      }

      const validationResult = updateClientProgressSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const progress = await storage.upsertClientProgress(userId, validationResult.data);
      res.json(progress);
    } catch (error) {
      console.error("Error updating client progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Trainer viewing client progress
  app.get("/api/trainer/clients/:clientId/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can view client progress" });
      }

      const { clientId } = req.params;
      
      const trainerClients = await storage.getTrainerClients(userId);
      const isTrainerClient = trainerClients.some(client => client.id === clientId);
      
      if (!isTrainerClient) {
        return res.status(403).json({ message: "You can only view progress of your own clients" });
      }

      const progress = await storage.getClientProgress(clientId);
      if (!progress) {
        return res.status(404).json({ message: "Client progress not found" });
      }

      res.json(progress);
    } catch (error) {
      console.error("Error fetching client progress:", error);
      res.status(500).json({ message: "Failed to fetch client progress" });
    }
  });

  // Assignment routes
  app.post("/api/assignments/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can assign plans" });
      }

      const { planId, clientIds } = z.object({
        planId: z.string(),
        clientIds: z.array(z.string()),
      }).parse(req.body);
      
      const plan = await storage.getTrainingPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only assign your own plans" });
      }

      const assignments = await storage.createBulkAssignments(planId, clientIds);
      res.json(assignments);
    } catch (error) {
      console.error("Error creating assignments:", error);
      res.status(500).json({ message: "Failed to create assignments" });
    }
  });

  // Client routes
  app.post("/api/clients/search", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can search for clients" });
      }

      const searchSchema = z.object({
        email: z.string().email("Nieprawidłowy adres email"),
      });

      const validationResult = searchSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const { email } = validationResult.data;
      const client = await storage.searchClientByEmail(email);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const { password: _, ...clientWithoutPassword } = client;
      
      const assignment = await storage.getClientAssignment(client.id);
      let assignmentWithPlan = undefined;
      
      if (assignment) {
        const plan = await storage.getTrainingPlan(assignment.planId);
        if (plan) {
          assignmentWithPlan = { ...assignment, plan };
        }
      }
      
      res.json({ 
        ...clientWithoutPassword,
        assignment: assignmentWithPlan 
      });
    } catch (error) {
      console.error("Error searching for client:", error);
      res.status(500).json({ message: "Failed to search for client" });
    }
  });

  app.get("/api/trainer/clients", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access this" });
      }

      const clients = await storage.getTrainerClients(userId);
      
      const clientsWithAssignments = await Promise.all(
        clients.map(async (client) => {
          const assignment = await storage.getClientAssignment(client.id);
          if (assignment) {
            const plan = await storage.getTrainingPlan(assignment.planId);
            return {
              ...client,
              assignment: plan ? { ...assignment, plan } : undefined,
            };
          }
          return client;
        })
      );
      
      res.json(clientsWithAssignments);
    } catch (error) {
      console.error("Error fetching trainer clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Invitations routes
  app.post("/api/invitations/send", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą wysyłać zaproszenia" });
      }

      const validationResult = insertPlanInvitationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const invitation = await storage.createInvitation(userId, validationResult.data);
      res.status(200).json(invitation);
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Nie udało się wysłać zaproszenia" });
    }
  });

  app.get("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      let invitations;
      
      if (user.role === "client") {
        invitations = await storage.getClientInvitations(user.email);
        
        const invitationsWithDetails = await Promise.all(
          invitations.map(async (invitation) => {
            const plan = await storage.getTrainingPlan(invitation.planId);
            const trainer = await storage.getUser(invitation.trainerId);
            
            if (!plan || !trainer) {
              return null;
            }
            
            const { password: _, ...trainerWithoutPassword } = trainer;
            
            return {
              ...invitation,
              plan,
              trainer: trainerWithoutPassword,
            };
          })
        );
        
        res.json(invitationsWithDetails.filter(inv => inv !== null));
      } else if (user.role === "trainer") {
        invitations = await storage.getTrainerInvitations(userId);
        
        const invitationsWithDetails = await Promise.all(
          invitations.map(async (invitation) => {
            const plan = await storage.getTrainingPlan(invitation.planId);
            
            if (!plan) {
              return null;
            }
            
            return {
              ...invitation,
              plan,
            };
          })
        );
        
        res.json(invitationsWithDetails.filter(inv => inv !== null));
      } else {
        return res.status(403).json({ message: "Nieznana rola użytkownika" });
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Nie udało się pobrać zaproszeń" });
    }
  });

  app.post("/api/invitations/:id/accept", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą akceptować zaproszenia" });
      }

      const { id } = req.params;
      
      try {
        await storage.acceptInvitation(id, userId);
        res.status(200).json({ message: "Zaproszenie zaakceptowane" });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ message: "Zaproszenie nie zostało znalezione" });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Nie udało się zaakceptować zaproszenia" });
    }
  });

  app.post("/api/invitations/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą odrzucać zaproszenia" });
      }

      const { id } = req.params;
      
      try {
        await storage.rejectInvitation(id, userId);
        res.status(200).json({ message: "Zaproszenie odrzucone" });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ message: "Zaproszenie nie zostało znalezione" });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      res.status(500).json({ message: "Nie udało się odrzucić zaproszenia" });
    }
  });

  app.get("/api/trainer/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access stats" });
      }

      const stats = await storage.getTrainerStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Client-specific routes
  app.get("/api/client/assignment", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Only clients can access this" });
      }

      const assignment = await storage.getClientAssignment(userId);
      if (!assignment) {
        return res.json(null);
      }

      const plan = await storage.getTrainingPlan(assignment.planId);
      if (!plan) {
        return res.json(null);
      }

      const workouts = await storage.getWorkoutsByPlanId(plan.id);
      const workoutsWithExercises = await Promise.all(
        workouts.map(async (workout) => {
          const exercises = await storage.getExercisesByWorkoutId(workout.id);
          return { ...workout, exercises };
        })
      );
      
      res.json({
        ...assignment,
        plan: {
          ...plan,
          workouts: workoutsWithExercises,
        },
      });
    } catch (error) {
      console.error("Error fetching client assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  // Exercise logs endpoints
  app.post("/api/exercises/:exerciseId/log", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą logować wykonania ćwiczeń" });
      }

      const { exerciseId } = req.params;
      const validationResult = insertExerciseLogSchema.safeParse({
        ...req.body,
        exerciseId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const { reps, load, notes } = validationResult.data;
      const log = await storage.logExercise(userId, exerciseId, { 
        reps, 
        load: load ?? undefined, 
        notes: notes ?? undefined 
      });
      res.json(log);
    } catch (error) {
      console.error("Error logging exercise:", error);
      res.status(500).json({ message: "Nie udało się zapisać wykonania ćwiczenia" });
    }
  });

  app.get("/api/exercises/:exerciseId/logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą pobierać logi ćwiczeń" });
      }

      const { exerciseId } = req.params;
      const logs = await storage.getExerciseLogs(userId, exerciseId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching exercise logs:", error);
      res.status(500).json({ message: "Nie udało się pobrać logów ćwiczeń" });
    }
  });

  app.get("/api/exercises/:exerciseId/latest-log", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą pobierać logi ćwiczeń" });
      }

      const { exerciseId } = req.params;
      const latestLog = await storage.getLatestExerciseLog(userId, exerciseId);
      res.json(latestLog || null);
    } catch (error) {
      console.error("Error fetching latest exercise log:", error);
      res.status(500).json({ message: "Nie udało się pobrać najnowszego loga ćwiczenia" });
    }
  });

  // Weekly reports endpoints
  app.post("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą tworzyć raporty" });
      }

      const validationResult = insertWeeklyReportSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const report = await storage.createWeeklyReport(userId, validationResult.data);
      res.json(report);
    } catch (error) {
      console.error("Error creating weekly report:", error);
      res.status(500).json({ message: "Nie udało się utworzyć raportu" });
    }
  });

  app.get("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą pobierać swoje raporty" });
      }

      const reports = await storage.getClientWeeklyReports(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching weekly reports:", error);
      res.status(500).json({ message: "Nie udało się pobrać raportów" });
    }
  });

  app.get("/api/clients/:clientId/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą pobierać raporty podopiecznych" });
      }

      const { clientId } = req.params;
      const reports = await storage.getClientWeeklyReportsForTrainer(clientId, userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching client weekly reports:", error);
      res.status(500).json({ message: "Nie udało się pobrać raportów podopiecznego" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
