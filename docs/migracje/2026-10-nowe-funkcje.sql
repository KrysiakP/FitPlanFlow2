-- Migracja: nowe tabele, kolumny i indeksy z listy ulepszeń (październik 2026).
--
-- TYLKO DODAJE, nic nie usuwa ani nie zmienia istniejących danych. Każde polecenie jest bezpieczne przy ponownym
-- uruchomieniu (IF NOT EXISTS / blok z obsługą istniejącego obiektu), więc można ją uruchomić na bazie, na której
-- Replit (drizzle-kit push) już część zmian wprowadził.
--
-- Jak użyć: albo zatwierdź zmiany, które Replit pokaże przy publikacji, albo wklej cały plik w konsoli bazy
-- produkcyjnej (najlepiej po wykonaniu kopii zapasowej). Plik wygenerowano ze schematu `lib/db/src/schema`.

BEGIN;

-- 1. Nowe tabele
CREATE TABLE IF NOT EXISTS "gym_announcement_reads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" varchar NOT NULL,
	"trainer_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gym_announcements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" varchar NOT NULL,
	"author_id" varchar,
	"title" varchar(150) NOT NULL,
	"body" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"muted_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"quiet_start" integer,
	"quiet_end" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "data_access_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" varchar NOT NULL,
	"subject_id" varchar NOT NULL,
	"action" varchar(40) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "client_labels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"label" varchar(24) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "client_goals" (
	"client_id" varchar PRIMARY KEY NOT NULL,
	"start_kg" real NOT NULL,
	"target_kg" real NOT NULL,
	"target_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "client_reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"text" varchar(200) NOT NULL,
	"due_date" timestamp NOT NULL,
	"notified_at" timestamp,
	"done_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "trainer_availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"slot_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "gym_exercises" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gym_id" varchar NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"description" text,
	"video_url" text,
	"default_sets" integer,
	"default_reps" integer,
	"default_load" varchar,
	"default_rest_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "exercise_swap_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"trainer_id" varchar NOT NULL,
	"exercise_id" varchar NOT NULL,
	"reason" varchar(300) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"replacement_name" varchar(255),
	"trainer_note" varchar(300),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp
);

CREATE TABLE IF NOT EXISTS "meal_swap_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"trainer_id" varchar NOT NULL,
	"meal_id" varchar NOT NULL,
	"reason" varchar(300) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"replacement_name" varchar(255),
	"trainer_note" varchar(300),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decided_at" timestamp
);

CREATE TABLE IF NOT EXISTS "plan_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"name" varchar(200) NOT NULL,
	"description" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Nowe kolumny w istniejących tabelach
