import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, integer, index, jsonb } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

// User profiles - extended info for trainers and clients
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"), // o mnie / opis
  profileImageUrl: varchar("profile_image_url"), // zdjęcie profilowe
  phone: varchar("phone"), // telefon kontaktowy
  specialization: varchar("specialization"), // tylko dla trenerów, specjalizacja
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

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  createdPlans: many(trainingPlans),
  assignments: many(planAssignments),
  exerciseLibrary: many(exerciseLibrary),
  profile: one(userProfiles),
  progress: many(clientProgress),
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

export const exercisesRelations = relations(exercises, ({ one }) => ({
  workout: one(workouts, {
    fields: [exercises.workoutId],
    references: [workouts.id],
  }),
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

// Types for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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

export const updateUserRoleSchema = z.object({
  role: z.enum(["trainer", "client"]),
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
export type InsertPlanAssignmentInput = z.infer<typeof insertPlanAssignmentSchema>;
export type InsertExerciseLibraryInput = z.infer<typeof insertExerciseLibrarySchema>;
export type InsertUserProfileInput = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type InsertClientProgressInput = z.infer<typeof insertClientProgressSchema>;
export type UpdateClientProgressInput = z.infer<typeof updateClientProgressSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
