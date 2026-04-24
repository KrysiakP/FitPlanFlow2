import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, integer, index, uniqueIndex, jsonb, boolean, date, numeric, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - extended for trainer/client roles
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }), // 'trainer' or 'client' - null until user selects
  isAdmin: boolean("is_admin").default(false).notNull(), // Platform administrator flag
  hasFreeAccess: boolean("has_free_access").default(false).notNull(), // Admin-granted free access (bypasses subscription)
  isTestUser: boolean("is_test_user").default(false).notNull(), // Test client created for trainer onboarding demo
  testUserTrainerId: varchar("test_user_trainer_id").references(() => users.id, { onDelete: "cascade" }), // Trainer who owns this test client
  // Email verification fields
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: varchar("email_verification_token", { length: 64 }),
  emailVerificationTokenExpiresAt: timestamp("email_verification_token_expires_at"),
  // Password reset fields
  passwordResetToken: varchar("password_reset_token", { length: 64 }),
  passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at"),
  // Stripe subscription fields (trainers only)
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }), // Stripe customer ID (cus_xxx)
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }), // Stripe subscription ID (sub_xxx)
  subscriptionStatus: varchar("subscription_status", { length: 50 }), // 'active', 'canceled', 'past_due', 'unpaid', or null
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default('start').notNull(), // 'start', 'solo', 'pro', 'elite', 'studio'
  subscriptionCancelledAt: timestamp("subscription_cancelled_at"), // Date when subscription was cancelled/became past_due
  trialEndsAt: timestamp("trial_ends_at"), // 30-day trial end date for trainers
  // Referral system fields
  referredByTrainerId: varchar("referred_by_trainer_id", { length: 255 }).references(() => users.id), // Who referred this user (self-reference)
  referralBonusDays: integer("referral_bonus_days").default(0).notNull(), // Total bonus days earned from referrals
  // Client count for trainers (denormalized for quick access)
  clientCount: integer("client_count").default(0).notNull(), // Number of active clients for this trainer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique index on Stripe customer ID to prevent duplicate bindings
  stripeCustomerIdx: uniqueIndex("stripe_customer_idx").on(table.stripeCustomerId),
}));