ALTER TABLE "exercise_library" ADD COLUMN IF NOT EXISTS "is_favorite" boolean DEFAULT false NOT NULL;
ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "trainer_comment" text;
ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "trainer_commented_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_backup_codes" text[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE "exercise_logs" ADD COLUMN IF NOT EXISTS "is_warmup" boolean DEFAULT false NOT NULL;
ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "sleep_hours" varchar;
ALTER TABLE "weekly_reports" ADD COLUMN IF NOT EXISTS "water_liters" varchar;
ALTER TABLE "workout_sessions" ADD COLUMN IF NOT EXISTS "rpe" integer;
ALTER TABLE "workout_sessions" ADD COLUMN IF NOT EXISTS "trainer_comment" text;
ALTER TABLE "workout_sessions" ADD COLUMN IF NOT EXISTS "trainer_commented_at" timestamp;
ALTER TABLE "mobile_tokens" ADD COLUMN IF NOT EXISTS "device_label" varchar(120);
ALTER TABLE "mobile_tokens" ADD COLUMN IF NOT EXISTS "device_kind" varchar(10);

-- 3. Klucze obce nowych tabel
DO $$ BEGIN
  ALTER TABLE "client_goals" ADD CONSTRAINT "client_goals_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "client_labels" ADD CONSTRAINT "client_labels_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "client_labels" ADD CONSTRAINT "client_labels_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "client_reminders" ADD CONSTRAINT "client_reminders_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "client_reminders" ADD CONSTRAINT "client_reminders_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "data_access_log" ADD CONSTRAINT "data_access_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "data_access_log" ADD CONSTRAINT "data_access_log_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "gym_announcement_reads" ADD CONSTRAINT "gym_announcement_reads_announcement_id_gym_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."gym_announcements"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "gym_announcement_reads" ADD CONSTRAINT "gym_announcement_reads_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "gym_announcements" ADD CONSTRAINT "gym_announcements_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "gym_announcements" ADD CONSTRAINT "gym_announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "trainer_availability" ADD CONSTRAINT "trainer_availability_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "gym_exercises" ADD CONSTRAINT "gym_exercises_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "exercise_swap_requests" ADD CONSTRAINT "exercise_swap_requests_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "exercise_swap_requests" ADD CONSTRAINT "exercise_swap_requests_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "exercise_swap_requests" ADD CONSTRAINT "exercise_swap_requests_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "meal_swap_requests" ADD CONSTRAINT "meal_swap_requests_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "meal_swap_requests" ADD CONSTRAINT "meal_swap_requests_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "meal_swap_requests" ADD CONSTRAINT "meal_swap_requests_meal_id_diet_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."diet_meals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Indeksy
CREATE UNIQUE INDEX IF NOT EXISTS "client_labels_unique" ON "client_labels" USING btree ("trainer_id","client_id","label");
CREATE INDEX IF NOT EXISTS "client_labels_trainer_idx" ON "client_labels" USING btree ("trainer_id");
CREATE INDEX IF NOT EXISTS "client_relationships_client_idx" ON "client_relationships" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "client_relationships_trainer_status_idx" ON "client_relationships" USING btree ("trainer_id","status");
CREATE INDEX IF NOT EXISTS "client_reminders_trainer_due_idx" ON "client_reminders" USING btree ("trainer_id","due_date");
CREATE INDEX IF NOT EXISTS "data_access_log_subject_created_idx" ON "data_access_log" USING btree ("subject_id","created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "gym_announcement_reads_unique" ON "gym_announcement_reads" USING btree ("announcement_id","trainer_id");
CREATE INDEX IF NOT EXISTS "gym_announcements_gym_created_idx" ON "gym_announcements" USING btree ("gym_id","created_at");
CREATE INDEX IF NOT EXISTS "push_notification_history_user_idx" ON "push_notification_history" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "push_notification_history_user_type_created_idx" ON "push_notification_history" USING btree ("user_id","type","created_at");
CREATE INDEX IF NOT EXISTS "push_notification_history_created_at_idx" ON "push_notification_history" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "session_bookings_scheduled_idx" ON "session_bookings" USING btree ("scheduled_at");
CREATE INDEX IF NOT EXISTS "session_bookings_client_scheduled_idx" ON "session_bookings" USING btree ("client_id","scheduled_at");
CREATE INDEX IF NOT EXISTS "session_bookings_trainer_scheduled_idx" ON "session_bookings" USING btree ("trainer_id","scheduled_at");
CREATE INDEX IF NOT EXISTS "weekly_reports_client_created_idx" ON "weekly_reports" USING btree ("client_id","created_at");
CREATE INDEX IF NOT EXISTS "trainer_availability_trainer_idx" ON "trainer_availability" USING btree ("trainer_id");
CREATE INDEX IF NOT EXISTS "gym_exercises_gym_idx" ON "gym_exercises" USING btree ("gym_id");
CREATE INDEX IF NOT EXISTS "exercise_swap_requests_trainer_status_idx" ON "exercise_swap_requests" USING btree ("trainer_id","status");
CREATE INDEX IF NOT EXISTS "exercise_swap_requests_client_idx" ON "exercise_swap_requests" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "meal_swap_requests_trainer_status_idx" ON "meal_swap_requests" USING btree ("trainer_id","status");
CREATE INDEX IF NOT EXISTS "meal_swap_requests_client_idx" ON "meal_swap_requests" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "plan_templates_trainer_idx" ON "plan_templates" USING btree ("trainer_id");

COMMIT;
