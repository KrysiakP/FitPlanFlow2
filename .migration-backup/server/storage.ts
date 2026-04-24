import {
  users,
  trainingPlans,
  workouts,
  exercises,
  planAssignments,
  exerciseLibrary,
  globalExercises,
  userProfiles,
  clientProgress,
  exerciseLogs,
  weeklyReports,
  planInvitations,
  clientRelationships,
  charityDonations,
  dietPlans,
  dietMeals,
  dailyHabitLogs,
  mealCheckmarks,
  medicalTests,
  clientPayments,
  dietSupplements,
  type User,
  type GlobalExercise,
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
  type ClientRelationship,
  type InsertClientRelationshipInput,
  type CharityDonation,
  type InsertCharityDonationInput,
  type DietPlan,
  type InsertDietPlan,
  type DietMeal,
  type InsertDietMeal,
  type DailyHabitLog,
  type InsertDailyHabitLog,
  type MealCheckmark,
  type InsertMealCheckmark,
  type MedicalTest,
  type InsertMedicalTest,
  type ClientPayment,
  type InsertClientPayment,
  type DietSupplement,
  type InsertDietSupplement,
  messages,
  type Message,
  type InsertMessage,
  referralCodes,
  referralEvents,
  type ReferralCode,
  type InsertReferralCode,
  type ReferralEvent,
  type InsertReferralEvent,
  notifications,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, isNull, sql, gte, lte, asc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt" | "updatedAt" | "profileImageUrl" | "isAdmin" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionStatus" | "subscriptionTier">): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: "trainer" | "client"): Promise<User>;
  
  // Subscription operations
  updateUserSubscription(userId: string, data: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string | null; subscriptionTier?: string; trialEndsAt?: Date | null; subscriptionCancelledAt?: Date | null }): Promise<User>;
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
  deleteClientAssignment(clientId: string): Promise<void>;
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
  logExercise(clientId: string, exerciseId: string, data: { reps: number, load?: string, notes?: string, setNumber?: number }): Promise<ExerciseLog>;
  getExerciseLogs(clientId: string, exerciseId: string): Promise<ExerciseLog[]>;
  getAllClientExerciseLogs(clientId: string): Promise<ExerciseLog[]>;
  getLatestExerciseLog(clientId: string, exerciseId: string): Promise<ExerciseLog | undefined>;
  getLatestExerciseLogsBySet(clientId: string, exerciseId: string): Promise<ExerciseLog[]>;
  
  // Weekly reports operations
  createWeeklyReport(clientId: string, data: Omit<InsertWeeklyReport, 'clientId'>): Promise<WeeklyReport>;
  getClientWeeklyReports(clientId: string): Promise<WeeklyReport[]>;
  getLatestWeeklyReport(clientId: string): Promise<WeeklyReport | undefined>;
  getClientWeeklyReportsForTrainer(clientId: string, trainerId: string): Promise<WeeklyReport[]>;
  getWeeklyReport(reportId: string, clientId?: string): Promise<WeeklyReport | undefined>;
  getWeeklyReportById(reportId: string): Promise<WeeklyReport | null>;
  updateWeeklyReport(reportId: string, clientIdOrData: string | Partial<InsertWeeklyReport>, data?: Partial<InsertWeeklyReport>): Promise<WeeklyReport>;
  getUnreadReportsCount(trainerId: string): Promise<number>;
  markReportAsViewed(reportId: string): Promise<void>;
  
  // Client search - find any client by email
  searchClientByEmail(email: string): Promise<User | undefined>;
  
  // Plan invitation operations
  createInvitation(trainerId: string, data: InsertPlanInvitationInput): Promise<PlanInvitation>;
  getClientInvitations(clientEmail: string): Promise<PlanInvitation[]>;
  acceptInvitation(invitationId: string, clientId: string): Promise<void>;
  rejectInvitation(invitationId: string, clientId: string): Promise<void>;
  getTrainerInvitations(trainerId: string): Promise<PlanInvitation[]>;
  
  // Client relationship operations
  getClientRelationship(trainerId: string, clientId: string): Promise<ClientRelationship | null>;
  hasActiveTrainer(clientId: string): Promise<boolean>;
  getTrainerForClient(clientId: string): Promise<User | null>;
  archiveClientRelationship(trainerId: string, clientId: string): Promise<void>;
  
  // Charity donation operations
  listCharityDonations(): Promise<CharityDonation[]>;
  createCharityDonation(data: InsertCharityDonationInput): Promise<CharityDonation>;
  deleteCharityDonation(id: string): Promise<void>;
  
  // Diet Plans
  createDietPlan(plan: InsertDietPlan): Promise<DietPlan>;
  getDietPlanById(id: string): Promise<DietPlan | null>;
  getTrainerDietPlans(trainerId: string): Promise<DietPlan[]>;
  getClientActiveDietPlan(clientId: string): Promise<DietPlan | null>;
  updateDietPlan(id: string, updates: Partial<InsertDietPlan>): Promise<DietPlan>;
  deleteDietPlan(id: string): Promise<void>;
  
  // Diet Meals
  createDietMeal(meal: InsertDietMeal): Promise<DietMeal>;
  getDietPlanMeals(planId: string): Promise<DietMeal[]>;
  getDietPlanMealsForDay(planId: string, dayOfWeek: number): Promise<DietMeal[]>;
  updateDietMeal(id: string, updates: Partial<InsertDietMeal>): Promise<DietMeal>;
  deleteDietMeal(id: string): Promise<void>;
  deleteDietMealsByPlanId(planId: string): Promise<void>;
  
  // Diet Supplements
  getDietSupplements(dietPlanId: string): Promise<DietSupplement[]>;
  createDietSupplement(data: InsertDietSupplement): Promise<DietSupplement>;
  updateDietSupplement(id: string, data: Partial<InsertDietSupplement>): Promise<DietSupplement>;
  deleteDietSupplement(id: string): Promise<void>;
  
  // Daily Habit Logs
  upsertDailyHabitLog(log: InsertDailyHabitLog): Promise<DailyHabitLog>;
  getDailyHabitLog(clientId: string, planId: string, date: Date): Promise<DailyHabitLog | null>;
  getClientHabitLogs(clientId: string, planId: string, startDate: Date, endDate: Date): Promise<DailyHabitLog[]>;
  
  // Meal Checkmarks
  upsertMealCheckmark(checkmark: { habitLogId: string, mealId: string, completed: boolean }): Promise<MealCheckmark>;
  getHabitLogCheckmarks(habitLogId: string): Promise<MealCheckmark[]>;
  
  // Medical Tests
  createMedicalTest(clientId: string, test: Omit<InsertMedicalTest, 'clientId'>): Promise<MedicalTest>;
  updateMedicalTest(id: string, clientId: string, updates: Partial<Omit<InsertMedicalTest, 'clientId'>>): Promise<MedicalTest>;
  deleteMedicalTest(id: string, clientId: string): Promise<void>;
  getClientMedicalTests(clientId: string): Promise<MedicalTest[]>;
  getMedicalTestById(id: string): Promise<MedicalTest | null>;
  canTrainerAccessClientTests(trainerId: string, clientId: string): Promise<boolean>;
  
  // Client Payments
  getClientPayments(userId: string, role: string): Promise<ClientPayment[]>;
  createPayment(data: InsertClientPayment): Promise<ClientPayment>;
  markPaymentAsPaid(paymentId: string): Promise<void>;
  deletePayment(paymentId: string): Promise<void>;
  getUpcomingPayments(userId: string, role: string): Promise<ClientPayment[]>;

  // Chat Messages
  getConversations(userId: string, role: 'trainer' | 'client'): Promise<Array<{
    partnerId: string;
    partnerName: string;
    partnerAvatar: string | null;
    trainerId: string;
    clientId: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
  }>>;
  getMessages(trainerId: string, clientId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: string): Promise<void>;
  markConversationAsRead(userId: string, partnerId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Referral System
  ensureReferralCode(trainerId: string): Promise<ReferralCode>;
  getReferralCodeByCode(code: string): Promise<ReferralCode | null>;
  getReferralCodeByTrainerId(trainerId: string): Promise<ReferralCode | null>;
  updateReferralCodeLastUsed(codeId: string): Promise<void>;
  createReferralEvent(event: InsertReferralEvent): Promise<ReferralEvent>;
  updateReferralEventMetadata(eventId: string, metadata: any): Promise<void>;
  getTrainerReferralStats(trainerId: string): Promise<{
    totalReferrals: number;
    qualifiedReferrals: number;
    pendingReferrals: number;
    totalBonusDaysEarned: number;
  }>;
  listTrainerReferrals(trainerId: string): Promise<Array<ReferralEvent & { referredUser: User }>>;
  applyReferralBonus(userId: string, bonusDays: number): Promise<void>;
  getPendingReferralEventByUser(userId: string): Promise<ReferralEvent | null>;
  markReferralQualified(eventId: string, bonusDays: number): Promise<boolean>;
  processReferralBonus(eventId: string, bonusDays: number): Promise<boolean>;
  validateReferralEvent(referrerTrainerId: string, referredUserId: string, referredEmail: string, ipAddress?: string, metadata?: any): Promise<{ valid: boolean; reason?: string }>;
  getTrainerBonusesThisYear(trainerId: string): Promise<number>;
  countStripePaymentsByCustomer(stripeCustomerId: string): Promise<number>;

  // Notifications
  createNotification(data: InsertNotification): Promise<Notification>;
  listNotificationsByTrainer(trainerId: string, limit?: number): Promise<Notification[]>;
  markNotificationRead(id: number, trainerId: string): Promise<Notification>;
  markAllNotificationsRead(trainerId: string): Promise<void>;
  getUnreadPayments(): Promise<ClientPayment[]>;

  // Password reset operations
  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User>;

  // Global exercises
  getGlobalExercises(muscleGroup?: string, search?: string): Promise<GlobalExercise[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user;
  }

  async createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt" | "profileImageUrl" | "isAdmin" | "stripeCustomerId" | "stripeSubscriptionId" | "subscriptionStatus" | "subscriptionTier">): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        email: userData.email.toLowerCase(),
        profileImageUrl: null,
      })
      .returning();
    return user;
  }

  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token));
    return user;
  }

  async verifyUserEmail(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordResetToken: token,
        passwordResetTokenExpiresAt: expiresAt,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return user;
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async updateUserSubscription(userId: string, data: { stripeCustomerId?: string | null; stripeSubscriptionId?: string | null; subscriptionStatus?: string | null; subscriptionTier?: string; trialEndsAt?: Date | null; subscriptionCancelledAt?: Date | null }): Promise<User> {
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
  
  // Check if user is in trial period
  isInTrial(user: User): boolean {
    if (!user.trialEndsAt) return false;
    return new Date() < new Date(user.trialEndsAt);
  }
  
  // Get effective client limit considering trial, subscription, and free access
  getEffectiveClientLimit(user: User): number {
    // Map tier to client limit
    const tierLimits: Record<string, number> = {
      start: 3,
      solo: 10,
      pro: 20,
      elite: 35,
      max: 50,
      studio: 9999,
      // Legacy support
      free: 3,
      premium: 50,
    };
    
    // If has free access (granted by admin), return unlimited clients
    if (user.hasFreeAccess) {
      return 9999;
    }
    
    // If in trial, return unlimited clients (9999)
    if (this.isInTrial(user)) {
      return 9999;
    }
    
    // If has active subscription, return limit from plan
    const isActive = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
    if (isActive) {
      const tier = user.subscriptionTier || 'start';
      return tierLimits[tier] || tierLimits.start;
    }
    
    // If no trial and no active subscription, return START limit (3)
    return 3;
  }
  
  async checkTrainerClientLimit(trainerId: string): Promise<{ withinLimit: boolean; currentCount: number; maxCount: number }> {
    const trainer = await this.getUser(trainerId);
    if (!trainer || trainer.role !== 'trainer') {
      throw new Error("Użytkownik nie jest trenerem");
    }
    
    const clients = await this.getTrainerClients(trainerId);
    const currentCount = clients.length;
    
    const maxCount = this.getEffectiveClientLimit(trainer);
    const withinLimit = currentCount < maxCount;
    
    return {
      withinLimit,
      currentCount,
      maxCount: maxCount === 9999 ? -1 : maxCount,
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
    return await db.transaction(async (tx) => {
      const [plan] = await tx
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.id, assignment.planId))
        .limit(1);
      
      if (!plan) {
        throw new Error("Plan nie istnieje");
      }
      
      const [existingRelationship] = await tx
        .select()
        .from(clientRelationships)
        .where(
          and(
            eq(clientRelationships.trainerId, plan.trainerId),
            eq(clientRelationships.clientId, assignment.clientId)
          )
        )
        .limit(1);
      
      if (existingRelationship) {
        if (existingRelationship.status === 'archived') {
          await tx
            .update(clientRelationships)
            .set({ status: 'active', archivedAt: null })
            .where(eq(clientRelationships.id, existingRelationship.id));
        }
      } else {
        await tx
          .insert(clientRelationships)
          .values({
            trainerId: plan.trainerId,
            clientId: assignment.clientId,
            status: 'active',
          });
      }
      
      const [created] = await tx
        .insert(planAssignments)
        .values(assignment)
        .returning();
      return created;
    });
  }

  async createBulkAssignments(planId: string, clientIds: string[]): Promise<PlanAssignment[]> {
    if (clientIds.length === 0) return [];
    
    return await db.transaction(async (tx) => {
      const [plan] = await tx
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.id, planId))
        .limit(1);
      
      if (!plan) {
        throw new Error("Plan nie istnieje");
      }
      
      for (const clientId of clientIds) {
        const [existingRelationship] = await tx
          .select()
          .from(clientRelationships)
          .where(
            and(
              eq(clientRelationships.trainerId, plan.trainerId),
              eq(clientRelationships.clientId, clientId)
            )
          )
          .limit(1);
        
        if (existingRelationship) {
          if (existingRelationship.status === 'archived') {
            await tx
              .update(clientRelationships)
              .set({ status: 'active', archivedAt: null })
              .where(eq(clientRelationships.id, existingRelationship.id));
          }
        } else {
          await tx
            .insert(clientRelationships)
            .values({
              trainerId: plan.trainerId,
              clientId: clientId,
              status: 'active',
            });
        }
        
        // Delete any existing assignments for this client before creating new one
        await tx
          .delete(planAssignments)
          .where(eq(planAssignments.clientId, clientId));
      }
      
      const assignments = clientIds.map((clientId) => ({
        planId,
        clientId,
      }));
      
      return await tx.insert(planAssignments).values(assignments).returning();
    });
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

  async deleteClientAssignment(clientId: string): Promise<void> {
    await db
      .delete(planAssignments)
      .where(eq(planAssignments.clientId, clientId));
  }

  async getTrainerClients(trainerId: string): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(clientRelationships)
      .innerJoin(users, eq(clientRelationships.clientId, users.id))
      .where(
        and(
          eq(clientRelationships.trainerId, trainerId),
          eq(clientRelationships.status, 'active')
        )
      )
      .orderBy(users.firstName, users.lastName);
    
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
  async logExercise(clientId: string, exerciseId: string, data: { reps: number, load?: string, notes?: string, setNumber?: number }): Promise<ExerciseLog> {
    const [log] = await db
      .insert(exerciseLogs)
      .values({
        clientId,
        exerciseId,
        reps: data.reps,
        load: data.load || null,
        notes: data.notes || null,
        setNumber: data.setNumber || 1,
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

  async getAllClientExerciseLogs(clientId: string): Promise<ExerciseLog[]> {
    return await db
      .select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.clientId, clientId))
      .orderBy(desc(exerciseLogs.loggedAt));
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

  async getLatestExerciseLogsBySet(clientId: string, exerciseId: string): Promise<ExerciseLog[]> {
    // Get the latest log for each set number using a subquery approach
    const logs = await db
      .select()
      .from(exerciseLogs)
      .where(
        and(
          eq(exerciseLogs.clientId, clientId),
          eq(exerciseLogs.exerciseId, exerciseId)
        )
      )
      .orderBy(desc(exerciseLogs.loggedAt));
    
    // Group by setNumber and keep only the latest log for each set
    const latestBySet = new Map<number, typeof logs[0]>();
    for (const log of logs) {
      const setNum = log.setNumber || 1;
      if (!latestBySet.has(setNum)) {
        latestBySet.set(setNum, log);
      }
    }
    
    // Return as array sorted by set number
    return Array.from(latestBySet.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, log]) => log);
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
    // Sprawdź czy istnieje aktywna relacja trener-podopieczny
    const [relationship] = await db
      .select()
      .from(clientRelationships)
      .where(
        and(
          eq(clientRelationships.trainerId, trainerId),
          eq(clientRelationships.clientId, clientId),
          eq(clientRelationships.status, 'active')
        )
      )
      .limit(1);
    
    if (!relationship) {
      throw new Error("Brak aktywnej relacji z tym podopiecznym");
    }
    
    // Pobierz raporty podopiecznego
    return await db
      .select()
      .from(weeklyReports)
      .where(eq(weeklyReports.clientId, clientId))
      .orderBy(desc(weeklyReports.reportDate));
  }

  async getWeeklyReport(reportId: string, clientId?: string): Promise<WeeklyReport | undefined> {
    if (clientId) {
      // With ownership check - only return report if it belongs to this client
      const [report] = await db
        .select()
        .from(weeklyReports)
        .where(and(
          eq(weeklyReports.id, reportId),
          eq(weeklyReports.clientId, clientId)
        ))
        .limit(1);
      return report;
    } else {
      // Without ownership check (for internal use)
      const [report] = await db
        .select()
        .from(weeklyReports)
        .where(eq(weeklyReports.id, reportId))
        .limit(1);
      return report;
    }
  }

  async getWeeklyReportById(reportId: string): Promise<WeeklyReport | null> {
    const [report] = await db
      .select()
      .from(weeklyReports)
      .where(eq(weeklyReports.id, reportId))
      .limit(1);
    return report || null;
  }

  async updateWeeklyReport(
    reportId: string,
    clientIdOrData: string | Partial<InsertWeeklyReport>,
    data?: Partial<InsertWeeklyReport>
  ): Promise<WeeklyReport> {
    let actualClientId: string | undefined;
    let actualData: Partial<InsertWeeklyReport>;
    
    if (typeof clientIdOrData === 'string') {
      // New signature: updateWeeklyReport(id, clientId, data)
      actualClientId = clientIdOrData;
      actualData = data!;
    } else {
      // Old signature: updateWeeklyReport(id, data)
      actualData = clientIdOrData;
    }
    
    if (actualClientId) {
      // With ownership check
      const [report] = await db
        .update(weeklyReports)
        .set({ ...actualData, updatedAt: new Date() })
        .where(and(
          eq(weeklyReports.id, reportId),
          eq(weeklyReports.clientId, actualClientId)
        ))
        .returning();
      
      if (!report) {
        throw new Error("Report not found or not owned by client");
      }
      
      return report;
    } else {
      // Without ownership check (for internal use)
      const [report] = await db
        .update(weeklyReports)
        .set({ ...actualData, updatedAt: new Date() })
        .where(eq(weeklyReports.id, reportId))
        .returning();
      
      if (!report) {
        throw new Error("Report not found");
      }
      
      return report;
    }
  }

  async getUnreadReportsCount(trainerId: string): Promise<number> {
    // Get all active clients for this trainer
    const clients = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(
        clientRelationships,
        and(
          eq(clientRelationships.clientId, users.id),
          eq(clientRelationships.trainerId, trainerId),
          eq(clientRelationships.status, 'active')
        )
      );
    
    if (clients.length === 0) {
      return 0;
    }
    
    const clientIds = clients.map(c => c.id);
    
    // Count unread reports for these clients
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(weeklyReports)
      .where(
        and(
          inArray(weeklyReports.clientId, clientIds),
          eq(weeklyReports.viewedByTrainer, false)
        )
      );
    
    return result?.count || 0;
  }

  async markReportAsViewed(reportId: string): Promise<void> {
    await db
      .update(weeklyReports)
      .set({ viewedByTrainer: true })
      .where(eq(weeklyReports.id, reportId));
  }

  // Client search - find any client by email
  async searchClientByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          sql`LOWER(${users.email}) = LOWER(${email})`,
          eq(users.role, "client")
        )
      )
      .limit(1);
    
    return user;
  }
  
  // Plan invitation operations
  async createInvitation(trainerId: string, data: InsertPlanInvitationInput): Promise<PlanInvitation> {
    const clientEmail = data.clientEmail.toLowerCase();
    const { planId } = data;
    
    // Zaproszenie może być wysłane do dowolnego emaila - osoba nie musi być jeszcze zarejestrowana
    
    // Jeśli planId podane, waliduj że plan istnieje i należy do trenera
    if (planId) {
      const plan = await this.getTrainingPlan(planId);
      if (!plan) {
        throw new Error("Plan treningowy nie istnieje");
      }
      if (plan.trainerId !== trainerId) {
        throw new Error("Ten plan nie należy do tego trenera");
      }
      
      // Sprawdź czy już nie ma takiego zaproszenia (z tym samym planem)
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
    } else {
      // Jeśli brak planId, sprawdź czy nie ma już zaproszenia bez planu
      const [existingInvitation] = await db
        .select()
        .from(planInvitations)
        .where(
          and(
            eq(planInvitations.clientEmail, clientEmail),
            isNull(planInvitations.planId),
            eq(planInvitations.status, "pending")
          )
        )
        .limit(1);
      
      if (existingInvitation) {
        throw new Error("Aktywne zaproszenie dla tego podopiecznego już istnieje");
      }
    }
    
    const [invitation] = await db
      .insert(planInvitations)
      .values({
        trainerId,
        clientEmail,
        planId: planId || null,
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
          sql`LOWER(${planInvitations.clientEmail}) = LOWER(${clientEmail})`,
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
      if (!client || client.email.toLowerCase() !== invitation.clientEmail.toLowerCase()) {
        throw new Error("Nie masz uprawnień do akceptacji tego zaproszenia");
      }
      
      // 1. Utwórz lub aktywuj relację trener-podopieczny
      const [existingRelationship] = await tx
        .select()
        .from(clientRelationships)
        .where(
          and(
            eq(clientRelationships.trainerId, invitation.trainerId),
            eq(clientRelationships.clientId, clientId)
          )
        )
        .limit(1);
      
      let newRelationshipCreated = false;
      if (existingRelationship) {
        // Jeśli relacja istnieje ale jest archived, reaktywuj ją
        if (existingRelationship.status === 'archived') {
          await tx
            .update(clientRelationships)
            .set({ status: 'active', archivedAt: null })
            .where(eq(clientRelationships.id, existingRelationship.id));
          newRelationshipCreated = true;
        }
      } else {
        // Utwórz nową relację
        await tx
          .insert(clientRelationships)
          .values({
            trainerId: invitation.trainerId,
            clientId: clientId,
            status: 'active',
          });
        newRelationshipCreated = true;
      }
      
      // 2. Jeśli zaproszenie zawiera planId, przypisz plan
      if (invitation.planId) {
        const [existingAssignment] = await tx
          .select()
          .from(planAssignments)
          .where(eq(planAssignments.clientId, clientId))
          .limit(1);
        
        // Jeśli klient ma już przypisany ten sam plan, pomiń
        if (existingAssignment && existingAssignment.planId === invitation.planId) {
          // Plan już przypisany, nic nie rób
        } else {
          // Usuń stare przypisanie jeśli istnieje
          if (existingAssignment) {
            await tx
              .delete(planAssignments)
              .where(eq(planAssignments.clientId, clientId));
          }
          
          // Dodaj nowe przypisanie
          await tx
            .insert(planAssignments)
            .values({
              planId: invitation.planId,
              clientId: clientId,
            });
        }
      }
      
      // 3. Zaktualizuj status zaproszenia
      await tx
        .update(planInvitations)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(planInvitations.id, invitationId));
      
      // 4. Odrzuć wszystkie inne pending zaproszenia dla tego klienta od tego trenera
      await tx
        .update(planInvitations)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(
          and(
            eq(planInvitations.clientEmail, invitation.clientEmail),
            eq(planInvitations.trainerId, invitation.trainerId),
            eq(planInvitations.status, "pending")
          )
        );

      // T6: Check for referral bonus eligibility (client qualifies when accepting invitation)
      if (newRelationshipCreated) {
        try {
          const referralEvent = await this.getPendingReferralEventByUser(clientId);
          if (referralEvent) {
            console.log(`[REFERRAL] Found pending referral event for client ${clientId}, processing bonus...`);
            
            // ATOMIC: Process bonus in transaction (mark + apply bonus together)
            const success = await this.processReferralBonus(referralEvent.id, 30);
            if (success) {
              // Notify referrer (outside transaction - non-critical)
              try {
                this.notifyReferralBonus(
                  referralEvent.referrerTrainerId,
                  30,
                  `${client.firstName} ${client.lastName}`
                );
              } catch (notifyError) {
                console.error('[REFERRAL] Error sending notification (bonus already granted):', notifyError);
              }
            } else {
              console.log(`[REFERRAL] Event ${referralEvent.id} was already processed, skipping bonus (race condition avoided)`);
            }
          }
        } catch (error) {
          console.error('[REFERRAL] Error processing referral bonus on invitation acceptance:', error);
        }
      }
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
    if (!client || client.email.toLowerCase() !== invitation.clientEmail.toLowerCase()) {
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
  
  // Client relationship operations
  async getClientRelationship(trainerId: string, clientId: string): Promise<ClientRelationship | null> {
    const [relationship] = await db
      .select()
      .from(clientRelationships)
      .where(
        and(
          eq(clientRelationships.trainerId, trainerId),
          eq(clientRelationships.clientId, clientId),
          eq(clientRelationships.status, 'active') // CRITICAL: Only active relationships
        )
      )
      .limit(1);
    return relationship || null;
  }

  async hasActiveTrainer(clientId: string): Promise<boolean> {
    const [relationship] = await db
      .select()
      .from(clientRelationships)
      .where(
        and(
          eq(clientRelationships.clientId, clientId),
          eq(clientRelationships.status, 'active')
        )
      )
      .limit(1);
    return !!relationship;
  }

  async getTrainerForClient(clientId: string): Promise<User | null> {
    const [relationship] = await db
      .select({
        trainer: users,
      })
      .from(clientRelationships)
      .innerJoin(users, eq(clientRelationships.trainerId, users.id))
      .where(
        and(
          eq(clientRelationships.clientId, clientId),
          eq(clientRelationships.status, 'active')
        )
      )
      .limit(1);
    
    return relationship?.trainer || null;
  }

  async archiveClientRelationship(trainerId: string, clientId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Znajdź aktywną relację
      const [relationship] = await tx
        .select()
        .from(clientRelationships)
        .where(
          and(
            eq(clientRelationships.trainerId, trainerId),
            eq(clientRelationships.clientId, clientId),
            eq(clientRelationships.status, 'active')
          )
        )
        .limit(1);
      
      if (!relationship) {
        throw new Error("Nie znaleziono aktywnej relacji z tym podopiecznym");
      }
      
      // 2. Archiwizuj relację
      await tx
        .update(clientRelationships)
        .set({ 
          status: 'archived',
          archivedAt: new Date()
        })
        .where(eq(clientRelationships.id, relationship.id));
      
      // 3. Usuń przypisanie planu (jeśli istnieje)
      await tx
        .delete(planAssignments)
        .where(eq(planAssignments.clientId, clientId));
    });
  }
  
  // Charity donation operations
  async listCharityDonations(): Promise<CharityDonation[]> {
    return await db
      .select()
      .from(charityDonations)
      .orderBy(desc(charityDonations.year), desc(charityDonations.month));
  }
  
  async createCharityDonation(data: InsertCharityDonationInput): Promise<CharityDonation> {
    const [donation] = await db
      .insert(charityDonations)
      .values(data)
      .returning();
    return donation;
  }
  
  async deleteCharityDonation(id: string): Promise<void> {
    await db
      .delete(charityDonations)
      .where(eq(charityDonations.id, id));
  }
  
  // Diet Plans
  async createDietPlan(plan: InsertDietPlan): Promise<DietPlan> {
    const [dietPlan] = await db
      .insert(dietPlans)
      .values(plan)
      .returning();
    return dietPlan;
  }
  
  async getDietPlanById(id: string): Promise<DietPlan | null> {
    const [plan] = await db
      .select()
      .from(dietPlans)
      .where(eq(dietPlans.id, id))
      .limit(1);
    return plan || null;
  }
  
  async getTrainerDietPlans(trainerId: string): Promise<DietPlan[]> {
    return await db
      .select()
      .from(dietPlans)
      .where(eq(dietPlans.trainerId, trainerId))
      .orderBy(desc(dietPlans.createdAt));
  }
  
  async getClientActiveDietPlan(clientId: string): Promise<DietPlan | null> {
    const [plan] = await db
      .select()
      .from(dietPlans)
      .where(
        and(
          eq(dietPlans.clientId, clientId),
          eq(dietPlans.status, 'active')
        )
      )
      .orderBy(desc(dietPlans.createdAt))
      .limit(1);
    return plan || null;
  }
  
  async updateDietPlan(id: string, updates: Partial<InsertDietPlan>): Promise<DietPlan> {
    const [plan] = await db
      .update(dietPlans)
      .set(updates)
      .where(eq(dietPlans.id, id))
      .returning();
    return plan;
  }
  
  async deleteDietPlan(id: string): Promise<void> {
    await db
      .delete(dietPlans)
      .where(eq(dietPlans.id, id));
  }
  
  // Diet Meals
  async createDietMeal(meal: InsertDietMeal): Promise<DietMeal> {
    const [dietMeal] = await db
      .insert(dietMeals)
      .values(meal)
      .returning();
    return dietMeal;
  }
  
  async getDietPlanMeals(planId: string): Promise<DietMeal[]> {
    return await db
      .select()
      .from(dietMeals)
      .where(eq(dietMeals.planId, planId))
      .orderBy(asc(dietMeals.dayOfWeek), asc(dietMeals.orderIndex));
  }
  
  async getDietPlanMealsForDay(planId: string, dayOfWeek: number): Promise<DietMeal[]> {
    return await db
      .select()
      .from(dietMeals)
      .where(
        and(
          eq(dietMeals.planId, planId),
          eq(dietMeals.dayOfWeek, dayOfWeek)
        )
      )
      .orderBy(asc(dietMeals.orderIndex));
  }
  
  async updateDietMeal(id: string, updates: Partial<InsertDietMeal>): Promise<DietMeal> {
    const [meal] = await db
      .update(dietMeals)
      .set(updates)
      .where(eq(dietMeals.id, id))
      .returning();
    return meal;
  }
  
  async deleteDietMeal(id: string): Promise<void> {
    await db
      .delete(dietMeals)
      .where(eq(dietMeals.id, id));
  }
  
  async deleteDietMealsByPlanId(planId: string): Promise<void> {
    await db
      .delete(dietMeals)
      .where(eq(dietMeals.planId, planId));
  }
  
  // Diet Supplements
  async getDietSupplements(dietPlanId: string): Promise<DietSupplement[]> {
    return await db
      .select()
      .from(dietSupplements)
      .where(eq(dietSupplements.dietPlanId, dietPlanId))
      .orderBy(asc(dietSupplements.orderIndex));
  }
  
  async createDietSupplement(data: InsertDietSupplement): Promise<DietSupplement> {
    const [supplement] = await db
      .insert(dietSupplements)
      .values(data)
      .returning();
    return supplement;
  }
  
  async updateDietSupplement(id: string, data: Partial<InsertDietSupplement>): Promise<DietSupplement> {
    const [supplement] = await db
      .update(dietSupplements)
      .set(data)
      .where(eq(dietSupplements.id, id))
      .returning();
    return supplement;
  }
  
  async deleteDietSupplement(id: string): Promise<void> {
    await db
      .delete(dietSupplements)
      .where(eq(dietSupplements.id, id));
  }
  
  // Daily Habit Logs
  async upsertDailyHabitLog(log: InsertDailyHabitLog): Promise<DailyHabitLog> {
    const [habitLog] = await db
      .insert(dailyHabitLogs)
      .values(log)
      .onConflictDoUpdate({
        target: [dailyHabitLogs.clientId, dailyHabitLogs.planId, dailyHabitLogs.date],
        set: {
          waterLiters: log.waterLiters,
          hitCalories: log.hitCalories,
          hitProtein: log.hitProtein,
          hitFat: log.hitFat,
          hitCarbs: log.hitCarbs,
        },
      })
      .returning();
    return habitLog;
  }
  
  async getDailyHabitLog(clientId: string, planId: string, date: Date): Promise<DailyHabitLog | null> {
    const [log] = await db
      .select()
      .from(dailyHabitLogs)
      .where(
        and(
          eq(dailyHabitLogs.clientId, clientId),
          eq(dailyHabitLogs.planId, planId),
          eq(dailyHabitLogs.date, date.toISOString().split('T')[0])
        )
      )
      .limit(1);
    return log || null;
  }
  
  async getClientHabitLogs(clientId: string, planId: string, startDate: Date, endDate: Date): Promise<DailyHabitLog[]> {
    return await db
      .select()
      .from(dailyHabitLogs)
      .where(
        and(
          eq(dailyHabitLogs.clientId, clientId),
          eq(dailyHabitLogs.planId, planId),
          gte(dailyHabitLogs.date, startDate.toISOString().split('T')[0]),
          lte(dailyHabitLogs.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(asc(dailyHabitLogs.date));
  }
  
  // Meal Checkmarks
  async upsertMealCheckmark(checkmark: { habitLogId: string, mealId: string, completed: boolean }): Promise<MealCheckmark> {
    const [mealCheckmark] = await db
      .insert(mealCheckmarks)
      .values({
        habitLogId: checkmark.habitLogId,
        mealId: checkmark.mealId,
        completed: checkmark.completed,
        completedAt: checkmark.completed ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [mealCheckmarks.habitLogId, mealCheckmarks.mealId],
        set: {
          completed: checkmark.completed,
          completedAt: checkmark.completed ? new Date() : null,
        },
      })
      .returning();
    return mealCheckmark;
  }
  
  async getHabitLogCheckmarks(habitLogId: string): Promise<MealCheckmark[]> {
    return await db
      .select()
      .from(mealCheckmarks)
      .where(eq(mealCheckmarks.habitLogId, habitLogId));
  }
  
  // Medical Tests
  async createMedicalTest(clientId: string, test: Omit<InsertMedicalTest, 'clientId'>): Promise<MedicalTest> {
    const [newTest] = await db
      .insert(medicalTests)
      .values({
        ...test,
        clientId,
      })
      .returning();
    return newTest;
  }
  
  async updateMedicalTest(id: string, clientId: string, updates: Partial<Omit<InsertMedicalTest, 'clientId'>>): Promise<MedicalTest> {
    const [updatedTest] = await db
      .update(medicalTests)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(
        eq(medicalTests.id, id),
        eq(medicalTests.clientId, clientId)
      ))
      .returning();
    
    if (!updatedTest) {
      throw new Error("Test not found or unauthorized");
    }
    
    return updatedTest;
  }
  
  async deleteMedicalTest(id: string, clientId: string): Promise<void> {
    await db
      .delete(medicalTests)
      .where(and(
        eq(medicalTests.id, id),
        eq(medicalTests.clientId, clientId)
      ));
  }
  
  async getClientMedicalTests(clientId: string): Promise<MedicalTest[]> {
    return await db
      .select()
      .from(medicalTests)
      .where(eq(medicalTests.clientId, clientId))
      .orderBy(desc(medicalTests.testDate));
  }
  
  async getMedicalTestById(id: string): Promise<MedicalTest | null> {
    const [test] = await db
      .select()
      .from(medicalTests)
      .where(eq(medicalTests.id, id))
      .limit(1);
    return test || null;
  }
  
  async canTrainerAccessClientTests(trainerId: string, clientId: string): Promise<boolean> {
    const [relationship] = await db
      .select()
      .from(clientRelationships)
      .where(and(
        eq(clientRelationships.trainerId, trainerId),
        eq(clientRelationships.clientId, clientId),
        eq(clientRelationships.status, "active")
      ))
      .limit(1);
    return !!relationship;
  }
  
  // Client Payments
  async getClientPayments(userId: string, role: string): Promise<ClientPayment[]> {
    if (role === 'trainer') {
      return await db
        .select()
        .from(clientPayments)
        .where(eq(clientPayments.trainerId, userId))
        .orderBy(asc(clientPayments.dueDate));
    } else {
      return await db
        .select()
        .from(clientPayments)
        .where(eq(clientPayments.clientId, userId))
        .orderBy(asc(clientPayments.dueDate));
    }
  }
  
  async createPayment(data: InsertClientPayment): Promise<ClientPayment> {
    const [payment] = await db
      .insert(clientPayments)
      .values(data)
      .returning();
    return payment;
  }
  
  async markPaymentAsPaid(paymentId: string): Promise<void> {
    // Get the payment to check if it's recurring
    const [payment] = await db
      .select()
      .from(clientPayments)
      .where(eq(clientPayments.id, paymentId))
      .limit(1);

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Mark current payment as paid
    await db
      .update(clientPayments)
      .set({ 
        isPaid: true, 
        paidAt: new Date(),
        lastRecurringCreatedAt: payment.isRecurring ? new Date() : null,
      })
      .where(eq(clientPayments.id, paymentId));

    // If recurring, create next month's payment based on the current payment's due date
    if (payment.isRecurring && payment.recurringAmount && payment.recurringDayOfMonth) {
      // Calculate next due date based on the CURRENT payment's due date, not today
      // Reset to first of month before adding month to avoid day overflow (e.g., Jan 31 + 1 month = Mar 3)
      const currentDueDate = new Date(payment.dueDate);
      const nextDueDate = new Date(currentDueDate.getFullYear(), currentDueDate.getMonth() + 1, payment.recurringDayOfMonth, 0, 0, 0, 0);

      // Check if there's already an unpaid recurring payment for this client with the EXACT same due date
      // This prevents duplicates while allowing multiple different payment schedules
      const existingNextPayment = await db
        .select()
        .from(clientPayments)
        .where(
          and(
            eq(clientPayments.clientId, payment.clientId),
            eq(clientPayments.trainerId, payment.trainerId),
            eq(clientPayments.isRecurring, true),
            eq(clientPayments.isPaid, false),
            eq(clientPayments.dueDate, nextDueDate),
            eq(clientPayments.recurringAmount, payment.recurringAmount)
          )
        )
        .limit(1);

      // Only create new payment if there's no pending recurring payment with same date and amount
      if (existingNextPayment.length === 0) {
        await db
          .insert(clientPayments)
          .values({
            clientId: payment.clientId,
            trainerId: payment.trainerId,
            amount: payment.recurringAmount,
            dueDate: nextDueDate,
            isPaid: false,
            notes: null,
            isRecurring: true,
            recurringAmount: payment.recurringAmount,
            recurringDayOfMonth: payment.recurringDayOfMonth,
          });
      }
    }
  }
  
  async deletePayment(paymentId: string): Promise<void> {
    await db
      .delete(clientPayments)
      .where(eq(clientPayments.id, paymentId));
  }
  
  async getUpcomingPayments(userId: string, role: string): Promise<ClientPayment[]> {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    if (role === 'trainer') {
      return await db
        .select()
        .from(clientPayments)
        .where(
          and(
            eq(clientPayments.trainerId, userId),
            eq(clientPayments.isPaid, false),
            lte(clientPayments.dueDate, sevenDaysFromNow)
          )
        )
        .orderBy(asc(clientPayments.dueDate));
    } else {
      return await db
        .select()
        .from(clientPayments)
        .where(
          and(
            eq(clientPayments.clientId, userId),
            eq(clientPayments.isPaid, false),
            lte(clientPayments.dueDate, sevenDaysFromNow)
          )
        )
        .orderBy(asc(clientPayments.dueDate));
    }
  }

  // Chat Messages
  async getConversations(userId: string, role: 'trainer' | 'client'): Promise<Array<{
    partnerId: string;
    partnerName: string;
    partnerAvatar: string | null;
    trainerId: string;
    clientId: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
  }>> {
    if (role === 'trainer') {
      // Trainer sees all their clients
      const clients = await this.getTrainerClients(userId);
      
      const conversations = await Promise.all(
        clients.map(async (client) => {
          // Get last message
          const [lastMsg] = await db
            .select()
            .from(messages)
            .where(
              and(
                eq(messages.trainerId, userId),
                eq(messages.clientId, client.id)
              )
            )
            .orderBy(desc(messages.createdAt))
            .limit(1);

          // Get unread count (messages sent by client to trainer that are unread)
          const unreadResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(messages)
            .where(
              and(
                eq(messages.trainerId, userId),
                eq(messages.clientId, client.id),
                eq(messages.senderId, client.id),
                isNull(messages.readAt)
              )
            );

          return {
            partnerId: client.id,
            partnerName: `${client.firstName} ${client.lastName}`,
            partnerAvatar: (client as any).profileImageDisplayUrl || client.profileImageUrl,
            trainerId: userId,
            clientId: client.id,
            lastMessage: lastMsg?.body || null,
            lastMessageAt: lastMsg?.createdAt || null,
            unreadCount: unreadResult[0]?.count || 0,
          };
        })
      );

      return conversations.sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
      });
    } else {
      // Client sees only their trainer
      const trainer = await this.getTrainerForClient(userId);
      if (!trainer) return [];

      const [lastMsg] = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.trainerId, trainer.id),
            eq(messages.clientId, userId)
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const unreadResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.trainerId, trainer.id),
            eq(messages.clientId, userId),
            eq(messages.senderId, trainer.id),
            isNull(messages.readAt)
          )
        );

      return [{
        partnerId: trainer.id,
        partnerName: `${trainer.firstName} ${trainer.lastName}`,
        partnerAvatar: (trainer as any).profileImageDisplayUrl || trainer.profileImageUrl,
        trainerId: trainer.id,
        clientId: userId,
        lastMessage: lastMsg?.body || null,
        lastMessageAt: lastMsg?.createdAt || null,
        unreadCount: unreadResult[0]?.count || 0,
      }];
    }
  }

  async getMessages(trainerId: string, clientId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.trainerId, trainerId),
          eq(messages.clientId, clientId)
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(data)
      .returning();
    return message;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, messageId));
  }

  async markConversationAsRead(userId: string, partnerId: string): Promise<void> {
    // Mark all unread messages where userId is the recipient
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.recipientId, userId),
          eq(messages.senderId, partnerId),
          isNull(messages.readAt)
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          eq(messages.recipientId, userId),
          isNull(messages.readAt)
        )
      );

    return result[0]?.count || 0;
  }

  // Referral System Implementation
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async ensureReferralCode(trainerId: string): Promise<ReferralCode> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await this.getReferralCodeByTrainerId(trainerId);
      if (existing) {
        return existing;
      }

      const code = this.generateReferralCode();
      
      const result = await db
        .insert(referralCodes)
        .values({ trainerId, code })
        .onConflictDoNothing()
        .returning();

      if (result.length > 0) {
        return result[0];
      }

      attempts++;
    }

    const finalCheck = await this.getReferralCodeByTrainerId(trainerId);
    if (finalCheck) {
      return finalCheck;
    }

    throw new Error('Failed to generate unique referral code after multiple attempts');
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | null> {
    const [referralCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, code));
    return referralCode || null;
  }

  async getReferralCodeByTrainerId(trainerId: string): Promise<ReferralCode | null> {
    const [referralCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.trainerId, trainerId));
    return referralCode || null;
  }

  async updateReferralCodeLastUsed(codeId: string): Promise<void> {
    await db
      .update(referralCodes)
      .set({ lastUsedAt: new Date() })
      .where(eq(referralCodes.id, codeId));
  }

  async createReferralEvent(event: InsertReferralEvent): Promise<ReferralEvent> {
    const [newEvent] = await db
      .insert(referralEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateReferralEventMetadata(eventId: string, metadata: any): Promise<void> {
    await db
      .update(referralEvents)
      .set({ metadata })
      .where(eq(referralEvents.id, eventId));
  }

  async getTrainerReferralStats(trainerId: string): Promise<{
    totalReferrals: number;
    qualifiedReferrals: number;
    pendingReferrals: number;
    totalBonusDaysEarned: number;
  }> {
    const referralCode = await this.getReferralCodeByTrainerId(trainerId);
    if (!referralCode) {
      return {
        totalReferrals: 0,
        qualifiedReferrals: 0,
        pendingReferrals: 0,
        totalBonusDaysEarned: 0,
      };
    }

    const events = await db
      .select()
      .from(referralEvents)
      .where(eq(referralEvents.referrerTrainerId, trainerId));

    const totalReferrals = events.length;
    const bonusGrantedEvents = events.filter(e => e.status === 'bonus_granted');
    const qualifiedReferrals = bonusGrantedEvents.length;
    const pendingReferrals = events.filter(e => e.status === 'pending').length;
    const totalBonusDaysEarned = bonusGrantedEvents.length * 30;

    return {
      totalReferrals,
      qualifiedReferrals,
      pendingReferrals,
      totalBonusDaysEarned,
    };
  }

  async listTrainerReferrals(trainerId: string): Promise<Array<ReferralEvent & { referredUser: User }>> {
    const results = await db
      .select()
      .from(referralEvents)
      .innerJoin(users, eq(referralEvents.referredUserId, users.id))
      .where(eq(referralEvents.referrerTrainerId, trainerId))
      .orderBy(desc(referralEvents.createdAt));

    return results.map(row => ({
      id: row.referral_events.id,
      referralCodeId: row.referral_events.referralCodeId,
      referrerTrainerId: row.referral_events.referrerTrainerId,
      referredUserId: row.referral_events.referredUserId,
      referredRole: row.referral_events.referredRole,
      status: row.referral_events.status,
      qualifiedAt: row.referral_events.qualifiedAt,
      bonusGrantedAt: row.referral_events.bonusGrantedAt,
      createdAt: row.referral_events.createdAt,
      metadata: row.referral_events.metadata,
      referredUser: row.users,
    }));
  }

  async applyReferralBonus(userId: string, bonusDays: number): Promise<void> {
    if (bonusDays <= 0) {
      throw new Error('Bonus days must be positive');
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'trainer') {
      throw new Error('Only trainers can receive referral bonuses');
    }

    await db
      .update(users)
      .set({
        referralBonusDays: sql`COALESCE(${users.referralBonusDays}, 0) + ${bonusDays}`,
        trialEndsAt: sql`CASE 
          WHEN ${users.trialEndsAt} IS NULL THEN NOW() + INTERVAL '${sql.raw(bonusDays.toString())} days'
          WHEN ${users.trialEndsAt} > NOW() THEN ${users.trialEndsAt} + INTERVAL '${sql.raw(bonusDays.toString())} days'
          ELSE NOW() + INTERVAL '${sql.raw(bonusDays.toString())} days'
        END`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getPendingReferralEventByUser(userId: string): Promise<ReferralEvent | null> {
    const [event] = await db
      .select()
      .from(referralEvents)
      .where(
        and(
          eq(referralEvents.referredUserId, userId),
          eq(referralEvents.status, 'pending')
        )
      )
      .limit(1);
    
    return event || null;
  }

  async markReferralQualified(eventId: string, bonusDays: number): Promise<boolean> {
    const now = new Date();
    const result = await db
      .update(referralEvents)
      .set({
        status: 'bonus_granted',
        qualifiedAt: now,
        bonusGrantedAt: now,
      })
      .where(
        and(
          eq(referralEvents.id, eventId),
          eq(referralEvents.status, 'pending')
        )
      )
      .returning({ id: referralEvents.id, referrerTrainerId: referralEvents.referrerTrainerId });

    const wasMarked = result.length > 0;
    
    if (wasMarked) {
      console.log(`[REFERRAL] Marked event ${eventId} as bonus_granted, granting ${bonusDays} days to trainer ${result[0].referrerTrainerId}`);
    } else {
      console.log(`[REFERRAL] Event ${eventId} was already processed or not pending, skipping (idempotent)`);
    }
    
    return wasMarked;
  }

  async processReferralBonus(eventId: string, bonusDays: number): Promise<boolean> {
    if (bonusDays <= 0) {
      throw new Error('Bonus days must be positive');
    }

    const result = await db.transaction(async (tx) => {
      const now = new Date();
      
      // Step 1: Atomic mark (only if pending)
      const [event] = await tx
        .update(referralEvents)
        .set({
          status: 'bonus_granted',
          qualifiedAt: now,
          bonusGrantedAt: now,
        })
        .where(
          and(
            eq(referralEvents.id, eventId),
            eq(referralEvents.status, 'pending')
          )
        )
        .returning();

      if (!event) {
        console.log(`[REFERRAL] Event ${eventId} was already processed or not pending, skipping (idempotent)`);
        return { success: false, event: null };
      }

      // Step 1.5: SECURITY - Re-validate event before granting bonus (defense in depth)
      const [referredUser] = await tx.select().from(users).where(eq(users.id, event.referredUserId));
      if (referredUser) {
        const validation = await this.validateReferralEvent(
          event.referrerTrainerId,
          event.referredUserId,
          referredUser.email,
          (event.metadata as any)?.ipAddress,
          event.metadata
        );

        if (!validation.valid) {
          console.error(`[SECURITY] Referral validation failed for event ${eventId} during bonus processing: ${validation.reason}`);
          // Rollback the status change
          await tx
            .update(referralEvents)
            .set({ status: 'pending' })
            .where(eq(referralEvents.id, eventId));
          throw new Error(`Referral validation failed: ${validation.reason}`);
        }
      }

      // Step 2: Apply bonus to REFERRER (polecający trener - zawsze dostaje bonus)
      await tx
        .update(users)
        .set({
          referralBonusDays: sql`COALESCE(${users.referralBonusDays}, 0) + ${bonusDays}`,
          trialEndsAt: sql`CASE 
            WHEN ${users.trialEndsAt} IS NULL THEN NOW() + INTERVAL '${sql.raw(bonusDays.toString())} days'
            WHEN ${users.trialEndsAt} > NOW() THEN ${users.trialEndsAt} + INTERVAL '${sql.raw(bonusDays.toString())} days'
            ELSE NOW() + INTERVAL '${sql.raw(bonusDays.toString())} days'
          END`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, event.referrerTrainerId));

      // Step 3: Apply bonus to REFERRED user ONLY if they are a trainer (klienci nie płacą więc bonus nie ma dla nich sensu)
      await tx
        .update(users)
        .set({
          referralBonusDays: sql`COALESCE(${users.referralBonusDays}, 0) + ${bonusDays}`,
          trialEndsAt: sql`CASE 
            WHEN ${users.trialEndsAt} IS NULL THEN NOW() + INTERVAL '${sql.raw(bonusDays.toString())} days'
            WHEN ${users.trialEndsAt} > NOW() THEN ${users.trialEndsAt} + INTERVAL '${sql.raw(bonusDays.toString())} days'
            ELSE NOW() + INTERVAL '${sql.raw(bonusDays.toString())} days'
          END`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(users.id, event.referredUserId),
            eq(users.role, 'trainer')
          )
        );

      const logMessage = event.referredRole === 'trainer' 
        ? `[REFERRAL] Successfully processed bonus for event ${eventId}, granting ${bonusDays} days to BOTH referrer ${event.referrerTrainerId} AND referred trainer ${event.referredUserId}`
        : `[REFERRAL] Successfully processed bonus for event ${eventId}, granting ${bonusDays} days to referrer ${event.referrerTrainerId} (referred user is client, no bonus)`;
      console.log(logMessage);
      return { success: true, event };
    });

    return result.success;
  }

  notifyReferralBonus(trainerId: string, bonusDays: number, referredUserName: string): void {
    console.log(`[REFERRAL BONUS] Trainer ${trainerId} earned ${bonusDays} bonus days from referral: ${referredUserName}`);
  }

  async validateReferralEvent(referrerTrainerId: string, referredUserId: string, referredEmail: string, ipAddress?: string, metadata?: any): Promise<{ valid: boolean; reason?: string }> {
    // SECURITY CHECK 1: Prevent self-referral
    if (referrerTrainerId === referredUserId) {
      return { valid: false, reason: 'Nie możesz polecić sam siebie' };
    }

    // SECURITY CHECK 2: Check annual limit (5 bonuses per year)
    const bonusesThisYear = await this.getTrainerBonusesThisYear(referrerTrainerId);
    if (bonusesThisYear >= 5) {
      return { valid: false, reason: 'Przekroczono roczny limit bonusów (5 bonusów rocznie)' };
    }

    // SECURITY CHECK 3: Check for duplicate IP address
    if (ipAddress) {
      const existingEventsWithSameIP = await db
        .select()
        .from(referralEvents)
        .where(
          and(
            eq(referralEvents.referrerTrainerId, referrerTrainerId),
            sql`${referralEvents.metadata}->>'ipAddress' = ${ipAddress}`
          )
        );

      if (existingEventsWithSameIP.length > 0) {
        console.warn(`[SECURITY] Duplicate IP address detected for referral: ${ipAddress}`);
        return { valid: false, reason: 'Wykryto podejrzaną aktywność - duplikat adresu IP' };
      }
    }

    // SECURITY CHECK 4: Check for duplicate email hash
    const emailHash = require('crypto').createHash('sha256').update(referredEmail.toLowerCase()).digest('hex');
    const existingEventsWithSameEmail = await db
      .select()
      .from(referralEvents)
      .where(
        and(
          eq(referralEvents.referrerTrainerId, referrerTrainerId),
          sql`${referralEvents.metadata}->>'emailHash' = ${emailHash}`
        )
      );

    if (existingEventsWithSameEmail.length > 0) {
      console.warn(`[SECURITY] Duplicate email hash detected for referral: ${emailHash.substring(0, 8)}...`);
      return { valid: false, reason: 'Wykryto podejrzaną aktywność - duplikat konta' };
    }

    // SECURITY CHECK 5: Check for duplicate payment fingerprint (anti-fraud for card reuse)
    if (metadata?.paymentFingerprint) {
      const existingEventsWithSameFingerprint = await db
        .select()
        .from(referralEvents)
        .where(
          and(
            eq(referralEvents.referrerTrainerId, referrerTrainerId),
            sql`${referralEvents.metadata}->>'paymentFingerprint' = ${metadata.paymentFingerprint}`
          )
        );

      if (existingEventsWithSameFingerprint.length > 0) {
        console.warn(`[SECURITY] Duplicate payment fingerprint detected for referral: ${metadata.paymentFingerprint}`);
        return { valid: false, reason: 'Wykryto podejrzaną aktywność - karta już użyta' };
      }
    }

    return { valid: true };
  }

  async getTrainerBonusesThisYear(trainerId: string): Promise<number> {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    const bonusEvents = await db
      .select()
      .from(referralEvents)
      .where(
        and(
          eq(referralEvents.referrerTrainerId, trainerId),
          eq(referralEvents.status, 'bonus_granted'),
          gte(referralEvents.bonusGrantedAt, yearStart),
          lte(referralEvents.bonusGrantedAt, yearEnd)
        )
      );

    return bonusEvents.length;
  }

  async countStripePaymentsByCustomer(stripeCustomerId: string): Promise<number> {
    if (!stripeCustomerId) {
      return 0;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));

    if (!user) {
      return 0;
    }

    return await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clientPayments)
      .where(
        and(
          or(
            eq(clientPayments.clientId, user.id),
            eq(clientPayments.trainerId, user.id)
          ),
          eq(clientPayments.isPaid, true)
        )
      )
      .then(result => result[0]?.count || 0);
  }

  // Notifications
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  async listNotificationsByTrainer(trainerId: string, limit: number = 50): Promise<Notification[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.trainerId, trainerId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return results;
  }

  async markNotificationRead(id: number, trainerId: string): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.trainerId, trainerId)
        )
      )
      .returning();
    
    if (!notification) {
      throw new Error("Powiadomienie nie znalezione lub nie należy do tego trenera");
    }
    
    return notification;
  }

  async markAllNotificationsRead(trainerId: string): Promise<void> {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.trainerId, trainerId),
          eq(notifications.isRead, false)
        )
      );
  }

  async getUnreadPayments(): Promise<ClientPayment[]> {
    const results = await db
      .select()
      .from(clientPayments)
      .where(eq(clientPayments.isPaid, false))
      .orderBy(asc(clientPayments.dueDate));
    return results;
  }

  async getGlobalExercises(muscleGroup?: string, search?: string): Promise<GlobalExercise[]> {
    let query = db.select().from(globalExercises);
    
    const conditions = [];
    if (muscleGroup) {
      conditions.push(eq(globalExercises.muscleGroup, muscleGroup));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      conditions.push(
        or(
          sql`LOWER(${globalExercises.namePl}) LIKE ${`%${searchLower}%`}`,
          sql`LOWER(${globalExercises.nameEn}) LIKE ${`%${searchLower}%`}`
        )
      );
    }
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(asc(globalExercises.namePl));
    }
    
    return await query.orderBy(asc(globalExercises.namePl));
  }
}

export const storage = new DatabaseStorage();