// Training plans created by trainers
export const trainingPlans = pgTable("training_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Workouts within training plans (e.g., "Trening A", "Trening B")
export const workouts = pgTable("workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => trainingPlans.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(), // np. "Trening A - Klatka"
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exercises within workouts
export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutId: varchar("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  description: text("description"),
  restTime: integer("rest_time"), // in seconds
  orderIndex: integer("order_index").notNull().default(0),
  load: varchar("load"), // obciążenie zalecane przez trenera (np. "20kg", "bodyweight")
  videoUrl: text("video_url"), // link do filmu lub upload
  technique: varchar("technique", { length: 50 }), // technika treningowa: 'dropset', 'cluster_set', 'rest_pause', 'piramida', lub null
  rir: integer("rir"), // RIR (Reps In Reserve) - ile powtórzeń w zapasie
  tempo: varchar("tempo", { length: 20 }), // tempo ćwiczenia np. "3-1-2-0" (eccentric-pause-concentric-pause)
});

// Plan assignments to clients
export const planAssignments = pgTable("plan_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => trainingPlans.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Exercise library - trainer's custom exercise collection
export const exerciseLibrary = pgTable("exercise_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  videoUrl: text("video_url"), // link do YouTube/Vimeo lub upload
  defaultSets: integer("default_sets"),
  defaultReps: integer("default_reps"),
  defaultLoad: varchar("default_load"), // domyślne obciążenie
  defaultRestTime: integer("default_rest_time"), // w sekundach
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Global exercise database - shared library for all trainers
export const globalExercises = pgTable("global_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  namePl: varchar("name_pl", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }).notNull(),
  muscleGroup: varchar("muscle_group", { length: 50 }).notNull(),
}, (table) => ({
  muscleGroupIdx: index("global_exercises_muscle_group_idx").on(table.muscleGroup),
  namePlIdx: index("global_exercises_name_pl_idx").on(table.namePl),
  nameEnIdx: index("global_exercises_name_en_idx").on(table.nameEn),
}));

// User profiles - extended info for trainers and clients
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"), // o mnie / opis
  profileImageUrl: varchar("profile_image_url"), // zdjęcie profilowe
  phone: varchar("phone"), // telefon kontaktowy
  specialization: varchar("specialization"), // tylko dla trenerów, specjalizacja
  pharmacologicalSupport: text("pharmacological_support"), // wsparcie farmakologiczne/suplementacja
  injuries: text("injuries"), // Kontuzje i urazy
  healthIssues: text("health_issues"), // Problemy zdrowotne, alergie, choroby przewlekłe
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client progress tracking
export const clientProgress = pgTable("client_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  weight: varchar("weight"), // waga (np. "75kg")
  height: varchar("height"), // wzrost (np. "180cm")
  goal: text("goal"), // cel treningowy
  mood: varchar("mood"), // samopoczucie
  completedWorkouts: integer("completed_workouts").default(0).notNull(), // liczba ukończonych treningów
  notes: text("notes"), // notatki motywacyjne
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Exercise logs - client's logged workout performances
export const exerciseLogs = pgTable("exercise_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseId: varchar("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").default(1).notNull(), // numer serii (1, 2, 3, ...)
  reps: integer("reps").notNull(), // ilość powtórzeń wykonanych przez podopiecznego
  load: varchar("load"), // obciążenie użyte przez podopiecznego (np. "25kg")
  notes: text("notes"), // notatki podopiecznego
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

// Weekly reports - client's weekly progress reports
export const weeklyReports = pgTable("weekly_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportDate: timestamp("report_date").notNull(), // data raportu
  weight: varchar("weight"), // waga (np. "75.5")
  saturation: varchar("saturation"), // poziom nasycenia
  chest: varchar("chest"), // klatka w cm
  waist: varchar("waist"), // talia w cm
  hips: varchar("hips"), // biodro w cm
  arm: varchar("arm"), // ramię w cm
  leg: varchar("leg"), // udo/łydka w cm
  cardio: text("cardio"), // opis cardio
  supplements: text("supplements"), // suplementacja
  mood: text("mood"), // samopoczucie
  thoughts: text("thoughts"), // ogólne przemyślenia
  photoUrl: text("photo_url"), // zdjęcie raportowe sylwetki
  viewedByTrainer: boolean("viewed_by_trainer").default(false).notNull(), // czy trener widział raport
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client-Trainer relationships - tracks active/archived collaborations
export const clientRelationships = pgTable("client_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' or 'archived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"),
}, (table) => ({
  // Unique constraint: one active relationship per trainer-client pair
  uniqueActiveRelationship: uniqueIndex("unique_active_trainer_client")
    .on(table.trainerId, table.clientId)
    .where(sql`status = 'active'`),
}));

// Plan invitations - trainer invites client to a plan (plan optional)
export const planInvitations = pgTable("plan_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientEmail: varchar("client_email").notNull(), // email podopiecznego
  planId: varchar("plan_id").references(() => trainingPlans.id, { onDelete: "cascade" }), // NULLABLE - zaproszenie może być bez planu
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Charity donations - platform administrator uploads monthly charity proofs
export const charityDonations = pgTable("charity_donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(), // YYYY
  documentUrl: text("document_url").notNull(), // URL to uploaded PDF/image proof
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => ({
  // Prevent duplicate donations for same month/year
  uniqueMonthYear: uniqueIndex("unique_month_year").on(table.month, table.year),
}));

// Diet plans - nutritional plans created by trainers for clients
export const dietPlans = pgTable("diet_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => users.id, { onDelete: "cascade" }), // nullable - plan może być w formie draftu
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetCalories: integer("target_calories").notNull(),
  targetProtein: integer("target_protein").notNull(), // gramy
  targetFat: integer("target_fat").notNull(), // gramy
  targetCarbs: integer("target_carbs").notNull(), // gramy
  mealsPerDay: integer("meals_per_day").notNull(), // 3-6
  mode: varchar("mode", { length: 50 }).notNull().default('macro_only'), // 'macro_only' lub 'full_plan' (tygodniowa rozpiska)
  recommendedProducts: text("recommended_products"), // Lista polecanych produktów (opcjonalne)
  status: varchar("status", { length: 20 }).notNull().default("active"), // active/completed
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  trainerIdx: index("diet_plans_trainer_idx").on(table.trainerId),
  clientIdx: index("diet_plans_client_idx").on(table.clientId),
}));

// Diet meals - meals within a diet plan (supports weekly structure for full_plan mode)
export const dietMeals = pgTable("diet_meals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => dietPlans.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull().default(1), // 1=Poniedziałek, 2=Wtorek, ..., 7=Niedziela
  orderIndex: integer("order_index").notNull(), // kolejność posiłku w danym dniu (1, 2, 3...)
  name: varchar("name", { length: 255 }).notNull(), // np. "Śniadanie", "Obiad"
  description: text("description"), // składniki, przepis
  suggestedTime: varchar("suggested_time", { length: 10 }), // np. "08:00", "13:00"
  calories: integer("calories"), // kcal dla tego posiłku
  protein: integer("protein"), // białko w gramach
  fat: integer("fat"), // tłuszcz w gramach
  carbs: integer("carbs"), // węglowodany w gramach
}, (table) => ({
  planIdx: index("diet_meals_plan_idx").on(table.planId),
  dayIdx: index("diet_meals_day_idx").on(table.planId, table.dayOfWeek),
  uniquePlanDayOrder: uniqueIndex("unique_diet_meal_plan_day_order").on(table.planId, table.dayOfWeek, table.orderIndex),
}));

// Daily habit logs - client's daily diet and habit tracking
export const dailyHabitLogs = pgTable("daily_habit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => dietPlans.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  waterLiters: numeric("water_liters", { precision: 4, scale: 1 }).default("0").notNull(), // wypita woda
  hitCalories: boolean("hit_calories").default(false).notNull(),
  hitProtein: boolean("hit_protein").default(false).notNull(),
  hitFat: boolean("hit_fat").default(false).notNull(),
  hitCarbs: boolean("hit_carbs").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("daily_habit_logs_client_idx").on(table.clientId),
  planIdx: index("daily_habit_logs_plan_idx").on(table.planId),
  dateIdx: index("daily_habit_logs_date_idx").on(table.date),
  uniqueClientPlanDate: uniqueIndex("unique_client_plan_date").on(table.clientId, table.planId, table.date),
}));

