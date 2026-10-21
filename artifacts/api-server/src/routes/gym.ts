// Studio (gym) routes: admin management of gyms, studio self-registration, owner panel, trainer invitations and announcements.
import { storage } from "../storage";
import { db } from "../db";
import { isAuthenticated, hashPassword } from "../auth";
import { generateVerificationToken, getTokenExpiry, sendVerificationEmail, sendStudioInvitationEmail } from "../email";
import { sql, eq, and, or, inArray, desc, gte, lt } from "drizzle-orm";
import { sessions, users, gyms, gymTrainers, gymAnnouncements, gymAnnouncementReads, clientRelationships, workoutSessions, trainingPlans } from "@workspace/db";
import { z } from "zod";
import { randomUUID } from "crypto";
import { authRateLimit } from "../app";
import { requireAdmin } from "../middlewares/requireAdmin";
import { sendPushToUserAndRecord } from "../services/push";
import type { Express } from "express";

export function registerGymRoutes(app: Express) {
  // ─────────────────────────────────────────────────────────────────────────
  // GYM (SIŁOWNIA) SYSTEM
  // ─────────────────────────────────────────────────────────────────────────

  // The app authenticates through req.session.userId (never populates req.user),
  // so load the user here and expose it to the gym handlers below as req.user.
  async function requireGymOwner(req: any, res: any, next: any) {
    try {
      const userId = req.session?.userId;
      const user = userId ? await storage.getUser(userId) : undefined;
      if (!user || user.role !== "gym_owner") {
        return res.status(403).json({ message: "Dostęp tylko dla właścicieli siłowni" });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error("Error checking gym owner:", error);
      res.status(500).json({ message: "Błąd sprawdzania uprawnień" });
    }
  }

  // ── ADMIN: Manage gyms ────────────────────────────────────────────────────

  // GET /api/admin/gyms — list all gyms
  app.get("/api/admin/gyms", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allGyms = await db
        .select({
          id: gyms.id,
          name: gyms.name,
          contactEmail: gyms.contactEmail,
          phone: gyms.phone,
          address: gyms.address,
          planTier: gyms.planTier,
          maxTrainers: gyms.maxTrainers,
          logoUrl: gyms.logoUrl,
          createdAt: gyms.createdAt,
          ownerEmail: users.email,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName,
        })
        .from(gyms)
        .leftJoin(users, eq(users.id, gyms.ownerId))
        .orderBy(desc(gyms.createdAt));

      // Count trainers per gym
      const gymIds = allGyms.map((g) => g.id);
      const trainerCounts: Record<string, number> = {};
      if (gymIds.length > 0) {
        const counts = await db
          .select({ gymId: gymTrainers.gymId, count: sql<number>`count(*)::int` })
          .from(gymTrainers)
          .where(eq(gymTrainers.status, "active"))
          .groupBy(gymTrainers.gymId);
        counts.forEach((c) => { trainerCounts[c.gymId] = c.count; });
      }

      res.json(allGyms.map((g) => ({ ...g, trainerCount: trainerCounts[g.id] ?? 0 })));
    } catch (error) {
      console.error("Error fetching gyms:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // POST /api/admin/gyms — create gym + gym_owner user
  app.post("/api/admin/gyms", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      gymName: z.string().min(2),
      ownerEmail: z.string().email(),
      ownerFirstName: z.string().min(1),
      ownerLastName: z.string().min(1),
      ownerPassword: z.string().min(8),
      planTier: z.enum(["starter", "pro", "enterprise"]).default("starter"),
      maxTrainers: z.number().int().min(1).max(500).default(5),
      contactEmail: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Nieprawidłowe dane", errors: parsed.error.flatten() });
    const { gymName, ownerEmail, ownerFirstName, ownerLastName, ownerPassword, planTier, maxTrainers, contactEmail, phone, address } = parsed.data;

    try {
      // Check email uniqueness
      const existing = await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1);
      if (existing.length > 0) return res.status(409).json({ message: "Użytkownik z tym adresem e-mail już istnieje" });

      const hashed = await hashPassword(ownerPassword);
      const [ownerUser] = await db.insert(users).values({
        email: ownerEmail,
        password: hashed,
        firstName: ownerFirstName,
        lastName: ownerLastName,
        role: "gym_owner",
        emailVerified: true,
      }).returning();

      const [gym] = await db.insert(gyms).values({
        name: gymName,
        ownerId: ownerUser.id,
        contactEmail: contactEmail ?? ownerEmail,
        phone: phone ?? null,
        address: address ?? null,
        planTier,
        maxTrainers,
      }).returning();

      res.status(201).json({ gym, owner: { id: ownerUser.id, email: ownerUser.email } });
    } catch (error) {
      console.error("Error creating gym:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // PATCH /api/admin/gyms/:id — update gym plan/limits
  app.patch("/api/admin/gyms/:id", isAuthenticated, requireAdmin, async (req, res) => {
    const schema = z.object({
      name: z.string().min(2).optional(),
      planTier: z.enum(["starter", "pro", "enterprise"]).optional(),
      maxTrainers: z.number().int().min(1).max(500).optional(),
      contactEmail: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Nieprawidłowe dane" });
    try {
      const [updated] = await db.update(gyms).set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(gyms.id, String(req.params.id))).returning();
      if (!updated) return res.status(404).json({ message: "Siłownia nie znaleziona" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating gym:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // DELETE /api/admin/gyms/:id
  app.delete("/api/admin/gyms/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const [deleted] = await db.delete(gyms).where(eq(gyms.id, String(req.params.id))).returning();
      if (!deleted) return res.status(404).json({ message: "Siłownia nie znaleziona" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting gym:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // ── STUDIO: public self-registration ──────────────────────────────────────
  // POST /api/gym/register — a studio/gym owner creates their own account + studio.
  // Same email-ownership proof as normal registration: no session until verified.
  app.post("/api/gym/register", authRateLimit, async (req, res) => {
    const schema = z.object({
      gymName: z.string().trim().min(2, "Nazwa studia jest wymagana").max(255),
      firstName: z.string().trim().min(1, "Imię jest wymagane").max(100),
      lastName: z.string().trim().min(1, "Nazwisko jest wymagane").max(100),
      email: z.string().trim().email("Nieprawidłowy adres email"),
      password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków"),
      phone: z.string().trim().max(50).optional(),
      address: z.string().trim().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane", errors: parsed.error.issues });
    }
    const { gymName, firstName, lastName, email, password, phone, address } = parsed.data;

    try {
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Użytkownik z tym adresem email już istnieje" });
      }

      const hashedPassword = await hashPassword(password);
      const owner = await db.transaction(async (tx) => {
        const [ownerUser] = await tx.insert(users).values({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role: "gym_owner",
          emailVerified: false,
        }).returning();
        await tx.insert(gyms).values({
          name: gymName,
          ownerId: ownerUser.id,
          contactEmail: email.toLowerCase(),
          phone: phone || null,
          address: address || null,
          planTier: "starter",
          maxTrainers: 5,
        });
        return ownerUser;
      });

      const verificationToken = generateVerificationToken();
      await storage.setEmailVerificationToken(owner.id, verificationToken, getTokenExpiry());
      const emailSent = await sendVerificationEmail({ email: owner.email, firstName: owner.firstName, token: verificationToken });
      if (!emailSent) console.warn("[GYM-REGISTER] Failed to send verification email to:", owner.email);

      return res.status(201).json({
        id: owner.id,
        email: owner.email,
        role: owner.role,
        requiresEmailVerification: true,
        message: "Studio zostało utworzone. Sprawdź skrzynkę email, aby aktywować konto.",
      });
    } catch (error) {
      console.error("Error registering gym:", error);
      return res.status(500).json({ message: "Nie udało się utworzyć studia" });
    }
  });

  // ── GYM OWNER: Own gym management ─────────────────────────────────────────

  // Helper: get gym for current gym_owner
  async function getOwnerGym(userId: string) {
    const [gym] = await db.select().from(gyms).where(eq(gyms.ownerId, userId)).limit(1);
    return gym ?? null;
  }

  // PATCH /api/gym/me — owner edits studio details (plan and limits stay under our control)
  app.patch("/api/gym/me", isAuthenticated, requireGymOwner, async (req, res) => {
    const schema = z.object({
      name: z.string().trim().min(2).max(255).optional(),
      contactEmail: z.string().trim().email().max(255).nullable().optional(),
      phone: z.string().trim().max(50).nullable().optional(),
      address: z.string().trim().max(500).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Nieprawidłowe dane studia" });

    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      const emptyToNull = (value: string | null | undefined) => (value === undefined ? undefined : value || null);
      const [updated] = await db
        .update(gyms)
        .set({
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.contactEmail !== undefined ? { contactEmail: emptyToNull(parsed.data.contactEmail) } : {}),
          ...(parsed.data.phone !== undefined ? { phone: emptyToNull(parsed.data.phone) } : {}),
          ...(parsed.data.address !== undefined ? { address: emptyToNull(parsed.data.address) } : {}),
          updatedAt: new Date(),
        })
        .where(eq(gyms.id, gym.id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating gym:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // GET /api/gym/me — gym info + summary stats
  app.get("/api/gym/me", isAuthenticated, requireGymOwner, async (req, res) => {
    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      const [activeCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.gymId, gym.id), eq(gymTrainers.status, "active")));

      const [invitedCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.gymId, gym.id), eq(gymTrainers.status, "invited")));

      // Total clients across all gym trainers
      const trainerRows = await db
        .select({ trainerId: gymTrainers.trainerId })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.gymId, gym.id), eq(gymTrainers.status, "active")));
      const trainerIds = trainerRows.map((r) => r.trainerId).filter(Boolean) as string[];

      let totalClients = 0;
      if (trainerIds.length > 0) {
        const [clientRes] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(clientRelationships)
          .where(and(inArray(clientRelationships.trainerId, trainerIds), eq(clientRelationships.status, "active")));
        totalClients = clientRes?.count ?? 0;
      }

      res.json({
        ...gym,
        stats: {
          activeTrainers: activeCount?.count ?? 0,
          invitedTrainers: invitedCount?.count ?? 0,
          totalClients,
        },
      });
    } catch (error) {
      console.error("Error fetching gym:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // GET /api/gym/trainers — list trainers with per-trainer stats
  app.get("/api/gym/trainers", isAuthenticated, requireGymOwner, async (req, res) => {
    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      const rows = await db
        .select({
          id: gymTrainers.id,
          status: gymTrainers.status,
          inviteEmail: gymTrainers.inviteEmail,
          inviteCode: gymTrainers.inviteCode,
          invitedAt: gymTrainers.invitedAt,
          joinedAt: gymTrainers.joinedAt,
          trainerId: gymTrainers.trainerId,
          trainerEmail: users.email,
          trainerFirstName: users.firstName,
          trainerLastName: users.lastName,
          trainerProfileImageUrl: users.profileImageUrl,
          trainerClientCount: users.clientCount,
          trainerSubscriptionTier: users.subscriptionTier,
          trainerCreatedAt: users.createdAt,
        })
        .from(gymTrainers)
        .leftJoin(users, eq(users.id, gymTrainers.trainerId))
        .where(eq(gymTrainers.gymId, gym.id))
        .orderBy(desc(gymTrainers.invitedAt));

      // Get session counts for last 30 days per trainer
      const activeTrainerIds = rows
        .filter((r) => r.trainerId && r.status === "active")
        .map((r) => r.trainerId as string);

      const sessionCounts: Record<string, number> = {};
      if (activeTrainerIds.length > 0) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Get sessions via client relationships
        const clientRels = await db
          .select({ trainerId: clientRelationships.trainerId, clientId: clientRelationships.clientId })
          .from(clientRelationships)
          .where(and(inArray(clientRelationships.trainerId, activeTrainerIds), eq(clientRelationships.status, "active")));

        const clientsByTrainer: Record<string, string[]> = {};
        clientRels.forEach((r) => {
          if (!clientsByTrainer[r.trainerId]) clientsByTrainer[r.trainerId] = [];
          clientsByTrainer[r.trainerId].push(r.clientId);
        });

        const allClientIds = clientRels.map((r) => r.clientId);
        if (allClientIds.length > 0) {
          const sessions = await db
            .select({ clientId: workoutSessions.clientId, count: sql<number>`count(*)::int` })
            .from(workoutSessions)
            .where(and(inArray(workoutSessions.clientId, allClientIds), gte(workoutSessions.completedAt, thirtyDaysAgo)))
            .groupBy(workoutSessions.clientId);

          sessions.forEach((s) => {
            for (const [trainerId, clientIds] of Object.entries(clientsByTrainer)) {
              if (clientIds.includes(s.clientId)) {
                sessionCounts[trainerId] = (sessionCounts[trainerId] ?? 0) + s.count;
              }
            }
          });
        }
      }

      res.json(
        rows.map((r) => ({
          ...r,
          sessionsLast30Days: sessionCounts[r.trainerId ?? ""] ?? 0,
        }))
      );
    } catch (error) {
      console.error("Error fetching gym trainers:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // POST /api/gym/trainers/invite — invite trainer by email
  app.post("/api/gym/trainers/invite", isAuthenticated, requireGymOwner, async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Nieprawidłowy adres e-mail" });

    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      // Check trainer limit
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.gymId, gym.id), inArray(gymTrainers.status, ["active", "invited"])));
      if ((countRow?.count ?? 0) >= gym.maxTrainers) {
        return res.status(409).json({ message: `Osiągnięto limit trenerów (${gym.maxTrainers}) dla Twojego pakietu` });
      }

      // Check if already invited
      const existing = await db
        .select()
        .from(gymTrainers)
        .where(and(eq(gymTrainers.gymId, gym.id), eq(gymTrainers.inviteEmail, parsed.data.email.toLowerCase())))
        .limit(1);
      if (existing.length > 0) return res.status(409).json({ message: "Ten trener jest już zaproszony lub aktywny" });

      const inviteCode = randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
      const [entry] = await db.insert(gymTrainers).values({
        gymId: gym.id,
        trainerId: null,
        status: "invited",
        inviteEmail: parsed.data.email.toLowerCase(),
        inviteCode,
        joinedAt: null,
      }).returning();

      // Best effort: the owner can still hand the code over manually if mail fails
      const emailSent = await sendStudioInvitationEmail({
        email: parsed.data.email.toLowerCase(),
        studioName: gym.name,
        inviteCode,
      });

      res.status(201).json({ ...entry, emailSent });
    } catch (error) {
      console.error("Error inviting trainer:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // POST /api/gym/trainers/:id/resend — send the invitation e-mail again
  app.post("/api/gym/trainers/:id/resend", isAuthenticated, requireGymOwner, authRateLimit, async (req, res) => {
    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      const [invite] = await db
        .select()
        .from(gymTrainers)
        .where(and(eq(gymTrainers.id, String(req.params.id)), eq(gymTrainers.gymId, gym.id), eq(gymTrainers.status, "invited")))
        .limit(1);
      if (!invite || !invite.inviteCode) return res.status(404).json({ message: "Zaproszenie nie istnieje lub zostało już przyjęte" });

      const emailSent = await sendStudioInvitationEmail({ email: invite.inviteEmail, studioName: gym.name, inviteCode: invite.inviteCode });
      res.json({ emailSent });
    } catch (error) {
      console.error("Error resending studio invitation:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // PATCH /api/gym/trainers/:id/status — activate/suspend
  app.patch("/api/gym/trainers/:id/status", isAuthenticated, requireGymOwner, async (req, res) => {
    const schema = z.object({ status: z.enum(["active", "suspended"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Nieprawidłowy status" });

    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      const [membership] = await db
        .select({ trainerId: gymTrainers.trainerId })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.id, String(req.params.id)), eq(gymTrainers.gymId, gym.id)))
        .limit(1);
      if (!membership) return res.status(404).json({ message: "Trener nie znaleziony" });
      if (!membership.trainerId) {
        return res.status(409).json({ message: "Zaproszony trener musi najpierw zaakceptować zaproszenie" });
      }

      const [updated] = await db
        .update(gymTrainers)
        .set({ status: parsed.data.status })
        .where(and(eq(gymTrainers.id, String(req.params.id)), eq(gymTrainers.gymId, gym.id)))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error updating trainer status:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // DELETE /api/gym/trainers/:id — remove trainer from gym
  app.delete("/api/gym/trainers/:id", isAuthenticated, requireGymOwner, async (req, res) => {
    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      const [deleted] = await db
        .delete(gymTrainers)
        .where(and(eq(gymTrainers.id, String(req.params.id)), eq(gymTrainers.gymId, gym.id)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Trener nie znaleziony" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing trainer:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // GET /api/gym/trainer/:trainerId/detail — detailed trainer analytics
  app.get("/api/gym/trainer/:trainerId/detail", isAuthenticated, requireGymOwner, async (req, res) => {
    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      // Verify this trainer belongs to the gym
      const [membership] = await db
        .select()
        .from(gymTrainers)
        .where(and(
          eq(gymTrainers.gymId, gym.id),
          eq(gymTrainers.trainerId, String(req.params.trainerId)),
          eq(gymTrainers.status, "active")
        ))
        .limit(1);
      if (!membership) return res.status(404).json({ message: "Trener nie należy do tej siłowni" });

      const [trainer] = await db.select().from(users).where(eq(users.id, String(req.params.trainerId))).limit(1);
      if (!trainer) return res.status(404).json({ message: "Trener nie znaleziony" });

      // Get clients
      const clients = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          status: clientRelationships.status,
          createdAt: clientRelationships.createdAt,
        })
        .from(clientRelationships)
        .leftJoin(users, eq(users.id, clientRelationships.clientId))
        .where(eq(clientRelationships.trainerId, String(req.params.trainerId)))
        .orderBy(desc(clientRelationships.createdAt));

      const activeClientIds = clients.flatMap((c) => (c.status === "active" && c.id ? [c.id] : [])); // a left join can yield a null id

      // Sessions last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let sessionsLast30 = 0;
      if (activeClientIds.length > 0) {
        const [sRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(workoutSessions)
          .where(and(inArray(workoutSessions.clientId, activeClientIds), gte(workoutSessions.completedAt, thirtyDaysAgo)));
        sessionsLast30 = sRow?.count ?? 0;
      }

      // Plans created
      const [plansRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(trainingPlans)
        .where(eq(trainingPlans.trainerId, String(req.params.trainerId)));

      // Sessions per week for last 8 weeks (chart data)
      const weeklyData: { week: string; sessions: number }[] = [];
      if (activeClientIds.length > 0) {
        for (let w = 7; w >= 0; w--) {
          const from = new Date(Date.now() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
          const to = new Date(Date.now() - w * 7 * 24 * 60 * 60 * 1000);
          const [wRow] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(workoutSessions)
            .where(and(inArray(workoutSessions.clientId, activeClientIds), gte(workoutSessions.completedAt, from), lt(workoutSessions.completedAt, to)));
          const label = `${from.getDate()}.${from.getMonth() + 1}`;
          weeklyData.push({ week: label, sessions: wRow?.count ?? 0 });
        }
      }

      res.json({
        trainer: {
          id: trainer.id,
          email: trainer.email,
          firstName: trainer.firstName,
          lastName: trainer.lastName,
          profileImageUrl: trainer.profileImageUrl,
          clientCount: trainer.clientCount,
          subscriptionTier: trainer.subscriptionTier,
          createdAt: trainer.createdAt,
        },
        membership,
        stats: {
          activeClients: activeClientIds.length,
          totalClients: clients.length,
          sessionsLast30,
          plansCount: plansRow?.count ?? 0,
        },
        clients: clients.slice(0, 20),
        weeklySessionChart: weeklyData,
      });
    } catch (error) {
      console.error("Error fetching trainer detail:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // GET /api/gym/analytics — overall gym analytics
  app.get("/api/gym/analytics", isAuthenticated, requireGymOwner, async (req, res) => {
    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      const trainerRows = await db
        .select({ trainerId: gymTrainers.trainerId })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.gymId, gym.id), eq(gymTrainers.status, "active")));
      const trainerIds = trainerRows.map((r) => r.trainerId).filter(Boolean) as string[];

      let totalClients = 0;
      let totalSessions = 0;
      let totalPlans = 0;
      const trainerBreakdown: any[] = [];

      if (trainerIds.length > 0) {
        // One grouped query per metric instead of several queries per trainer
        const [trainerRowsInfo, clientCounts, sessionCounts, planCounts] = await Promise.all([
          db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(inArray(users.id, trainerIds)),
          db
            .select({ trainerId: clientRelationships.trainerId, count: sql<number>`count(*)::int` })
            .from(clientRelationships)
            .where(and(inArray(clientRelationships.trainerId, trainerIds), eq(clientRelationships.status, "active")))
            .groupBy(clientRelationships.trainerId),
          db
            .select({ trainerId: clientRelationships.trainerId, count: sql<number>`count(${workoutSessions.id})::int` })
            .from(workoutSessions)
            .innerJoin(
              clientRelationships,
              and(eq(clientRelationships.clientId, workoutSessions.clientId), eq(clientRelationships.status, "active")),
            )
            .where(inArray(clientRelationships.trainerId, trainerIds))
            .groupBy(clientRelationships.trainerId),
          db
            .select({ trainerId: trainingPlans.trainerId, count: sql<number>`count(*)::int` })
            .from(trainingPlans)
            .where(inArray(trainingPlans.trainerId, trainerIds))
            .groupBy(trainingPlans.trainerId),
        ]);
        const nameById = new Map(trainerRowsInfo.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));
        const clientsById = new Map(clientCounts.map((r) => [r.trainerId, r.count]));
        const sessionsById = new Map(sessionCounts.map((r) => [r.trainerId, r.count]));
        const plansById = new Map(planCounts.map((r) => [r.trainerId, r.count]));

        for (const tid of trainerIds) {
          const activeClients = clientsById.get(tid) ?? 0;
          const sessionCount = sessionsById.get(tid) ?? 0;
          const plansCount = plansById.get(tid) ?? 0;
          totalClients += activeClients;
          totalSessions += sessionCount;
          totalPlans += plansCount;
          trainerBreakdown.push({ trainerId: tid, name: nameById.get(tid) ?? "—", activeClients, sessionCount, plansCount });
        }
      }

      res.json({
        gymId: gym.id,
        gymName: gym.name,
        planTier: gym.planTier,
        maxTrainers: gym.maxTrainers,
        activeTrainers: trainerIds.length,
        totalClients,
        totalSessions,
        totalPlans,
        trainerBreakdown,
      });
    } catch (error) {
      console.error("Error fetching gym analytics:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // Public lookup: GET /api/gym/join/:code — trainer joins gym via invite code
  app.post("/api/gym/join/:code", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (user.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy mogą dołączyć do siłowni" });

      const [invite] = await db
        .select()
        .from(gymTrainers)
        .where(and(eq(gymTrainers.inviteCode, String(req.params.code).toUpperCase()), eq(gymTrainers.status, "invited")))
        .limit(1);
      if (!invite) return res.status(404).json({ message: "Kod zaproszenia nieaktywny lub nieprawidłowy" });
      if (invite.inviteEmail.toLowerCase() !== user.email.toLowerCase()) return res.status(403).json({ message: "Ten kod zaproszenia jest przeznaczony dla innego adresu e-mail" });

      const [already] = await db
        .select({ id: gymTrainers.id })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.trainerId, user.id), inArray(gymTrainers.status, ["active", "suspended"])))
        .limit(1);
      if (already) return res.status(409).json({ message: "Należysz już do studia. Najpierw z niego wyjdź." });

      const [updated] = await db
        .update(gymTrainers)
        .set({ trainerId: user.id, status: "active", joinedAt: new Date() })
        .where(eq(gymTrainers.id, invite.id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error joining gym:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // ── Studio announcements ────────────────────────────────────────────────
  // POST /api/gym/announcements — owner sends a message to every active trainer of the studio
  app.post("/api/gym/announcements", isAuthenticated, requireGymOwner, async (req, res) => {
    const schema = z.object({
      title: z.string().trim().min(1, "Podaj tytuł").max(150),
      body: z.string().trim().min(1, "Wpisz treść ogłoszenia").max(2000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Nieprawidłowe ogłoszenie" });
    }

    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });

      const [announcement] = await db
        .insert(gymAnnouncements)
        .values({ gymId: gym.id, authorId: user.id, title: parsed.data.title, body: parsed.data.body })
        .returning();

      const members = await db
        .select({ trainerId: gymTrainers.trainerId })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.gymId, gym.id), eq(gymTrainers.status, "active")));
      const trainerIds = members.map((m) => m.trainerId).filter((id): id is string => !!id);

      res.status(201).json({ ...announcement, notifiedTrainers: trainerIds.length });

      const preview = parsed.data.body.length > 140 ? `${parsed.data.body.slice(0, 137)}...` : parsed.data.body;
      for (const trainerId of trainerIds) {
        void sendPushToUserAndRecord(
          trainerId,
          `${gym.name}: ${parsed.data.title}`,
          preview,
          { type: "studio_announcement", announcementId: announcement.id },
          "studio_announcement"
        ).catch((err) => console.error("Failed to push studio announcement:", err));
      }
    } catch (error) {
      console.error("Error creating studio announcement:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // GET /api/gym/announcements — owner's sent announcements, pinned first then newest, with how many trainers have read each
  app.get("/api/gym/announcements", isAuthenticated, requireGymOwner, async (req, res) => {
    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });
      const rows = await db
        .select()
        .from(gymAnnouncements)
        .where(eq(gymAnnouncements.gymId, gym.id))
        .orderBy(desc(gymAnnouncements.pinned), desc(gymAnnouncements.createdAt))
        .limit(30);
      const members = await db
        .select({ trainerId: gymTrainers.trainerId })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.gymId, gym.id), eq(gymTrainers.status, "active")));
      const activeTrainerIds = new Set(members.map((member) => member.trainerId).filter((id): id is string => !!id));
      const reads = rows.length
        ? await db.select().from(gymAnnouncementReads).where(inArray(gymAnnouncementReads.announcementId, rows.map((row) => row.id)))
        : [];
      res.json(
        rows.map((row) => ({
          ...row,
          totalTrainers: activeTrainerIds.size,
          // only trainers who are still members count, so "read by 3 of 2" cannot happen
          readCount: reads.filter((read) => read.announcementId === row.id && activeTrainerIds.has(read.trainerId)).length,
        })),
      );
    } catch (error) {
      console.error("Error listing studio announcements:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // PATCH /api/gym/announcements/:id — pin or unpin
  app.patch("/api/gym/announcements/:id", isAuthenticated, requireGymOwner, async (req, res) => {
    try {
      if (typeof req.body?.pinned !== "boolean") return res.status(400).json({ message: "Pole pinned musi być true lub false" });
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });
      const [updated] = await db
        .update(gymAnnouncements)
        .set({ pinned: req.body.pinned })
        .where(and(eq(gymAnnouncements.id, String(req.params.id)), eq(gymAnnouncements.gymId, gym.id)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Ogłoszenie nie istnieje" });
      res.json(updated);
    } catch (error) {
      console.error("Error pinning studio announcement:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // DELETE /api/gym/announcements/:id
  app.delete("/api/gym/announcements/:id", isAuthenticated, requireGymOwner, async (req, res) => {
    try {
      const user = (req as any).user;
      const gym = await getOwnerGym(user.id);
      if (!gym) return res.status(404).json({ message: "Siłownia nie znaleziona" });
      const removed = await db
        .delete(gymAnnouncements)
        .where(and(eq(gymAnnouncements.id, String(req.params.id)), eq(gymAnnouncements.gymId, gym.id)))
        .returning({ id: gymAnnouncements.id });
      if (removed.length === 0) return res.status(404).json({ message: "Ogłoszenie nie istnieje" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting studio announcement:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // GET /api/trainer/gym/announcements — what the trainer's studio has announced (active members only), pinned first
  app.get("/api/trainer/gym/announcements", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      const [membership] = await db
        .select({ gymId: gymTrainers.gymId })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.trainerId, user.id), eq(gymTrainers.status, "active")))
        .limit(1);
      if (!membership) return res.json([]);
      const rows = await db
        .select({
          id: gymAnnouncements.id,
          title: gymAnnouncements.title,
          body: gymAnnouncements.body,
          pinned: gymAnnouncements.pinned,
          createdAt: gymAnnouncements.createdAt,
          readAt: gymAnnouncementReads.readAt,
        })
        .from(gymAnnouncements)
        .leftJoin(gymAnnouncementReads, and(eq(gymAnnouncementReads.announcementId, gymAnnouncements.id), eq(gymAnnouncementReads.trainerId, user.id)))
        .where(eq(gymAnnouncements.gymId, membership.gymId))
        .orderBy(desc(gymAnnouncements.pinned), desc(gymAnnouncements.createdAt))
        .limit(10);
      res.json(rows.map(({ readAt, ...row }) => ({ ...row, read: !!readAt })));
    } catch (error) {
      console.error("Error fetching studio announcements:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // POST /api/trainer/gym/announcements/:id/read — the trainer opened it (only announcements of their own studio)
  app.post("/api/trainer/gym/announcements/:id/read", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      const [membership] = await db
        .select({ gymId: gymTrainers.gymId })
        .from(gymTrainers)
        .where(and(eq(gymTrainers.trainerId, user.id), eq(gymTrainers.status, "active")))
        .limit(1);
      if (!membership) return res.status(404).json({ message: "Ogłoszenie nie istnieje" });
      const [announcement] = await db
        .select({ id: gymAnnouncements.id })
        .from(gymAnnouncements)
        .where(and(eq(gymAnnouncements.id, String(req.params.id)), eq(gymAnnouncements.gymId, membership.gymId)));
      if (!announcement) return res.status(404).json({ message: "Ogłoszenie nie istnieje" });
      await db.insert(gymAnnouncementReads).values({ announcementId: announcement.id, trainerId: user.id }).onConflictDoNothing();
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking studio announcement as read:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // GET /api/trainer/gym — which studio (if any) the logged-in trainer belongs to
  app.get("/api/trainer/gym", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      const [row] = await db
        .select({ membershipId: gymTrainers.id, status: gymTrainers.status, gymId: gyms.id, gymName: gyms.name })
        .from(gymTrainers)
        .innerJoin(gyms, eq(gyms.id, gymTrainers.gymId))
        .where(and(eq(gymTrainers.trainerId, user.id), inArray(gymTrainers.status, ["active", "suspended"])))
        .limit(1);
      res.json(row ? { gym: { id: row.gymId, name: row.gymName }, status: row.status } : { gym: null });
    } catch (error) {
      console.error("Error fetching trainer gym:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // GET /api/trainer/gym/invitations — pending studio invitations addressed to this trainer's e-mail
  app.get("/api/trainer/gym/invitations", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      const rows = await db
        .select({ id: gymTrainers.id, inviteCode: gymTrainers.inviteCode, gymName: gyms.name })
        .from(gymTrainers)
        .innerJoin(gyms, eq(gyms.id, gymTrainers.gymId))
        .where(and(eq(gymTrainers.status, "invited"), eq(sql`lower(${gymTrainers.inviteEmail})`, user.email.toLowerCase())));
      res.json(rows);
    } catch (error) {
      console.error("Error fetching studio invitations:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });

  // DELETE /api/trainer/gym — trainer leaves their studio (clients and plans stay with the trainer)
  app.delete("/api/trainer/gym", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (user?.role !== "trainer") return res.status(403).json({ message: "Tylko trenerzy" });
      await db.delete(gymTrainers).where(eq(gymTrainers.trainerId, user.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving gym:", error);
      res.status(500).json({ message: "Błąd serwera" });
    }
  });
}
