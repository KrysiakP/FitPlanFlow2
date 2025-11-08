import {
  users,
  trainingPlans,
  workouts,
  exercises,
  planAssignments,
  exerciseLibrary,
  userProfiles,
  clientProgress,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt" | "profileImageUrl">): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: "trainer" | "client"): Promise<User>;
  
  // Training plan operations
  createTrainingPlan(plan: Omit<InsertTrainingPlan, 'trainerId' | 'id' | 'createdAt' | 'updatedAt'>, trainerId: string): Promise<TrainingPlan>;
  getTrainingPlan(planId: string): Promise<TrainingPlan | undefined>;
  getTrainerPlans(trainerId: string): Promise<TrainingPlan[]>;
  updateTrainingPlan(planId: string, plan: Partial<Omit<InsertTrainingPlan, 'trainerId' | 'id' | 'createdAt' | 'updatedAt'>>): Promise<TrainingPlan>;
  deleteTrainingPlan(planId: string): Promise<void>;
  copyTrainingPlan(originalPlanId: string, trainerId: string): Promise<TrainingPlan>;
  
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
  getAvailableClients(): Promise<User[]>;
  
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
  
  // Client search (privacy - search by email only)
  searchClientByEmail(email: string): Promise<User | undefined>;
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

  async createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt" | "profileImageUrl">): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        profileImageUrl: null,
      })
      .returning();
    return user;
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

  async getAvailableClients(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "client"));
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

  // Client search (privacy - search by email only)
  async searchClientByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.role, "client")));
    return user;
  }
}

export const storage = new DatabaseStorage();