// Meal checkmarks - track completed meals in daily habit logs
export const mealCheckmarks = pgTable("meal_checkmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  habitLogId: varchar("habit_log_id").notNull().references(() => dailyHabitLogs.id, { onDelete: "cascade" }),
  mealId: varchar("meal_id").notNull().references(() => dietMeals.id, { onDelete: "cascade" }),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  habitLogIdx: index("meal_checkmarks_habit_log_idx").on(table.habitLogId),
  mealIdx: index("meal_checkmarks_meal_idx").on(table.mealId),
  uniqueHabitLogMeal: uniqueIndex("unique_habit_log_meal").on(table.habitLogId, table.mealId),
}));

// Medical tests - client's medical test results and documentation
export const medicalTests = pgTable("medical_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  testName: text("test_name").notNull(), // np. "Morfologia", "Cholesterol"
  testType: text("test_type"), // kategoria: blood, hormone, cardio, other
  testDate: timestamp("test_date").notNull(),
  orderingProvider: text("ordering_provider"), // np. "Dr. Jan Kowalski"
  resultValue: text("result_value"), // np. "45 mg/dl"
  unit: text("unit"), // np. "mg/dl", "mmol/L"
  referenceRange: text("reference_range"), // np. "30-50 mg/dl"
  notes: text("notes"),
  attachments: jsonb("attachments"), // array of {id, name, url, size, uploadedAt}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("medical_tests_client_idx").on(table.clientId),
}));

// Client payments - payment schedule between trainer and client
export const clientPayments = pgTable("client_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  trainerId: varchar("trainer_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // kwota w groszach (np. 20000 = 200.00 PLN)
  dueDate: timestamp("due_date").notNull(), // termin płatności
  isPaid: boolean("is_paid").default(false).notNull(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  // Recurring payment fields
  isRecurring: boolean("is_recurring").default(false).notNull(), // czy płatność powtarza się co miesiąc
  recurringAmount: integer("recurring_amount"), // kwota cykliczna w groszach (np. 20000 = 200.00 PLN)
  recurringDayOfMonth: integer("recurring_day_of_month"), // dzień miesiąca (1-28) kiedy płatność ma się powtarzać
  lastRecurringCreatedAt: timestamp("last_recurring_created_at"), // kiedy ostatnio została stworzona nowa płatność cykliczna
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  clientIdx: index("client_payments_client_idx").on(table.clientId),
  trainerIdx: index("client_payments_trainer_idx").on(table.trainerId),
  dueDateIdx: index("client_payments_due_date_idx").on(table.dueDate),
}));

