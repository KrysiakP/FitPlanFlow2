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
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
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

// Exercises within training plans
export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => trainingPlans.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  description: text("description"),
  restTime: integer("rest_time"), // in seconds
  orderIndex: integer("order_index").notNull().default(0),
});

// Plan assignments to clients
export const planAssignments = pgTable("plan_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => trainingPlans.id, { onDelete: "cascade" }),
  clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdPlans: many(trainingPlans),
  assignments: many(planAssignments),
}));

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  trainer: one(users, {
    fields: [trainingPlans.trainerId],
    references: [users.id],
  }),
  exercises: many(exercises),
  assignments: many(planAssignments),
}));

export const exercisesRelations = relations(exercises, ({ one }) => ({
  plan: one(trainingPlans, {
    fields: [exercises.planId],
    references: [trainingPlans.id],
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

// Types for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Types for training plans
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertTrainingPlan = typeof trainingPlans.$inferInsert;

// Types for exercises
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = typeof exercises.$inferInsert;

// Types for plan assignments
export type PlanAssignment = typeof planAssignments.$inferSelect;
export type InsertPlanAssignment = typeof planAssignments.$inferInsert;

// Zod schemas
export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({
  id: true,
  trainerId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  planId: true,
});

export const insertPlanAssignmentSchema = createInsertSchema(planAssignments).omit({
  id: true,
  assignedAt: true,
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["trainer", "client"]),
});

export type InsertTrainingPlanInput = z.infer<typeof insertTrainingPlanSchema>;
export type InsertExerciseInput = z.infer<typeof insertExerciseSchema>;
export type InsertPlanAssignmentInput = z.infer<typeof insertPlanAssignmentSchema>;
