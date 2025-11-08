import {
  users,
  trainingPlans,
  exercises,
  planAssignments,
  type User,
  type UpsertUser,
  type TrainingPlan,
  type InsertTrainingPlan,
  type Exercise,
  type InsertExercise,
  type PlanAssignment,
  type InsertPlanAssignment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: "trainer" | "client"): Promise<User>;
  
  // Training plan operations
  createTrainingPlan(plan: InsertTrainingPlan, trainerId: string): Promise<TrainingPlan>;
  getTrainingPlan(planId: string): Promise<TrainingPlan | undefined>;
  getTrainerPlans(trainerId: string): Promise<TrainingPlan[]>;
  updateTrainingPlan(planId: string, plan: { name?: string; description?: string | null }): Promise<TrainingPlan>;
  deleteTrainingPlan(planId: string): Promise<void>;
  
  // Exercise operations
  createExercises(planId: string, exercisesList: Omit<InsertExercise, 'planId'>[]): Promise<Exercise[]>;
  getExercisesByPlan(planId: string): Promise<Exercise[]>;
  deleteExercisesByPlan(planId: string): Promise<void>;
  
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
  async createTrainingPlan(plan: InsertTrainingPlan, trainerId: string): Promise<TrainingPlan> {
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

  async updateTrainingPlan(planId: string, plan: { name?: string; description?: string | null }): Promise<TrainingPlan> {
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

  // Exercise operations
  async createExercises(planId: string, exercisesList: Omit<InsertExercise, 'planId'>[]): Promise<Exercise[]> {
    if (exercisesList.length === 0) return [];
    
    const exercisesWithPlanId = exercisesList.map((ex) => ({
      ...ex,
      planId,
    }));
    
    return await db.insert(exercises).values(exercisesWithPlanId).returning();
  }

  async getExercisesByPlan(planId: string): Promise<Exercise[]> {
    return await db
      .select()
      .from(exercises)
      .where(eq(exercises.planId, planId))
      .orderBy(exercises.orderIndex);
  }

  async deleteExercisesByPlan(planId: string): Promise<void> {
    await db.delete(exercises).where(eq(exercises.planId, planId));
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
}

export const storage = new DatabaseStorage();