// Diet supplements - supplements assigned to diet plans
export const dietSupplements = pgTable("diet_supplements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dietPlanId: varchar("diet_plan_id").notNull().references(() => dietPlans.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  dose: varchar("dose", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  timing: varchar("timing", { length: 100 }),
  frequency: varchar("frequency", { length: 50 }).notNull(),
  notes: text("notes"),
  orderIndex: integer("order_index").notNull().default(0),
}, (table) => ({
  dietPlanIdx: index("diet_supplements_diet_plan_idx").on(table.dietPlanId),
}));

// Messages - chat messages between trainer and client
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  trainerIdx: index("messages_trainer_idx").on(table.trainerId),
  clientIdx: index("messages_client_idx").on(table.clientId),
  senderIdx: index("messages_sender_idx").on(table.senderId),
  recipientIdx: index("messages_recipient_idx").on(table.recipientId),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  conversationIdx: index("messages_conversation_idx").on(table.trainerId, table.clientId),
}));

// User role enum (for referralEvents.referredRole)
export const userRoleEnum = pgEnum("user_role", ["trainer", "client"]);

// Referral status enum
export const referralStatusEnum = pgEnum("referral_status", ["pending", "qualified", "bonus_granted"]);

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", ["upcoming", "due_today", "overdue"]);

// Referral codes - unique codes for trainers to share (one-to-one with trainers)
export const referralCodes = pgTable("referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }), // One code per trainer (unique constraint)
  code: varchar("code", { length: 20 }).unique().notNull(), // Unique referral code (e.g., "ABC123XY")
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"), // Last time this code was used
}, (table) => ({
  codeIdx: uniqueIndex("referral_codes_code_idx").on(table.code),
}));

// Referral events - tracks who referred whom and bonus status
export const referralEvents = pgTable("referral_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referralCodeId: varchar("referral_code_id").notNull().references(() => referralCodes.id, { onDelete: "cascade" }),
  referrerTrainerId: varchar("referrer_trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredRole: userRoleEnum("referred_role").notNull(), // Enum: 'trainer' or 'client' - REQUIRED
  status: referralStatusEnum("status").default("pending").notNull(), // Enum: 'pending', 'qualified', 'bonus_granted'
  qualifiedAt: timestamp("qualified_at"), // When referral became qualified (trainer confirmed)
  bonusGrantedAt: timestamp("bonus_granted_at"), // When bonus was applied
  metadata: jsonb("metadata"), // Additional data (e.g., notes, tracking info)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  referralCodeIdx: index("referral_events_code_idx").on(table.referralCodeId),
  referrerIdx: index("referral_events_referrer_idx").on(table.referrerTrainerId),
  referredIdx: index("referral_events_referred_idx").on(table.referredUserId),
  statusIdx: index("referral_events_status_idx").on(table.status),
}));

// Notifications - payment notifications for trainers
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  trainerId: varchar("trainer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").references(() => users.id, { onDelete: "cascade" }),
  paymentId: varchar("payment_id").references(() => clientPayments.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
}, (table) => ({
  trainerIdx: index("notifications_trainer_idx").on(table.trainerId),
  uniqueNotification: uniqueIndex("unique_trainer_payment_type").on(table.trainerId, table.paymentId, table.type),
}));

export const mobileTokens = pgTable("mobile_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("mobile_tokens_user_idx").on(table.userId),
}));

export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserToken: uniqueIndex("push_tokens_user_token_unique").on(table.userId, table.token),
}));

