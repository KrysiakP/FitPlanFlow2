import {
  users,
  trainingPlans,
  workouts,
  exercises,
  planAssignments,
  exerciseLibrary,
  userProfiles,
  clientProgress,
  exerciseLogs,
  weeklyReports,
  planInvitations,
  type User,
  type UpsertUser,
  type TrainingPlan,
  type InsertTrainingPlan,
  type Workout,
  type InsertWorkout,
  type Exercise,
  type InsertExercise,
  type PlanAssignment,
  type InsertPlanAssignment,
  type ExerciseLibrary,
  type InsertExerciseLibrary,
  type UserProfile,
  type InsertUserProfile,
  type ClientProgress,
  type InsertClientProgress,
  type ExerciseLog,
  type InsertExerciseLog,
  type WeeklyReport,
  type InsertWeeklyReport,
  type InsertPlanWithWorkouts,
  type PlanInvitation,
  type InsertPlanInvitationInput,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt" | "profileImageUrl" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionStatus" | "subscriptionTier">): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: "trainer" | "client"): Promise<User>;
  
  // Subscription operations
  updateUserSubscription(userId: string, data: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string | null; subscriptionTier?: string }): Promise<User>;
  checkTrainerClientLimit(trainerId: string): Promise<{ withinLimit: boolean; currentCount: number; maxCount: number }>;
  
  // Training plan operations
  createTrainingPlan(plan: Omit<InsertTrainingPlan, 'trainerId' | 'id' | 'createdAt' | 'updatedAt'>, trainerId: string): Promise<TrainingPlan>;
  getTrainingPlan(planId: string): Promise<TrainingPlan | undefined>;
  getTrainerPlans(trainerId: string): Promise<TrainingPlan[]>;
  updateTrainingPlan(planId: string, plan: Partial<Omit<InsertTrainingPlan, 'trainerId' | 'id' | 'createdAt' | 'updatedAt'>>): Promise<TrainingPlan>;
  deleteTrainingPlan(planId: string): Promise<void>;
  copyTrainingPlan(originalPlanId: string, trainerId: string): Promise<TrainingPlan>;
  createTrainingPlanWithWorkouts(trainerId: string, data: InsertPlanWithWorkouts): Promise<TrainingPlan>;
  updateTrainingPlanWithWorkouts(planId: string, trainerId: string, data: InsertPlanWithWorkouts): Promise<TrainingPlan>;
  
  // Workout operations
  getWorkoutsByPlanId(planId: string): Promise<Workout[]>;
  getWorkoutById(id: string): Promise<Workout | undefined>;
  createWorkout(planId: string, input: Omit<InsertWorkout, 'planId'>): Promise<Workout>;
  updateWorkout(id: string, input: Partial<Omit<InsertWorkout, 'planId'>>): Promise<Workout>;
  deleteWorkout(id: string): Promise<void>;
  
  // Exercise operations
  createExercises(workoutId: string, exercisesList: Omit<InsertExercise, 'workoutId'>[]): Promise<Exercise[]>;
  getExercisesByWorkoutId(workoutId: string): Promise<Exercise[]>;
  getExerciseById(id: string): Promise<Exercise | undefined>;
  updateExercise(id: string, data: Partial<Omit<InsertExercise, 'workoutId'>>): Promise<Exercise>;
  deleteExercise(id: string): Promise<void>;
  deleteExercisesByWorkout(workoutId: string): Promise<void>;
  
  // Assignment operations
  createAssignment(assignment: InsertPlanAssignment): Promise<PlanAssignment>;
  createBulkAssignments(planId: string, clientIds: string[]): Promise<PlanAssignment[]>;
  getClientAssignment(clientId: string): Promise<PlanAssignment | undefined>;
  getAssignmentsByPlan(planId: string): Promise<PlanAssignment[]>;
  getTrainerClients(trainerId: string): Promise<User[]>;
  
  // Stats
  getTrainerStats(trainerId: string): Promise<{
    totalPlans: number;
    totalClients: number;
    totalAssignments: number;
  }>;
  
  // Exercise library operations
  createExerciseLibrary(exercise: InsertExerciseLibrary, trainerId: string): Promise<ExerciseLibrary>;
  getTrainerExerciseLibrary(trainerId: string): Promise<ExerciseLibrary[]>;
  getExerciseFromLibrary(exerciseId: string): Promise<ExerciseLibrary | undefined>;
  updateExerciseLibrary(exerciseId: string, data: Partial<InsertExerciseLibrary>): Promise<ExerciseLibrary>;
  deleteExerciseLibrary(exerciseId: string): Promise<void>;
  
  // User profile operations
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile>;
  
  // Client progress operations
  getClientProgress(clientId: string): Promise<ClientProgress | undefined>;
  upsertClientProgress(clientId: string, data: Partial<InsertClientProgress>): Promise<ClientProgress>;
  
  // Exercise logs operations
  logExercise(clientId: string, exerciseId: string, data: { reps: number, load?: string, notes?: string }): Promise<ExerciseLog>;
  getExerciseLogs(clientId: string, exerciseId: string): Promise<ExerciseLog[]>;
  getLatestExerciseLog(clientId: string, exerciseId: string): Promise<ExerciseLog | undefined>;
  
  // Weekly reports operations
  createWeeklyReport(clientId: string, data: Omit<InsertWeeklyReport, 'clientId'>): Promise<WeeklyReport>;
  getClientWeeklyReports(clientId: string): Promise<WeeklyReport[]>;
  getLatestWeeklyReport(clientId: string): Promise<WeeklyReport | undefined>;
  getClientWeeklyReportsForTrainer(clientId: string, trainerId: string): Promise<WeeklyReport[]>;
  
  // Client search - find any client by email
  searchClientByEmail(email: string): Promise<User | undefined>;
  
  // Plan invitation operations
  createInvitation(trainerId: string, data: InsertPlanInvitationInput): Promise<PlanInvitation>;
  getClientInvitations(clientEmail: string): Promise<PlanInvitation[]>;
  acceptInvitation(invitationId: string, clientId: string): Promise<void>;
  rejectInvitation(invitationId: string, clientId: string): Promise<void>;
  getTrainerInvitations(trainerId: string): Promise<PlanInvitation[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt" | "profileImageUrl" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionStatus" | "subscriptionTier">): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        profileImageUrl: null,
      })
      .returning();
    return user;
  }
  
  async updateUserSubscription(userId: string, data: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string | null; subscriptionTier?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...data,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async checkTrainerClientLimit(trainerId: string): Promise<{ withinLimit: boolean; currentCount: number; maxCount: number }> {
    const trainer = await this.getUser(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      throw new Error("Użytkownik nie jest trenerem");
    }
    
    const clients = await this.getTrainerClients(trainerId);
    const currentCount = clients.length;
    
    const isPremium = trainer.subscriptionTier === 'premium' && 
                     (trainer.subscriptionStatus === 'active' || trainer.subscriptionStatus === 'trialing');
    
    const maxCount = isPremium ? Infinity : 10;
    const withinLimit = currentCount < maxCount;
    
    return {
      withinLimit,
      currentCount,
      maxCount: isPremium ? -1 : 10,
    };
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: "trainer" | "client"): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Training plan operations
  async createTrainingPlan(plan: Omit<InsertTrainingPlan, 'trainerId' | 'id' | 'createdAt' | 'updatedAt'>, trainerId: string): Promise<TrainingPlan> {
    const [createdPlan] = await db
      .insert(trainingPlans)
      .values({ ...plan, trainerId })
      .returning();
    return createdPlan;
  }

  async getTrainingPlan(planId: string): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.id, planId));
    return plan;
  }

  async getTrainerPlans(trainerId: string): Promise<TrainingPlan[]> {
    return await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.trainerId, trainerId));
  }

  async updateTrainingPlan(planId: string, plan: Partial<Omit<InsertTrainingPlan, 'trainerId' | 'id' | 'createdAt' | 'updatedAt'>>): Promise<TrainingPlan> {
    const [updated] = await db
      .update(trainingPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(trainingPlans.id, planId))
      .returning();
    return updated;
  }

  async deleteTrainingPlan(planId: string): Promise<void> {
    await db.delete(trainingPlans).where(eq(trainingPlans.id, planId));
  }

  async copyTrainingPlan(originalPlanId: string, trainerId: string): Promise<TrainingPlan> {
    return await db.transaction(async (tx) => {
      const [originalPlan] = await tx.select().from(trainingPlans)
        .where(eq(trainingPlans.id, originalPlanId));
      
      if (!originalPlan) {
        throw new Error("Plan not found");
      }

      const newPlanId = randomUUID();
      const [newPlan] = await tx.insert(trainingPlans).values({
        id: newPlanId,
        name: `[KOPIA] ${originalPlan.name}`,
        description: originalPlan.description,
        trainerId: trainerId,
      }).returning();

      const originalWorkouts = await tx.select().from(workouts)
        .where(eq(workouts.planId, originalPlanId))
        .orderBy(workouts.orderIndex);

      for (const workout of originalWorkouts) {
        const newWorkoutId = randomUUID();

        await tx.insert(workouts).values({
          id: newWorkoutId,
          planId: newPlanId,
          name: workout.name,
          description: workout.description,
          orderIndex: workout.orderIndex,
        });

        const originalExercises = await tx.select().from(exercises)
          .where(eq(exercises.workoutId, workout.id))
          .orderBy(exercises.orderIndex);

        for (const exercise of originalExercises) {
          await tx.insert(exercises).values({
            id: randomUUID(),
            workoutId: newWorkoutId,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            description: exercise.description,
            restTime: exercise.restTime,
            orderIndex: exercise.orderIndex,
            load: exercise.load,
            videoUrl: exercise.videoUrl,
          });
        }
      }

      return newPlan;
    });
  }

  async createTrainingPlanWithWorkouts(trainerId: string, data: InsertPlanWithWorkouts): Promise<TrainingPlan> {
    return await db.transaction(async (tx) => {
      const { workouts: workoutsData, ...planData } = data;
      
      const [newPlan] = await tx.insert(trainingPlans).values({
        id: randomUUID(),
        ...planData,
        trainerId,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      for (const workout of workoutsData) {
        const { exercises: exercisesData, ...workoutData } = workout;
        
        const [newWorkout] = await tx.insert(workouts).values({
          id: randomUUID(),
          ...workoutData,
          planId: newPlan.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        if (exercisesData.length > 0) {
          await tx.insert(exercises).values(
            exercisesData.map(ex => ({
              id: randomUUID(),
              ...ex,
              workoutId: newWorkout.id
            }))
          );
        }
      }
      
      return newPlan;
    });
  }

  async updateTrainingPlanWithWorkouts(planId: string, trainerId: string, data: InsertPlanWithWorkouts): Promise<TrainingPlan> {
    return await db.transaction(async (tx) => {
      const { workouts: workoutsData, ...planData } = data;
      
      const [updatedPlan] = await tx.update(trainingPlans)
        .set({ ...planData, updatedAt: new Date() })
        .where(eq(trainingPlans.id, planId))
        .returning();
      
      await tx.delete(workouts).where(eq(workouts.planId, planId));
      
      for (const workout of workoutsData) {
        const { exercises: exercisesData, ...workoutData } = workout;
        
        const [newWorkout] = await tx.insert(workouts).values({
          id: randomUUID(),
          ...workoutData,
          planId: updatedPlan.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        
        if (exercisesData.length > 0) {
          await tx.insert(exercises).values(
            exercisesData.map(ex => ({
              id: randomUUID(),
              ...ex,
              workoutId: newWorkout.id
            }))
          );
        }
      }
      
      return updatedPlan;
    });
  }

  // Workout operations
  async getWorkoutsByPlanId(planId: string): Promise<Workout[]> {
    return await db
      .select()
      .from(workouts)
      .where(eq(workouts.planId, planId))
      .orderBy(workouts.orderIndex);
  }

  async getWorkoutById(id: string): Promise<Workout | undefined> {
    const [workout] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, id));
    return workout;
  }

  async createWorkout(planId: string, input: Omit<InsertWorkout, 'planId'>): Promise<Workout> {
    const [created] = await db
      .insert(workouts)
      .values({ ...input, planId })
      .returning();
    return created;
  }

  async updateWorkout(id: string, input: Partial<Omit<InsertWorkout, 'planId'>>): Promise<Workout> {
    const [updated] = await db
      .update(workouts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(workouts.id, id))
      .returning();
    return updated;
  }

  async deleteWorkout(id: string): Promise<void> {
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  // Exercise operations
  async createExercises(workoutId: string, exercisesList: Omit<InsertExercise, 'workoutId'>[]): Promise<Exercise[]> {
    if (exercisesList.length === 0) return [];
    
    const exercisesWithWorkoutId = exercisesList.map((ex) => ({
      ...ex,
      workoutId,
    }));
    
    return await db.insert(exercises).values(exercisesWithWorkoutId).returning();
  }

  async getExercisesByWorkoutId(workoutId: string): Promise<Exercise[]> {
    return await db
      .select()
      .from(exercises)
      .where(eq(exercises.workoutId, workoutId))
      .orderBy(exercises.orderIndex);
  }

  async getExerciseById(id: string): Promise<Exercise | undefined> {
    const [exercise] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, id));
    return exercise;
  }

  async updateExercise(id: string, data: Partial<Omit<InsertExercise, 'workoutId'>>): Promise<Exercise> {
    const [updated] = await db
      .update(exercises)
      .set(data)
      .where(eq(exercises.id, id))
      .returning();
    return updated;
  }

  async deleteExercise(id: string): Promise<void> {
    await db.delete(exercises).where(eq(exercises.id, id));
  }

  async deleteExercisesByWorkout(workoutId: string): Promise<void> {
    await db.delete(exercises).where(eq(exercises.workoutId, workoutId));
  }

  // Assignment operations
  async createAssignment(assignment: InsertPlanAssignment): Promise<PlanAssignment> {
    const [created] = await db
      .insert(planAssignments)
      .values(assignment)
      .returning();
    return created;
  }

  async createBulkAssignments(planId: string, clientIds: string[]): Promise<PlanAssignment[]> {
    if (clientIds.length === 0) return [];
    
    const assignments = clientIds.map((clientId) => ({
      planId,
      clientId,
    }));
    
    return await db.insert(planAssignments).values(assignments).returning();
  }

  async getClientAssignment(clientId: string): Promise<PlanAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(planAssignments)
      .where(eq(planAssignments.clientId, clientId))
      .orderBy(planAssignments.assignedAt)
      .limit(1);
    return assignment;
  }

  async getAssignmentsByPlan(planId: string): Promise<PlanAssignment[]> {
    return await db
      .select()
      .from(planAssignments)
      .where(eq(planAssignments.planId, planId));
  }

  async getTrainerClients(trainerId: string): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(planAssignments)
      .innerJoin(trainingPlans, eq(planAssignments.planId, trainingPlans.id))
      .innerJoin(users, eq(planAssignments.clientId, users.id))
      .where(eq(trainingPlans.trainerId, trainerId))
      .groupBy(users.id);
    
    return result.map((r) => r.user);
  }

  // Stats
  async getTrainerStats(trainerId: string): Promise<{
    totalPlans: number;
    totalClients: number;
    totalAssignments: number;
  }> {
    const plans = await this.getTrainerPlans(trainerId);
    const clients = await this.getTrainerClients(trainerId);
    
    let totalAssignments = 0;
    for (const plan of plans) {
      const assignments = await this.getAssignmentsByPlan(plan.id);
      totalAssignments += assignments.length;
    }
    
    return {
      totalPlans: plans.length,
      totalClients: clients.length,
      totalAssignments,
    };
  }

  // Exercise library operations
  async createExerciseLibrary(exercise: InsertExerciseLibrary, trainerId: string): Promise<ExerciseLibrary> {
    const [created] = await db
      .insert(exerciseLibrary)
      .values({ ...exercise, trainerId })
      .returning();
    return created;
  }

  async getTrainerExerciseLibrary(trainerId: string): Promise<ExerciseLibrary[]> {
    return await db
      .select()
      .from(exerciseLibrary)
      .where(eq(exerciseLibrary.trainerId, trainerId));
  }

  async getExerciseFromLibrary(exerciseId: string): Promise<ExerciseLibrary | undefined> {
    const [exercise] = await db
      .select()
      .from(exerciseLibrary)
      .where(eq(exerciseLibrary.id, exerciseId));
    return exercise;
  }

  async updateExerciseLibrary(exerciseId: string, data: Partial<InsertExerciseLibrary>): Promise<ExerciseLibrary> {
    const [updated] = await db
      .update(exerciseLibrary)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(exerciseLibrary.id, exerciseId))
      .returning();
    return updated;
  }

  async deleteExerciseLibrary(exerciseId: string): Promise<void> {
    await db.delete(exerciseLibrary).where(eq(exerciseLibrary.id, exerciseId));
  }

  // User profile operations
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Client progress operations
  async getClientProgress(clientId: string): Promise<ClientProgress | undefined> {
    const [progress] = await db
      .select()
      .from(clientProgress)
      .where(eq(clientProgress.clientId, clientId));
    return progress;
  }

  async upsertClientProgress(clientId: string, data: Partial<InsertClientProgress>): Promise<ClientProgress> {
    const [progress] = await db
      .insert(clientProgress)
      .values({ ...data, clientId })
      .onConflictDoUpdate({
        target: clientProgress.clientId,
        set: {
          ...data,
          lastUpdated: new Date(),
        },
      })
      .returning();
    return progress;
  }

  // Exercise logs operations
  async logExercise(clientId: string, exerciseId: string, data: { reps: number, load?: string, notes?: string }): Promise<ExerciseLog> {
    const [log] = await db
      .insert(exerciseLogs)
      .values({
        clientId,
        exerciseId,
        reps: data.reps,
        load: data.load || null,
        notes: data.notes || null,
      })
      .returning();
    return log;
  }

  async getExerciseLogs(clientId: string, exerciseId: string): Promise<ExerciseLog[]> {
    return await db
      .select()
      .from(exerciseLogs)
      .where(
        and(
          eq(exerciseLogs.clientId, clientId),
          eq(exerciseLogs.exerciseId, exerciseId)
        )
      )
      .orderBy(exerciseLogs.loggedAt);
  }

  async getLatestExerciseLog(clientId: string, exerciseId: string): Promise<ExerciseLog | undefined> {
    const [log] = await db
      .select()
      .from(exerciseLogs)
      .where(
        and(
          eq(exerciseLogs.clientId, clientId),
          eq(exerciseLogs.exerciseId, exerciseId)
        )
      )
      .orderBy(desc(exerciseLogs.loggedAt))
      .limit(1);
    return log;
  }

  // Weekly reports operations
  async createWeeklyReport(clientId: string, data: Omit<InsertWeeklyReport, 'clientId'>): Promise<WeeklyReport> {
    const [report] = await db
      .insert(weeklyReports)
      .values({
        ...data,
        clientId,
      })
      .returning();
    return report;
  }

  async getClientWeeklyReports(clientId: string): Promise<WeeklyReport[]> {
    return await db
      .select()
      .from(weeklyReports)
      .where(eq(weeklyReports.clientId, clientId))
      .orderBy(desc(weeklyReports.reportDate));
  }

  async getLatestWeeklyReport(clientId: string): Promise<WeeklyReport | undefined> {
    const [report] = await db
      .select()
      .from(weeklyReports)
      .where(eq(weeklyReports.clientId, clientId))
      .orderBy(desc(weeklyReports.reportDate))
      .limit(1);
    return report;
  }

  async getClientWeeklyReportsForTrainer(clientId: string, trainerId: string): Promise<WeeklyReport[]> {
    const result = await db
      .select({
        report: weeklyReports,
      })
      .from(weeklyReports)
      .innerJoin(users, eq(weeklyReports.clientId, users.id))
      .innerJoin(planAssignments, eq(planAssignments.clientId, users.id))
      .innerJoin(trainingPlans, eq(planAssignments.planId, trainingPlans.id))
      .where(
        and(
          eq(weeklyReports.clientId, clientId),
          eq(trainingPlans.trainerId, trainerId)
        )
      )
      .orderBy(desc(weeklyReports.reportDate));
    
    return result.map(r => r.report);
  }

  // Client search - find any client by email
  async searchClientByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.role, "client")
        )
      )
      .limit(1);
    
    return user;
  }
  
  // Plan invitation operations
  async createInvitation(trainerId: string, data: InsertPlanInvitationInput): Promise<PlanInvitation> {
    const { clientEmail, planId } = data;
    
    // Zaproszenie może być wysłane do dowolnego emaila - osoba nie musi być jeszcze zarejestrowana
    
    const plan = await this.getTrainingPlan(planId);
    if (!plan) {
      throw new Error("Plan treningowy nie istnieje");
    }
    if (plan.trainerId !== trainerId) {
      throw new Error("Ten plan nie należy do tego trenera");
    }
    
    const [existingInvitation] = await db
      .select()
      .from(planInvitations)
      .where(
        and(
          eq(planInvitations.clientEmail, clientEmail),
          eq(planInvitations.planId, planId),
          eq(planInvitations.status, "pending")
        )
      )
      .limit(1);
    
    if (existingInvitation) {
      throw new Error("Aktywne zaproszenie dla tego podopiecznego i planu już istnieje");
    }
    
    const [invitation] = await db
      .insert(planInvitations)
      .values({
        trainerId,
        clientEmail,
        planId,
        status: "pending",
      })
      .returning();
    
    return invitation;
  }
  
  async getClientInvitations(clientEmail: string): Promise<PlanInvitation[]> {
    return await db
      .select()
      .from(planInvitations)
      .where(
        and(
          eq(planInvitations.clientEmail, clientEmail),
          eq(planInvitations.status, "pending")
        )
      )
      .orderBy(desc(planInvitations.createdAt));
  }
  
  async acceptInvitation(invitationId: string, clientId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(planInvitations)
        .where(eq(planInvitations.id, invitationId))
        .limit(1);
      
      if (!invitation) {
        throw new Error("Zaproszenie nie istnieje");
      }
      
      const client = await this.getUser(clientId);
      if (!client || client.email !== invitation.clientEmail) {
        throw new Error("Nie masz uprawnień do akceptacji tego zaproszenia");
      }
      
      await tx
        .update(planInvitations)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(planInvitations.id, invitationId));
      
      const existingAssignment = await tx
        .select()
        .from(planAssignments)
        .where(eq(planAssignments.clientId, clientId))
        .limit(1);
      
      if (existingAssignment.length > 0) {
        await tx
          .delete(planAssignments)
          .where(eq(planAssignments.clientId, clientId));
      }
      
      await tx
        .insert(planAssignments)
        .values({
          planId: invitation.planId,
          clientId: clientId,
        });
      
      await tx
        .update(planInvitations)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(
          and(
            eq(planInvitations.clientEmail, invitation.clientEmail),
            eq(planInvitations.status, "pending")
          )
        );
    });
  }
  
  async rejectInvitation(invitationId: string, clientId: string): Promise<void> {
    const [invitation] = await db
      .select()
      .from(planInvitations)
      .where(eq(planInvitations.id, invitationId))
      .limit(1);
    
    if (!invitation) {
      throw new Error("Zaproszenie nie istnieje");
    }
    
    const client = await this.getUser(clientId);
    if (!client || client.email !== invitation.clientEmail) {
      throw new Error("Nie masz uprawnień do odrzucenia tego zaproszenia");
    }
    
    await db
      .update(planInvitations)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(planInvitations.id, invitationId));
  }
  
  async getTrainerInvitations(trainerId: string): Promise<PlanInvitation[]> {
    return await db
      .select()
      .from(planInvitations)
      .where(eq(planInvitations.trainerId, trainerId))
      .orderBy(desc(planInvitations.createdAt));
  }
}

export const storage = new DatabaseStorage();
