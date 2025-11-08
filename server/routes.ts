import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword, comparePassword } from "./auth";
import {
  insertTrainingPlanSchema,
  insertExerciseSchema,
  insertPlanAssignmentSchema,
  insertExerciseLibrarySchema,
  insertUserProfileSchema,
  updateUserProfileSchema,
  insertClientProgressSchema,
  updateClientProgressSchema,
  updateUserRoleSchema,
  registerSchema,
  loginSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
          const exercisesList = await storage.getExercisesByPlan(plan.id);
          const assignments = await storage.getAssignmentsByPlan(plan.id);
          return {
            ...plan,
            exercises: exercisesList,
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
      const plan = await storage.getTrainingPlan(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const exercisesList = await storage.getExercisesByPlan(id);
      res.json({ ...plan, exercises: exercisesList });
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

      const planSchema = insertTrainingPlanSchema.extend({
        exercises: z.array(insertExerciseSchema),
      });
      
      const { exercises: exercisesList, ...planData } = planSchema.parse(req.body);
      
      const plan = await storage.createTrainingPlan({ ...planData, trainerId: userId }, userId);
      await storage.createExercises(plan.id, exercisesList);
      
      const createdExercises = await storage.getExercisesByPlan(plan.id);
      res.json({ ...plan, exercises: createdExercises });
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

      const planSchema = insertTrainingPlanSchema.extend({
        exercises: z.array(insertExerciseSchema),
      });
      
      const { exercises: exercisesList, ...planData } = planSchema.parse(req.body);
      
      const updatedPlan = await storage.updateTrainingPlan(id, planData);
      await storage.deleteExercisesByPlan(id);
      await storage.createExercises(id, exercisesList);
      
      const updatedExercises = await storage.getExercisesByPlan(id);
      res.json({ ...updatedPlan, exercises: updatedExercises });
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
  app.get("/api/clients/available", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access this" });
      }

      const clients = await storage.getAvailableClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

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
      res.json(clientWithoutPassword);
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

      const exercisesList = await storage.getExercisesByPlan(plan.id);
      res.json({
        ...assignment,
        plan: {
          ...plan,
          exercises: exercisesList,
        },
      });
    } catch (error) {
      console.error("Error fetching client assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