export type MobileToken = typeof mobileTokens.$inferSelect;
export type PushToken = typeof pushTokens.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  createdPlans: many(trainingPlans),
  assignments: many(planAssignments),
  exerciseLibrary: many(exerciseLibrary),
  profile: one(userProfiles),
  progress: many(clientProgress),
  exerciseLogs: many(exerciseLogs),
  weeklyReports: many(weeklyReports),
  createdDietPlans: many(dietPlans, { relationName: "trainerDietPlans" }),
  assignedDietPlans: many(dietPlans, { relationName: "clientDietPlans" }),
  dailyHabitLogs: many(dailyHabitLogs),
  medicalTestsAsClient: many(medicalTests, { relationName: "clientMedicalTests" }),
  medicalTestsAsTrainer: many(medicalTests, { relationName: "trainerMedicalTests" }),
  paymentsAsClient: many(clientPayments, { relationName: "clientPayments" }),
  paymentsAsTrainer: many(clientPayments, { relationName: "trainerPayments" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  referredByTrainer: one(users, {
    fields: [users.referredByTrainerId],
    references: [users.id],
  }),
  referralsAsReferrer: many(referralEvents, { relationName: "referrerEvents" }),
  referralsAsReferred: many(referralEvents, { relationName: "referredEvents" }),
}));

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  trainer: one(users, {
    fields: [trainingPlans.trainerId],
    references: [users.id],
  }),
  workouts: many(workouts),
  assignments: many(planAssignments),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  plan: one(trainingPlans, {
    fields: [workouts.planId],
    references: [trainingPlans.id],
  }),
  exercises: many(exercises),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [exercises.workoutId],
    references: [workouts.id],
  }),
  logs: many(exerciseLogs),
}));

export const planAssignmentsRelations = relations(planAssignments, ({ one }) => ({
  plan: one(trainingPlans, {
    fields: [planAssignments.planId],
    references: [trainingPlans.id],
  }),
  client: one(users, {
    fields: [planAssignments.clientId],
    references: [users.id],
  }),
}));

export const exerciseLibraryRelations = relations(exerciseLibrary, ({ one }) => ({
  trainer: one(users, {
    fields: [exerciseLibrary.trainerId],
    references: [users.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const clientProgressRelations = relations(clientProgress, ({ one }) => ({
  client: one(users, {
    fields: [clientProgress.clientId],
    references: [users.id],
  }),
}));

export const exerciseLogsRelations = relations(exerciseLogs, ({ one }) => ({
  client: one(users, {
    fields: [exerciseLogs.clientId],
    references: [users.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseLogs.exerciseId],
    references: [exercises.id],
  }),
}));

export const weeklyReportsRelations = relations(weeklyReports, ({ one }) => ({
  client: one(users, {
    fields: [weeklyReports.clientId],
    references: [users.id],
  }),
}));

export const clientRelationshipsRelations = relations(clientRelationships, ({ one }) => ({
  trainer: one(users, {
    fields: [clientRelationships.trainerId],
    references: [users.id],
  }),
  client: one(users, {
    fields: [clientRelationships.clientId],
    references: [users.id],
  }),
}));

export const planInvitationsRelations = relations(planInvitations, ({ one }) => ({
  trainer: one(users, {
    fields: [planInvitations.trainerId],
    references: [users.id],
  }),
  plan: one(trainingPlans, {
    fields: [planInvitations.planId],
    references: [trainingPlans.id],
  }),
}));

export const dietPlansRelations = relations(dietPlans, ({ one, many }) => ({
  trainer: one(users, {
    fields: [dietPlans.trainerId],
    references: [users.id],
    relationName: "trainerDietPlans",
  }),
  client: one(users, {
    fields: [dietPlans.clientId],
    references: [users.id],
    relationName: "clientDietPlans",
  }),
  meals: many(dietMeals),
  habitLogs: many(dailyHabitLogs),
  supplements: many(dietSupplements),
}));

export const dietMealsRelations = relations(dietMeals, ({ one, many }) => ({
  plan: one(dietPlans, {
    fields: [dietMeals.planId],
    references: [dietPlans.id],
  }),
  checkmarks: many(mealCheckmarks),
}));

export const dailyHabitLogsRelations = relations(dailyHabitLogs, ({ one, many }) => ({
  client: one(users, {
    fields: [dailyHabitLogs.clientId],
    references: [users.id],
  }),
  plan: one(dietPlans, {
    fields: [dailyHabitLogs.planId],
    references: [dietPlans.id],
  }),
  mealCheckmarks: many(mealCheckmarks),
}));

export const mealCheckmarksRelations = relations(mealCheckmarks, ({ one }) => ({
  habitLog: one(dailyHabitLogs, {
    fields: [mealCheckmarks.habitLogId],
    references: [dailyHabitLogs.id],
  }),
  meal: one(dietMeals, {
    fields: [mealCheckmarks.mealId],
    references: [dietMeals.id],
  }),
}));

export const medicalTestsRelations = relations(medicalTests, ({ one }) => ({
  client: one(users, {
    fields: [medicalTests.clientId],
    references: [users.id],
    relationName: "clientMedicalTests",
  }),
}));

export const clientPaymentsRelations = relations(clientPayments, ({ one }) => ({
  client: one(users, {
    fields: [clientPayments.clientId],
    references: [users.id],
    relationName: "clientPayments",
  }),
  trainer: one(users, {
    fields: [clientPayments.trainerId],
    references: [users.id],
    relationName: "trainerPayments",
  }),
}));

export const dietSupplementsRelations = relations(dietSupplements, ({ one }) => ({
  dietPlan: one(dietPlans, {
    fields: [dietSupplements.dietPlanId],
    references: [dietPlans.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  trainer: one(users, {
    fields: [messages.trainerId],
    references: [users.id],
    relationName: "trainerMessages",
  }),
  client: one(users, {
    fields: [messages.clientId],
    references: [users.id],
    relationName: "clientMessages",
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  trainer: one(users, {
    fields: [referralCodes.trainerId],
    references: [users.id],
  }),
  referralEvents: many(referralEvents),
}));

export const referralEventsRelations = relations(referralEvents, ({ one }) => ({
  referralCode: one(referralCodes, {
    fields: [referralEvents.referralCodeId],
    references: [referralCodes.id],
  }),
  referrer: one(users, {
    fields: [referralEvents.referrerTrainerId],
    references: [users.id],
    relationName: "referrerEvents",
  }),
  referred: one(users, {
    fields: [referralEvents.referredUserId],
    references: [users.id],
    relationName: "referredEvents",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  trainer: one(users, {
    fields: [notifications.trainerId],
    references: [users.id],
  }),
  client: one(users, {
    fields: [notifications.clientId],
    references: [users.id],
  }),
  payment: one(clientPayments, {
    fields: [notifications.paymentId],
    references: [clientPayments.id],
  }),
}));

// Types for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect & {
  profileImageDisplayUrl?: string | null; // Presigned URL for avatar display (7 days validity)
};

// Types for training plans
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertTrainingPlan = typeof trainingPlans.$inferInsert;

// Types for workouts
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;

// Types for exercises
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = typeof exercises.$inferInsert;

// Types for plan assignments
export type PlanAssignment = typeof planAssignments.$inferSelect;
export type InsertPlanAssignment = typeof planAssignments.$inferInsert;

// Types for exercise library
export type ExerciseLibrary = typeof exerciseLibrary.$inferSelect;
export type InsertExerciseLibrary = typeof exerciseLibrary.$inferInsert;

// Types for user profiles
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// Types for client progress
export type ClientProgress = typeof clientProgress.$inferSelect;
export type InsertClientProgress = typeof clientProgress.$inferInsert;

// Types for exercise logs
export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type InsertExerciseLog = typeof exerciseLogs.$inferInsert;

// Types for weekly reports
export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type InsertWeeklyReport = typeof weeklyReports.$inferInsert;

// Types for client relationships
export type ClientRelationship = typeof clientRelationships.$inferSelect;
export type InsertClientRelationship = typeof clientRelationships.$inferInsert;

// Types for plan invitations
export type PlanInvitation = typeof planInvitations.$inferSelect;
export type InsertPlanInvitation = typeof planInvitations.$inferInsert;

// Types for diet plans
export type DietPlan = typeof dietPlans.$inferSelect;
export type InsertDietPlan = typeof dietPlans.$inferInsert;

// Types for diet meals
export type DietMeal = typeof dietMeals.$inferSelect;
export type InsertDietMeal = typeof dietMeals.$inferInsert;

// Types for daily habit logs
export type DailyHabitLog = typeof dailyHabitLogs.$inferSelect;
export type InsertDailyHabitLog = typeof dailyHabitLogs.$inferInsert;

// Types for meal checkmarks
export type MealCheckmark = typeof mealCheckmarks.$inferSelect;
export type InsertMealCheckmark = typeof mealCheckmarks.$inferInsert;

// Types for medical tests
export type MedicalTest = typeof medicalTests.$inferSelect;
export type InsertMedicalTest = typeof medicalTests.$inferInsert;

// Types for client payments
export type ClientPayment = typeof clientPayments.$inferSelect;
export type InsertClientPayment = typeof clientPayments.$inferInsert;

// Types for diet supplements
export type DietSupplement = typeof dietSupplements.$inferSelect;
export type InsertDietSupplement = typeof dietSupplements.$inferInsert;

// Types for messages
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Types for referral codes
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

// Types for referral events
export type ReferralEvent = typeof referralEvents.$inferSelect;
export type InsertReferralEvent = typeof referralEvents.$inferInsert;

// Types for notifications
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Zod schemas
export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({
  id: true,
  trainerId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  workoutId: true,
});

export const insertPlanWithWorkoutsSchema = insertTrainingPlanSchema.extend({
  workouts: z.array(insertWorkoutSchema.omit({ planId: true }).extend({
    exercises: z.array(insertExerciseSchema)
  }))
});

export const insertPlanAssignmentSchema = createInsertSchema(planAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertExerciseLibrarySchema = createInsertSchema(exerciseLibrary).omit({
  id: true,
  trainerId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertClientProgressSchema = createInsertSchema(clientProgress).omit({
  id: true,
  lastUpdated: true,
});

export const updateClientProgressSchema = createInsertSchema(clientProgress).omit({
  id: true,
  clientId: true,
  lastUpdated: true,
}).partial();

export const insertExerciseLogSchema = createInsertSchema(exerciseLogs).omit({
  id: true,
  clientId: true,
  loggedAt: true,
});

export const insertWeeklyReportSchema = createInsertSchema(weeklyReports).omit({
  id: true,
  clientId: true,
  createdAt: true,
}).extend({
  reportDate: z.coerce.date(),
});

export const insertClientRelationshipSchema = createInsertSchema(clientRelationships).omit({
  id: true,
  createdAt: true,
  archivedAt: true,
});

export const insertPlanInvitationSchema = createInsertSchema(planInvitations).omit({
  id: true,
  trainerId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  planId: z.string().uuid().optional().nullable(), // planId is optional - can invite without plan
});

export const insertCharityDonationSchema = createInsertSchema(charityDonations).omit({
  id: true,
  uploadedAt: true,
}).extend({
  month: z.coerce.number().int().min(1, "Miesiąc musi być między 1 a 12").max(12, "Miesiąc musi być między 1 a 12"),
  year: z.coerce.number().int().min(2024, "Rok musi być co najmniej 2024").max(2100, "Rok nie może być większy niż 2100"),
  documentUrl: z.string().min(1, "URL dokumentu jest wymagany"),
});

export const insertDietPlanSchema = createInsertSchema(dietPlans).omit({
  id: true,
  trainerId: true,
  createdAt: true,
}).extend({
  mode: z.enum(['macro_only', 'full_plan'], { 
    errorMap: () => ({ message: "Tryb diety musi być: macro_only lub full_plan" }) 
  }).default('macro_only'),
  mealsPerDay: z.coerce.number().int().min(3, "Liczba posiłków musi być między 3 a 6").max(6, "Liczba posiłków musi być między 3 a 6").optional(),
  recommendedProducts: z.string().optional(),
});

export const insertDietMealSchema = createInsertSchema(dietMeals).omit({
  id: true,
}).extend({
  dayOfWeek: z.coerce.number().int().min(1, "Dzień musi być między 1 a 7").max(7, "Dzień musi być między 1 a 7").default(1),
  orderIndex: z.coerce.number().int().min(1),
  name: z.string().min(1, "Nazwa posiłku jest wymagana"),
  description: z.string().optional(),
  suggestedTime: z.string().optional(),
  calories: z.coerce.number().int().optional(),
  protein: z.coerce.number().int().optional(),
  fat: z.coerce.number().int().optional(),
  carbs: z.coerce.number().int().optional(),
});

export const insertDailyHabitLogSchema = createInsertSchema(dailyHabitLogs).omit({
  id: true,
  clientId: true,
  createdAt: true,
}).extend({
  date: z.coerce.date(),
});

export const insertMealCheckmarkSchema = createInsertSchema(mealCheckmarks).omit({
  id: true,
});

export const insertMedicalTestSchema = createInsertSchema(medicalTests).omit({
  id: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  testDate: z.coerce.date(),
});

// Helper type dla attachments
export type MedicalTestAttachment = {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
};

export const insertClientPaymentSchema = createInsertSchema(clientPayments).omit({
  id: true,
  createdAt: true,
  paidAt: true,
  trainerId: true,
  lastRecurringCreatedAt: true,
}).extend({
  amount: z.coerce.number().int().min(1, "Kwota musi być większa niż 0"),
  dueDate: z.coerce.date(),
  isRecurring: z.boolean().default(false),
  recurringAmount: z.coerce.number().int().nullable().optional(),
  recurringDayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
});

export const insertDietSupplementSchema = createInsertSchema(dietSupplements).omit({
  id: true,
}).extend({
  name: z.string().min(1, "Nazwa suplementu jest wymagana").max(255, "Nazwa suplementu może mieć maksymalnie 255 znaków"),
  dose: z.string().min(1, "Dawka jest wymagana"),
  unit: z.string().min(1, "Jednostka jest wymagana"),
  frequency: z.string().min(1, "Częstotliwość jest wymagana"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readAt: true,
}).extend({
  body: z.string().min(1, "Wiadomość nie może być pusta").max(5000, "Wiadomość może mieć maksymalnie 5000 znaków"),
});

// SECURITY: Client should only send recipientId and body - server derives all other IDs from session
export const sendMessageSchema = z.object({
  recipientId: z.string().uuid("Nieprawidłowy ID odbiorcy"),
  body: z.string().min(1, "Wiadomość nie może być pusta").max(5000, "Wiadomość może mieć maksymalnie 5000 znaków"),
});

export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
}).extend({
  code: z.string().length(8, "Kod polecający musi mieć dokładnie 8 znaków"),
});

export const insertReferralEventSchema = createInsertSchema(referralEvents).omit({
  id: true,
  createdAt: true,
  qualifiedAt: true,
  bonusGrantedAt: true,
}).extend({
  status: z.enum(["pending", "qualified", "bonus_granted"]).default("pending"),
  referredRole: z.enum(["trainer", "client"]), // Required - matches DB constraint
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  createdAt: true,
  readAt: true,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["trainer", "client"]),
});

export const insertGlobalExerciseSchema = createInsertSchema(globalExercises).omit({
  id: true,
});

export const registerSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  firstName: z.string().min(1, "Imię jest wymagane"),
  lastName: z.string().min(1, "Nazwisko jest wymagane"),
  role: z.enum(["trainer", "client"]),
});

export const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type InsertTrainingPlanInput = z.infer<typeof insertTrainingPlanSchema>;
export type InsertWorkoutInput = z.infer<typeof insertWorkoutSchema>;
export type InsertExerciseInput = z.infer<typeof insertExerciseSchema>;
export type InsertPlanWithWorkouts = z.infer<typeof insertPlanWithWorkoutsSchema>;
export type InsertPlanAssignmentInput = z.infer<typeof insertPlanAssignmentSchema>;
export type InsertExerciseLibraryInput = z.infer<typeof insertExerciseLibrarySchema>;
export type InsertUserProfileInput = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type InsertClientProgressInput = z.infer<typeof insertClientProgressSchema>;
export type UpdateClientProgressInput = z.infer<typeof updateClientProgressSchema>;
export type InsertExerciseLogInput = z.infer<typeof insertExerciseLogSchema>;
export type InsertWeeklyReportInput = z.infer<typeof insertWeeklyReportSchema>;
export type InsertClientRelationshipInput = z.infer<typeof insertClientRelationshipSchema>;
export type InsertPlanInvitationInput = z.infer<typeof insertPlanInvitationSchema>;
export type InsertCharityDonationInput = z.infer<typeof insertCharityDonationSchema>;
export type CharityDonation = typeof charityDonations.$inferSelect;
export type InsertDietPlanInput = z.infer<typeof insertDietPlanSchema>;
export type InsertDietMealInput = z.infer<typeof insertDietMealSchema>;
export type InsertDailyHabitLogInput = z.infer<typeof insertDailyHabitLogSchema>;
export type InsertMealCheckmarkInput = z.infer<typeof insertMealCheckmarkSchema>;
export type InsertClientPaymentInput = z.infer<typeof insertClientPaymentSchema>;
export type InsertDietSupplementInput = z.infer<typeof insertDietSupplementSchema>;
export type InsertMessageInput = z.infer<typeof insertMessageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type InsertReferralCodeInput = z.infer<typeof insertReferralCodeSchema>;
export type InsertReferralEventInput = z.infer<typeof insertReferralEventSchema>;
export type InsertNotificationInput = z.infer<typeof insertNotificationSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InsertGlobalExerciseInput = z.infer<typeof insertGlobalExerciseSchema>;
export type GlobalExercise = typeof globalExercises.$inferSelect;
