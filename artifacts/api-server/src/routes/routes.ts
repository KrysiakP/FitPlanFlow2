import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { db } from "../db";
import { setupAuth, isAuthenticated, hashPassword, comparePassword, getSessionFromStore, unsignSessionCookie } from "../auth";
import { generateVerificationToken, getTokenExpiry, sendVerificationEmail, sendPasswordResetEmail, getPasswordResetTokenExpiry, sendWelcomeEmail, sendTrainerNotificationEmail, sendTrainerWelcomeEmail } from "../email";
// Object Storage - code adapted from javascript_object_storage blueprint
import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";
import { ObjectPermission } from "../objectAcl";
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseCookie } from "cookie";
import { sql } from "drizzle-orm";
import {
  insertTrainingPlanSchema,
  insertWorkoutSchema,
  insertExerciseSchema,
  insertPlanAssignmentSchema,
  insertExerciseLibrarySchema,
  insertUserProfileSchema,
  updateUserProfileSchema,
  insertClientProgressSchema,
  updateClientProgressSchema,
  insertExerciseLogSchema,
  insertWeeklyReportSchema,
  updateUserRoleSchema,
  registerSchema,
  loginSchema,
  insertPlanWithWorkoutsSchema,
  insertPlanInvitationSchema,
  insertCharityDonationSchema,
  insertDietPlanSchema,
  insertDietMealSchema,
  insertDietSupplementSchema,
  insertDailyHabitLogSchema,
  insertMealCheckmarkSchema,
  insertMedicalTestSchema,
  insertClientPaymentSchema,
  insertMessageSchema,
  insertWorkoutSessionSchema,
  sessions,
} from "@workspace/db";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import express from "express";
import { checkPaymentNotifications } from "../services/paymentNotifications";
import { deleteTestClient } from "../testClientService";
import { getDemoClient, getDemoTrainingPlans, getDemoWeeklyReports, getDemoDietPlan, getDemoMedicalTests, getDemoPayments, isDemoId, DEMO_CLIENT_ID } from "../demoDataService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2024-11-20.acacia' as any 
});

async function sendExpoPush(tokens: string[], title: string, body: string, data?: Record<string, string>) {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => ({ to, sound: "default" as const, title, body, data: data ?? {} }));
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "accept-encoding": "gzip, deflate" },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("Push send error:", err);
  }
}

async function sendPushToUserAndRecord(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  notificationType?: string
): Promise<void> {
  const [tokens] = await Promise.all([
    storage.getPushTokensByUser(userId),
    storage.createPushNotificationHistory({
      userId,
      title,
      body,
      type: notificationType ?? data?.type ?? null,
    }).catch((err: unknown) => console.error("Failed to record push history:", err)),
  ]);
  if (tokens.length > 0) {
    void sendExpoPush(tokens.map((t) => t.token), title, body, data);
  }
}

// Helper function to extract tier from Stripe subscription
function getTierFromSubscription(subscription: Stripe.Subscription): string {
  // First check metadata
  if (subscription.metadata?.tier) {
    return subscription.metadata.tier;
  }
  
  // Fallback: map price ID to tier
  const priceId = subscription.items.data[0]?.price?.id;
  if (!priceId) {
    return 'start'; // Default fallback
  }
  
  const priceToTierMap: Record<string, string> = {
    [process.env.STRIPE_SOLO_PRICE_ID || 'price_test_solo']: 'solo',
    [process.env.STRIPE_PRO_PRICE_ID || 'price_test_pro']: 'pro',
    [process.env.STRIPE_ELITE_PRICE_ID || 'price_test_elite']: 'elite',
    [process.env.STRIPE_MAX_PRICE_ID || 'price_test_max']: 'max',
    [process.env.STRIPE_STUDIO_PRICE_ID || 'price_test_studio']: 'studio',
  };
  
  return priceToTierMap[priceId] || 'start';
}

const uploadsDir = path.join(process.cwd(), "attached_assets", "uploads");

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
  const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const allowedDocumentTypes = ["application/pdf"];
  const allowedTypes = [...allowedVideoTypes, ...allowedImageTypes, ...allowedDocumentTypes];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Nieprawidłowy typ pliku. Dozwolone są tylko wideo (mp4, mov, avi, webm), obrazy (jpg, jpeg, png, webp) i dokumenty PDF"));
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Wymagane uwierzytelnienie" });
  }
  
  storage.getUser(req.session.userId).then(user => {
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Tylko administratorzy mają dostęp do tej funkcji" });
    }
    next();
  }).catch(error => {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Błąd sprawdzania uprawnień" });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment readiness probes
  app.get('/api/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Stripe webhook - MUST be before setupAuth
  app.post('/api/webhooks/stripe', async (req, res) => {
    try {
      // SECURITY: Require STRIPE_WEBHOOK_SECRET - fail fast if not configured
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('CRITICAL: STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ message: "Webhook secret not configured" });
      }

      const signature = req.headers['stripe-signature'];
      
      if (!signature) {
        return res.status(400).json({ message: "Brak sygnatury webhook" });
      }

      let event: Stripe.Event;

      // ALWAYS verify webhook signature - no fallback
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).json({ message: "Nieprawidłowa sygnatura webhook" });
      }

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.client_reference_id || session.metadata?.userId;
          const tier = session.metadata?.tier || 'start';
          
          if (userId && session.subscription) {
            await storage.updateUserSubscription(userId, {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: 'active',
              subscriptionTier: tier,
              trialEndsAt: null, // Clear trial when subscription is activated
              subscriptionCancelledAt: null, // Clear cancellation date
            });
          }
          break;
        }

        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.userId;
          const tier = getTierFromSubscription(subscription);
          
          if (userId) {
            await storage.updateUserSubscription(userId, {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: 'active',
              subscriptionTier: tier,
              trialEndsAt: null, // Clear trial when subscription is activated
              subscriptionCancelledAt: null, // Clear cancellation date
            });
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.userId;
          const status = subscription.status;
          
          if (userId) {
            // Determine if we need to set the cancellation date
            // IMPORTANT: We only SET the cancellation date here, never CLEAR it
            // Clearing is done only in invoice.paid to avoid race conditions
            const problemStatuses = ['canceled', 'past_due', 'unpaid', 'incomplete_expired'];
            const hasSubscriptionProblem = problemStatuses.includes(status);
            
            const updateData: any = {
              subscriptionStatus: status,
            };
            
            if (hasSubscriptionProblem) {
              // Use Stripe's canceled_at timestamp if available, otherwise use current date
              // This ensures idempotency - same timestamp regardless of when we process the event
              const stripeTimestamp = subscription.canceled_at 
                ? new Date(subscription.canceled_at * 1000)
                : new Date();
              
              // Only set if not already set (preserves earliest problem timestamp)
              const currentUser = await storage.getUser(userId);
              if (!currentUser?.subscriptionCancelledAt) {
                updateData.subscriptionCancelledAt = stripeTimestamp;
              }
              // If already set, preserve the existing timestamp to maintain the grace period
            }
            // Note: We do NOT clear subscriptionCancelledAt here even if status is active
            // This is intentional - clearing is done only by invoice.paid to avoid race conditions
            // with invoice.payment_failed which could re-set the timestamp immediately after
            
            await storage.updateUserSubscription(userId, updateData);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.userId;
          
          if (userId) {
            // Get current user to check if cancellation date is already set
            const currentUser = await storage.getUser(userId);
            
            // Use Stripe's canceled_at timestamp if available
            const stripeTimestamp = subscription.canceled_at 
              ? new Date(subscription.canceled_at * 1000)
              : new Date();
            
            await storage.updateUserSubscription(userId, {
              subscriptionStatus: 'canceled',
              subscriptionTier: 'start',
              // Preserve existing cancellation date if already set (maintains grace period)
              subscriptionCancelledAt: currentUser?.subscriptionCancelledAt || stripeTimestamp,
            });
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          
          if (subscriptionId) {
            // Fetch subscription to get metadata
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.userId;
            
            if (!userId) {
              console.error('CRITICAL: Missing userId in subscription metadata for invoice.payment_failed event', {
                subscriptionId,
                invoiceId: invoice.id,
              });
              return res.status(400).json({ message: 'Missing user metadata' });
            }
            
            // Get current user to check if cancellation date is already set
            const currentUser = await storage.getUser(userId);
            
            await storage.updateUserSubscription(userId, {
              subscriptionStatus: 'past_due',
              // Only set if not already set to preserve the original grace period start
              subscriptionCancelledAt: currentUser?.subscriptionCancelledAt || new Date(),
            });
          }
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as any;
          const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          
          if (subscriptionId) {
            // Fetch subscription to get metadata
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.userId;
            
            if (!userId) {
              console.error('CRITICAL: Missing userId in subscription metadata for invoice.paid event', {
                subscriptionId,
                invoiceId: invoice.id,
              });
              return res.status(400).json({ message: 'Missing user metadata' });
            }
            
            await storage.updateUserSubscription(userId, {
              subscriptionStatus: 'active',
              subscriptionCancelledAt: null, // Clear cancellation date on successful payment
            });

            // ISSUE 4 FIX: Check for referral bonus eligibility (trainer qualifies on FIRST paid invoice only)
            try {
              // GUARD 1: Check if user has pending referral event
              const referralEvent = await storage.getPendingReferralEventByUser(userId);
              if (!referralEvent) {
                console.log(`[REFERRAL] No pending referral event for user ${userId}, skipping bonus`);
                break;
              }

              // GUARD 2: Check if this is the FIRST paid invoice for this customer
              // We check by counting paid invoices for this customer in Stripe
              const customerId = invoice.customer;
              const paidInvoices = await stripe.invoices.list({
                customer: customerId,
                status: 'paid',
                limit: 10, // We only need to check if there's more than 1
              });

              const paidInvoiceCount = paidInvoices.data.length;
              
              if (paidInvoiceCount > 1) {
                console.log(`[REFERRAL] User ${userId} has ${paidInvoiceCount} paid invoices, not first payment - skipping referral bonus`);
                break;
              }

              console.log(`[REFERRAL] Found pending referral event for user ${userId} with FIRST payment, processing bonus...`);
              
              // ANTI-FRAUD: Capture payment fingerprint from Stripe
              let paymentFingerprint: string | undefined;
              try {
                if (invoice.payment_intent) {
                  const paymentIntent = await stripe.paymentIntents.retrieve(
                    invoice.payment_intent as string,
                    { expand: ['latest_charge'] }
                  );
                  // Access fingerprint from latest_charge (expanded)
                  const latestCharge = paymentIntent.latest_charge;
                  if (latestCharge && typeof latestCharge !== 'string') {
                    paymentFingerprint = latestCharge.payment_method_details?.card?.fingerprint ?? undefined;
                  }
                  
                  if (paymentFingerprint) {
                    console.log(`[REFERRAL] Captured payment fingerprint for event ${referralEvent.id}: ${paymentFingerprint}`);
                    
                    // Update referral event metadata with payment fingerprint
                    const existingMetadata = referralEvent.metadata && typeof referralEvent.metadata === 'object' 
                      ? referralEvent.metadata as Record<string, unknown>
                      : {};
                    await storage.updateReferralEventMetadata(referralEvent.id, {
                      ...existingMetadata,
                      paymentFingerprint
                    });
                  } else {
                    console.warn(`[REFERRAL] No payment fingerprint found for invoice ${invoice.id} (may be non-card payment)`);
                  }
                }
              } catch (fingerprintError) {
                console.error('[REFERRAL] Error capturing payment fingerprint:', fingerprintError);
              }
              
              // GUARD 3: ATOMIC process bonus (idempotent - won't double-process)
              const success = await storage.processReferralBonus(referralEvent.id, 30);
              if (success) {
                // Notify referrer (outside transaction - non-critical)
                try {
                  const referredUser = await storage.getUser(userId);
                  if (referredUser) {
                    storage.notifyReferralBonus(
                      referralEvent.referrerTrainerId,
                      30,
                      `${referredUser.firstName} ${referredUser.lastName}`
                    );
                  }
                } catch (notifyError) {
                  console.error('[REFERRAL] Error sending notification (bonus already granted):', notifyError);
                }
              } else {
                console.log(`[REFERRAL] Event ${referralEvent.id} was already processed, skipping bonus (race condition avoided)`);
              }
            } catch (error) {
              console.error('[REFERRAL] Error processing referral bonus on invoice.paid:', error);
            }
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Błąd przetwarzania webhook Stripe:", error);
      res.status(500).json({ message: "Błąd przetwarzania webhook" });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Object Storage endpoints - code adapted from javascript_object_storage blueprint
  // Serves objects with ACL check
  app.get("/objects/*objectPath", isAuthenticated, async (req, res) => {
    // Gets the authenticated user id from session (custom email/password auth)
    const userId = req.session.userId;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      
      // FIX: Check ACL policy first to allow public objects without ownership check
      // This allows trainers to see client photos when visibility is "public"
      const aclPolicy = await objectStorageService.getObjectAclPolicy(objectFile);
      
      // If the object has public visibility, allow READ access without additional checks
      // This enables trainers to view client photos marked as public
      if (aclPolicy?.visibility === "public") {
        return objectStorageService.downloadObject(objectFile, res);
      }
      
      // For private objects, perform full ACL check including ownership
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Returns presigned URL for object upload
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Extract object path from upload URL
      // uploadURL format: https://storage.googleapis.com/<bucket>/<path>?signature=...
      // We need to convert this to /objects/<entityId> format for ACL checks
      const url = new URL(uploadURL);
      const pathParts = url.pathname.split('/').filter(p => p); // Remove empty strings
      
      // pathname format: /<bucket>/.private/uploads/<uuid>
      // We need to extract just "uploads/<uuid>" part (everything after PRIVATE_OBJECT_DIR)
      // PRIVATE_OBJECT_DIR format: /<bucket>/.private
      const privateDir = objectStorageService.getPrivateObjectDir();
      const privateDirParts = privateDir.split('/').filter(p => p); // e.g., ["bucket-name", ".private"]
      
      // Skip the bucket and .private parts to get the entity ID
      const entityId = pathParts.slice(privateDirParts.length).join('/'); // e.g., "uploads/uuid"
      const objectPath = `/objects/${entityId}`;
      
      // Generate preview URL for immediate preview after upload (without checking file existence)
      const previewUrl = await objectStorageService.generateReadUrlFromPath(objectPath);
      
      res.json({ 
        uploadURL,
        objectPath,
        previewUrl
      });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Błąd podczas generowania URL uploadu" });
    }
  });

  // Updates photo paths in weekly report and sets ACL policy
  app.put("/api/weekly-reports/:id/photos", isAuthenticated, async (req, res) => {
    if (!req.body.photoUrl) {
      return res.status(400).json({ message: "photoUrl jest wymagane" });
    }

    // Gets the authenticated user id from session (custom email/password auth)
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Wymagane uwierzytelnienie" });
    }

    try {
      // SECURITY FIX: Fetch report and verify authorization BEFORE setting ACL policy
      // This prevents IDOR where attacker could set themselves as photo owner
      const reportId = req.params.id;
      const report = await storage.getWeeklyReport(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Raport nie znaleziony" });
      }

      // AUTHORIZATION CHECK: Verify user has permission to modify this report
      // Allowed users: report owner (client) OR assigned trainer
      const user = await storage.getUser(userId);
      
      // Check 1: Is the user the owner of this report (client)?
      const isOwner = report.clientId === userId;
      
      // Check 2: Is the user a trainer with an ACTIVE relationship to this client?
      // CRITICAL: Verify ACTIVE trainer-client relationship to prevent stale assignment IDOR
      // This ensures archived trainers cannot modify their former clients' reports
      let isAssignedTrainer = false;
      if (user?.role === 'trainer') {
        const relationship = await storage.getClientRelationship(userId, report.clientId);
        isAssignedTrainer = relationship?.status === 'active';
      }
      
      // Deny access if user is neither owner nor assigned trainer
      if (!isOwner && !isAssignedTrainer) {
        return res.status(403).json({ message: "Nie masz uprawnień do modyfikacji tego raportu" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // CRITICAL: Normalize and validate URL
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.photoUrl);
      
      // Reject if normalization failed (null returned)
      if (!normalizedPath) {
        console.warn(`Invalid object URL rejected: ${req.body.photoUrl}`);
        return res.status(400).json({ message: "Nieprawidłowy URL zdjęcia" });
      }
      
      // CRITICAL: Get existing object file to verify owner
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        const existingAcl = await objectStorageService.getObjectAclPolicy(objectFile);
        
        // CRITICAL: Verify object owner matches report client
        if (existingAcl && existingAcl.owner !== report.clientId) {
          console.error(`Object owner mismatch: ${existingAcl.owner} !== ${report.clientId}`);
          return res.status(403).json({ message: "Nie możesz użyć zdjęcia innego użytkownika" });
        }
      } catch (error) {
        // Object doesn't exist yet - this is OK for new uploads
        console.info(`New object upload: ${normalizedPath}`);
      }
      
      // Set ACL policy
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoUrl,
        {
          owner: report.clientId, // CRITICAL: Always use report.clientId
          visibility: "public",
        }
      );
      
      // Reject if ACL policy setting failed
      if (!objectPath) {
        console.error(`Failed to set ACL policy for: ${req.body.photoUrl}`);
        return res.status(400).json({ message: "Nie udało się ustawić uprawnień do zdjęcia" });
      }

      // Update the report with the new photo path
      await storage.updateWeeklyReport(reportId, report.clientId, { photoUrl: objectPath });

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting weekly report photo:", error);
      res.status(500).json({ message: "Błąd podczas zapisywania zdjęcia" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", isAuthenticated, (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ 
            message: "Plik jest za duży. Maksymalny rozmiar to 50MB dla wideo i 5MB dla obrazów" 
          });
        }
        return res.status(400).json({ message: `Błąd uploadu: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nie przesłano pliku" });
      }

      const isVideo = req.file.mimetype.startsWith("video/");
      const isImage = req.file.mimetype.startsWith("image/");
      const maxImageSize = 5 * 1024 * 1024;

      if (isImage && req.file.size > maxImageSize) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: "Obraz jest za duży. Maksymalny rozmiar to 5MB" 
        });
      }

      const fileUrl = `/attached_assets/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    });
  });

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
      
      const referralCodeStr = req.query.ref as string | undefined;
      let referralCode = null;
      
      if (referralCodeStr) {
        referralCode = await storage.getReferralCodeByCode(referralCodeStr);
        if (!referralCode) {
          console.warn(`Invalid referral code attempted: ${referralCodeStr}`);
        }
      }
      
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
        trialEndsAt: null,
        referredByTrainerId: referralCode ? referralCode.trainerId : null,
        referralBonusDays: 0,
        hasFreeAccess: false,
        subscriptionCancelledAt: null,
        emailVerified: false,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      });

      if (role === 'trainer') {
        // Promotional period: registration before Jan 30, 2026 gets free access until Jan 31, 2026
        const promoRegistrationDeadline = new Date('2026-01-30T23:59:59Z');
        const promoTrialEndDate = new Date('2026-01-31T23:59:59Z');
        const now = new Date();
        
        let trialEndsAt: Date;
        if (now <= promoRegistrationDeadline) {
          // User registered during promotional period - give free access until Jan 31, 2026
          trialEndsAt = promoTrialEndDate;
          console.log(`[REGISTER] Promotional trial granted until ${promoTrialEndDate.toISOString()}`);
        } else {
          // Standard 30-day trial
          trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);
        }
        await storage.updateUserSubscription(user.id, { trialEndsAt });
        // Demo data is now generated on-the-fly, no need to create test clients
      }

      if (referralCode) {
        // SECURITY: Validate referral event before creation
        const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
        const validation = await storage.validateReferralEvent(
          referralCode.trainerId,
          user.id,
          email,
          ipAddress
        );

        if (!validation.valid) {
          console.warn(`[SECURITY] Referral validation failed for user ${user.id}: ${validation.reason}`);
          // Continue registration but don't create referral event
        } else {
          // Create referral event with security metadata
          const emailHash = require('crypto').createHash('sha256').update(email.toLowerCase()).digest('hex');
          await storage.createReferralEvent({
            referralCodeId: referralCode.id,
            referrerTrainerId: referralCode.trainerId,
            referredUserId: user.id,
            referredRole: role as 'trainer' | 'client',
            status: 'pending',
            metadata: {
              ipAddress,
              emailHash,
              registeredAt: new Date().toISOString(),
            },
          });
          
          // Update lastUsedAt timestamp on referral code
          await storage.updateReferralCodeLastUsed(referralCode.id);
        }
      }

      // Generate and set email verification token
      const verificationToken = generateVerificationToken();
      const tokenExpiry = getTokenExpiry();
      await storage.setEmailVerificationToken(user.id, verificationToken, tokenExpiry);

      // Send verification email
      const emailSent = await sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        token: verificationToken,
      });

      if (!emailSent) {
        console.warn("[REGISTER] Failed to send verification email to:", user.email);
      }

      // Don't create session - user must verify email first
      const { password: _, ...userWithoutPassword } = user;
      console.log("[REGISTER] User registered, verification email sent:", user.id);
      res.status(201).json({ 
        ...userWithoutPassword,
        requiresEmailVerification: true,
        message: "Konto zostało utworzone. Sprawdź swoją skrzynkę email, aby aktywować konto."
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Nie udało się zarejestrować użytkownika" });
    }
  });

  // Mobile-specific registration endpoint: skips email verification, auto-logs in
  app.post("/api/auth/register", async (req, res) => {
    try {
      const mobileRegisterSchema = z.object({
        email: z.string().email("Nieprawidłowy adres email"),
        password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
        firstName: z.string().min(1, "Imię jest wymagane"),
        role: z.enum(["client", "trainer"]).optional().default("client"),
      });

      const validationResult = mobileRegisterSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors,
        });
      }

      const { email, password, firstName, role } = validationResult.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Użytkownik z tym adresem email już istnieje" });
      }

      const hashedPassword = await hashPassword(password);

      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName: "",
        role,
        trialEndsAt: null,
        referredByTrainerId: null,
        referralBonusDays: 0,
        hasFreeAccess: false,
        subscriptionCancelledAt: null,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      });

      // Auto-login: create session
      req.session.userId = user.id;
      await new Promise<void>((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve()))
      );

      // Auto-accept any pending invitations for this email
      try {
        const pendingInvitations = await storage.getClientInvitations(email);
        for (const inv of pendingInvitations) {
          try {
            await storage.acceptInvitation(inv.id, user.id);
            const clientName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
            // Notify trainer via push
            void sendPushToUserAndRecord(
              inv.trainerId,
              "Nowy podopieczny!",
              `${user.firstName} zaakceptował(a) Twoje zaproszenie i dołączył(a) do aplikacji.`,
              { type: "invitation_accepted", clientId: user.id },
              "invitation_accepted"
            );
            // Send welcome email to client and notification to trainer
            const trainer = await storage.getUser(inv.trainerId).catch(() => null);
            const trainerName = trainer
              ? `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email
              : "Twój trener";
            if (user.email && user.firstName) {
              void sendWelcomeEmail({
                email: user.email,
                firstName: user.firstName,
                trainerName,
              });
            }
            if (trainer?.email && trainer?.firstName) {
              void sendTrainerNotificationEmail({
                email: trainer.email,
                trainerFirstName: trainer.firstName,
                clientName,
              });
            }
          } catch (invErr) {
            console.warn("[MOBILE-REGISTER] Could not auto-accept invitation:", inv.id, invErr);
          }
        }
      } catch (invLookupErr) {
        console.warn("[MOBILE-REGISTER] Could not look up invitations:", invLookupErr);
      }

      // Send welcome email to newly registered trainers
      if (role === "trainer" && user.email && user.firstName) {
        void sendTrainerWelcomeEmail({
          email: user.email,
          firstName: user.firstName,
        });
      }

      const { password: _, ...userWithoutPassword } = user;
      console.log("[MOBILE-REGISTER] User registered and logged in:", user.id);
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error in mobile register:", error);
      return res.status(500).json({ message: "Nie udało się zarejestrować użytkownika" });
    }
  });

  app.post("/api/login", async (req, res) => {
    console.log("[LOGIN] Received login request:", { email: req.body?.email });
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("[LOGIN] Validation failed:", validationResult.error.errors);
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

      // Check if email is verified
      if (!user.emailVerified) {
        console.log("[LOGIN] Email not verified for user:", user.id);
        return res.status(403).json({ 
          message: "Twój adres email nie został jeszcze potwierdzony. Sprawdź skrzynkę pocztową lub poproś o ponowne wysłanie linku.",
          requiresEmailVerification: true,
          email: user.email
        });
      }

      req.session.userId = user.id;
      
      // Explicitly save session before responding to ensure cookie is set
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).json({ message: "Nie udało się zapisać sesji" });
        }
        const { password: _, ...userWithoutPassword } = user;
        console.log("[LOGIN] Session saved successfully for user:", user.id);
        res.json(userWithoutPassword);
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


  // Push notification token registration
  app.post("/api/push-tokens", isAuthenticated, async (req, res) => {
    try {
      const { token, platform } = req.body as { token?: string; platform?: string };
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Brak tokenu" });
      }
      const platformValue = typeof platform === "string" ? platform : "unknown";
      const userId = req.session.userId!;
      const record = await storage.upsertPushToken(userId, token, platformValue);
      res.json(record);
    } catch (error) {
      console.error("Error storing push token:", error);
      res.status(500).json({ message: "Nie udało się zapisać tokenu" });
    }
  });

  // Workout reminder push notification — trainer sends reminder to a client
  app.post("/api/trainer/clients/:clientId/remind", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą wysyłać przypomnienia" });
      }
      const { clientId } = req.params;
      if (isDemoId(clientId)) {
        return res.json({ sent: 0, message: "Demo client — no push sent" });
      }
      const trainerClients = await storage.getTrainerClients(userId);
      if (!trainerClients.some((c) => c.id === clientId)) {
        return res.status(403).json({ message: "Możesz wysyłać przypomnienia tylko do własnych podopiecznych" });
      }
      const assignment = await storage.getClientAssignment(clientId);
      let planName = "swój plan treningowy";
      if (assignment?.planId) {
        const plan = await storage.getTrainingPlan(assignment.planId);
        if (plan?.name) planName = plan.name;
      }
      const message = (req.body?.message as string | undefined) ?? `Czas na trening: ${planName}!`;
      await sendPushToUserAndRecord(clientId, "Przypomnienie o treningu", message, { type: "workout_reminder", clientId }, "workout_reminder");
      const tokens = await storage.getPushTokensByUser(clientId);
      res.json({ sent: tokens.length });
    } catch (error) {
      console.error("Error sending workout reminder:", error);
      res.status(500).json({ message: "Nie udało się wysłać przypomnienia" });
    }
  });

  // Bulk workout reminder — trainer sends reminder to all active clients
  app.post("/api/trainer/clients/remind-all", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą wysyłać przypomnienia" });
      }
      const trainerClients = await storage.getTrainerClients(userId);
      const message = (req.body?.message as string | undefined) ?? "Czas na trening! Nie zapomnij o dzisiejszej sesji.";
      let sent = 0;
      await Promise.all(
        trainerClients.map(async (client) => {
          if (isDemoId(client.id)) return;
          try {
            await sendPushToUserAndRecord(
              client.id,
              "Przypomnienie o treningu",
              message,
              { type: "workout_reminder", clientId: client.id },
              "workout_reminder"
            );
            const tokens = await storage.getPushTokensByUser(client.id);
            sent += tokens.length;
          } catch {
            // Skip individual client errors
          }
        })
      );
      res.json({ sent, total: trainerClients.length });
    } catch (error) {
      console.error("Error sending bulk reminder:", error);
      res.status(500).json({ message: "Nie udało się wysłać przypomnień" });
    }
  });

  // Email verification endpoint
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ message: "Brak tokenu weryfikacyjnego" });
      }

      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Nieprawidłowy token weryfikacyjny" });
      }

      // Check if token has expired
      if (user.emailVerificationTokenExpiresAt && new Date() > new Date(user.emailVerificationTokenExpiresAt)) {
        return res.status(400).json({ 
          message: "Token weryfikacyjny wygasł. Poproś o ponowne wysłanie.",
          tokenExpired: true
        });
      }

      // Verify the user's email
      await storage.verifyUserEmail(user.id);
      
      console.log("[VERIFY] Email verified for user:", user.id);
      res.json({ 
        message: "Adres email został pomyślnie zweryfikowany. Możesz się teraz zalogować.",
        verified: true
      });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Wystąpił błąd podczas weryfikacji" });
    }
  });

  // Resend verification email endpoint
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Brak adresu email" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ message: "Jeśli konto istnieje, email weryfikacyjny został wysłany." });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Ten adres email jest już zweryfikowany." });
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const tokenExpiry = getTokenExpiry();
      await storage.setEmailVerificationToken(user.id, verificationToken, tokenExpiry);

      // Send verification email
      const emailSent = await sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        token: verificationToken,
      });

      if (!emailSent) {
        console.warn("[RESEND] Failed to send verification email to:", user.email);
        return res.status(500).json({ message: "Nie udało się wysłać emaila weryfikacyjnego." });
      }

      console.log("[RESEND] Verification email resent to:", user.email);
      res.json({ message: "Email weryfikacyjny został wysłany. Sprawdź swoją skrzynkę pocztową." });
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ message: "Wystąpił błąd podczas wysyłania emaila" });
    }
  });

  // Zod schemas for password reset endpoints
  const forgotPasswordSchema = z.object({
    email: z.string().email("Nieprawidłowy format adresu email"),
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token jest wymagany"),
    newPassword: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  });

  // Forgot password endpoint - request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const parseResult = forgotPasswordSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const errorMessage = parseResult.error.errors[0]?.message || "Nieprawidłowe dane";
        return res.status(400).json({ message: errorMessage });
      }

      const { email } = parseResult.data;

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent user enumeration
      if (!user) {
        console.log("[FORGOT_PASSWORD] No user found for email:", email);
        return res.json({ message: "Jeśli konto istnieje, email z linkiem do resetowania hasła został wysłany." });
      }

      // Generate password reset token
      const resetToken = generateVerificationToken();
      const tokenExpiry = getPasswordResetTokenExpiry();

      // Send password reset email FIRST (before saving token to DB)
      const emailSent = await sendPasswordResetEmail({
        email: user.email,
        firstName: user.firstName,
        token: resetToken,
      });

      if (!emailSent) {
        console.warn("[FORGOT_PASSWORD] Failed to send password reset email to:", user.email);
        return res.status(500).json({ message: "Nie udało się wysłać emaila. Spróbuj ponownie później." });
      }

      // Only save token to DB AFTER email is successfully sent
      await storage.setPasswordResetToken(user.id, resetToken, tokenExpiry);

      console.log("[FORGOT_PASSWORD] Password reset email sent to:", user.email);
      res.json({ message: "Jeśli konto istnieje, email z linkiem do resetowania hasła został wysłany." });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Wystąpił błąd podczas przetwarzania żądania" });
    }
  });

  // Reset password endpoint - set new password using token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const parseResult = resetPasswordSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const errorMessage = parseResult.error.errors[0]?.message || "Nieprawidłowe dane";
        return res.status(400).json({ message: errorMessage });
      }

      const { token, newPassword } = parseResult.data;

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Nieprawidłowy lub wygasły link do resetowania hasła" });
      }

      // Check if token has expired
      if (!user.passwordResetTokenExpiresAt || new Date() > new Date(user.passwordResetTokenExpiresAt)) {
        // Clear the expired token to prevent potential reuse attempts
        await storage.clearPasswordResetToken(user.id);
        return res.status(400).json({ message: "Token wygasł. Poproś o nowy link resetujący hasło." });
      }

      // Hash the new password and update user (this also clears the reset token)
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);

      // Invalidate all existing sessions for this user for enhanced security
      await db.delete(sessions).where(sql`sess->>'userId' = ${user.id}`);

      console.log("[RESET_PASSWORD] Password reset successfully for user:", user.id);
      res.json({ message: "Hasło zostało zmienione. Możesz się teraz zalogować." });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Wystąpił błąd podczas zmiany hasła" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        // User was deleted, destroy session
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
          return res.status(401).json({ user: null, message: "Użytkownik nie istnieje" });
        });
        return;
      }
      
      let profileImageDisplayUrl = null;
      if (user.profileImageUrl) {
        const objectStorageService = new ObjectStorageService();
        profileImageDisplayUrl = await objectStorageService.getObjectReadUrl(user.profileImageUrl);
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        ...userWithoutPassword,
        profileImageDisplayUrl,
      });
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

  // Client access status check - checks if client should be blocked due to trainer's expired subscription
  app.get("/api/client/access-status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'client') {
        // Not a client, access is OK
        return res.json({ blocked: false, reason: null, daysRemaining: null });
      }
      
      // Get the client's trainer
      const trainer = await storage.getTrainerForClient(userId);
      
      if (!trainer) {
        // No trainer found, access is OK (orphaned client)
        return res.json({ blocked: false, reason: null, daysRemaining: null });
      }
      
      // If trainer has free access, client is never blocked
      if (trainer.hasFreeAccess) {
        return res.json({ blocked: false, reason: null, daysRemaining: null });
      }
      
      // Check if trainer's subscription is cancelled/past_due/unpaid
      const problemStatuses = ['canceled', 'past_due', 'unpaid'];
      const hasSubscriptionProblem = trainer.subscriptionStatus && problemStatuses.includes(trainer.subscriptionStatus);
      
      if (!hasSubscriptionProblem) {
        // Trainer's subscription is OK
        return res.json({ blocked: false, reason: null, daysRemaining: null });
      }
      
      // Check if 7-day grace period has passed
      if (trainer.subscriptionCancelledAt) {
        const cancelledAt = new Date(trainer.subscriptionCancelledAt);
        const now = new Date();
        const daysSinceCancellation = Math.floor((now.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = 7 - daysSinceCancellation;
        
        if (daysSinceCancellation >= 7) {
          // More than 7 days since cancellation, block access
          return res.json({
            blocked: true,
            reason: 'trainer_subscription_expired',
            daysRemaining: 0,
            trainerName: `${trainer.firstName} ${trainer.lastName}`
          });
        } else {
          // Within grace period, warn but don't block
          return res.json({
            blocked: false,
            reason: 'trainer_subscription_warning',
            daysRemaining: daysRemaining,
            trainerName: `${trainer.firstName} ${trainer.lastName}`
          });
        }
      }
      
      // No cancellation date set, access is OK for now
      return res.json({ blocked: false, reason: null, daysRemaining: null });
    } catch (error) {
      console.error("Error checking client access status:", error);
      res.status(500).json({ message: "Błąd sprawdzania statusu dostępu" });
    }
  });

  // Subscription endpoints
  app.post("/api/subscription/create-checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      if (user.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą subskrybować" });
      }

      const { tier } = req.body;
      
      // Validate tier
      const validTiers = ['solo', 'pro', 'elite', 'max', 'studio'];
      if (!tier || !validTiers.includes(tier)) {
        return res.status(400).json({ message: "Nieprawidłowy plan subskrypcji" });
      }

      let stripeCustomerId = user.stripeCustomerId;

      // Create Stripe Customer if doesn't exist
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        stripeCustomerId = customer.id;
        
        // Update user with stripeCustomerId
        await storage.updateUserSubscription(userId, {
          stripeCustomerId: stripeCustomerId,
        });
      }

      // Map tier to Stripe price ID
      const priceIdMap: Record<string, string> = {
        solo: process.env.STRIPE_SOLO_PRICE_ID || 'price_test_solo',
        pro: process.env.STRIPE_PRO_PRICE_ID || 'price_test_pro',
        elite: process.env.STRIPE_ELITE_PRICE_ID || 'price_test_elite',
        max: process.env.STRIPE_MAX_PRICE_ID || 'price_test_max',
        studio: process.env.STRIPE_STUDIO_PRICE_ID || 'price_test_studio',
      };

      const priceId = priceIdMap[tier];
      
      // Determine the base URL for redirects
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/`,
        cancel_url: `${baseUrl}/pricing`,
        client_reference_id: userId,
        metadata: {
          userId: userId,
          tier: tier,
        },
        subscription_data: {
          metadata: {
            userId: userId,
            tier: tier,
          },
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Nie udało się utworzyć sesji" });
    }
  });

  app.post("/api/subscription/portal", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      if (user.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą zarządzać subskrypcją" });
      }

      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: "Brak konta Stripe" });
      }

      // Determine the base URL for redirects
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';

      // Create Billing Portal Session
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/trainer-dashboard`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Nie udało się utworzyć sesji portalu" });
    }
  });

  app.get("/api/subscription/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      res.json({
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Nie udało się pobrać statusu subskrypcji" });
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
          const workouts = await storage.getWorkoutsByPlanId(plan.id);
          const workoutsWithExercises = await Promise.all(
            workouts.map(async (workout) => {
              const exercises = await storage.getExercisesByWorkoutId(workout.id);
              return { ...workout, exercises };
            })
          );
          const assignments = await storage.getAssignmentsByPlan(plan.id);
          return {
            ...plan,
            workouts: workoutsWithExercises,
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
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      const plan = await storage.getTrainingPlan(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (plan.trainerId !== userId) {
        if (user?.role === 'client') {
          const assignment = await storage.getClientAssignment(userId);
          if (!assignment || assignment.planId !== id) {
            return res.status(403).json({ message: "Access denied" });
          }
        } else {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const workouts = await storage.getWorkoutsByPlanId(id);
      const workoutsWithExercises = await Promise.all(
        workouts.map(async (workout) => {
          const exercises = await storage.getExercisesByWorkoutId(workout.id);
          return { ...workout, exercises };
        })
      );
      
      res.json({ ...plan, workouts: workoutsWithExercises });
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

      const validationResult = insertTrainingPlanSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }
      
      const plan = await storage.createTrainingPlan(validationResult.data, userId);
      res.status(201).json(plan);
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

      const validationResult = insertTrainingPlanSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }
      
      const updatedPlan = await storage.updateTrainingPlan(id, validationResult.data);
      res.json(updatedPlan);
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

  app.post("/api/plans/:id/copy", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can copy plans" });
      }

      const originalPlan = await storage.getTrainingPlan(id);
      if (!originalPlan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (originalPlan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only copy your own plans" });
      }

      const copiedPlan = await storage.copyTrainingPlan(id, userId);
      res.status(201).json(copiedPlan);
    } catch (error) {
      console.error("Error copying plan:", error);
      res.status(500).json({ message: "Failed to copy plan" });
    }
  });

  app.post("/api/plans/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can create plans" });
      }

      const validationResult = insertPlanWithWorkoutsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }
      
      const newPlan = await storage.createTrainingPlanWithWorkouts(userId, validationResult.data);
      res.status(201).json(newPlan);
    } catch (error) {
      console.error("Error creating plan with workouts:", error);
      res.status(500).json({ message: "Failed to create plan with workouts" });
    }
  });

  app.put("/api/plans/:id/bulk", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can update plans" });
      }

      const plan = await storage.getTrainingPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validationResult = insertPlanWithWorkoutsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }
      
      const updatedPlan = await storage.updateTrainingPlanWithWorkouts(id, userId, validationResult.data);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating plan with workouts:", error);
      res.status(500).json({ message: "Failed to update plan with workouts" });
    }
  });

  // Workout routes
  app.get("/api/plans/:planId/workouts", isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access workouts" });
      }

      const plan = await storage.getTrainingPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only access workouts from your own plans" });
      }

      const workouts = await storage.getWorkoutsByPlanId(planId);
      res.json(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      res.status(500).json({ message: "Failed to fetch workouts" });
    }
  });

  app.post("/api/plans/:planId/workouts", isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can create workouts" });
      }

      const plan = await storage.getTrainingPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only add workouts to your own plans" });
      }

      const validationResult = insertWorkoutSchema.omit({ planId: true }).safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const workout = await storage.createWorkout(planId, validationResult.data);
      res.status(201).json(workout);
    } catch (error) {
      console.error("Error creating workout:", error);
      res.status(500).json({ message: "Failed to create workout" });
    }
  });

  app.get("/api/workouts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access workouts" });
      }

      const workout = await storage.getWorkoutById(id);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only access your own workouts" });
      }

      const exercises = await storage.getExercisesByWorkoutId(id);
      res.json({ ...workout, exercises });
    } catch (error) {
      console.error("Error fetching workout:", error);
      res.status(500).json({ message: "Failed to fetch workout" });
    }
  });

  app.put("/api/workouts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can update workouts" });
      }

      const workout = await storage.getWorkoutById(id);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only update your own workouts" });
      }

      const validationResult = insertWorkoutSchema.omit({ planId: true }).partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedWorkout = await storage.updateWorkout(id, validationResult.data);
      res.json(updatedWorkout);
    } catch (error) {
      console.error("Error updating workout:", error);
      res.status(500).json({ message: "Failed to update workout" });
    }
  });

  app.delete("/api/workouts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can delete workouts" });
      }

      const workout = await storage.getWorkoutById(id);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only delete your own workouts" });
      }

      await storage.deleteWorkout(id);
      res.json({ message: "Workout deleted" });
    } catch (error) {
      console.error("Error deleting workout:", error);
      res.status(500).json({ message: "Failed to delete workout" });
    }
  });

  // Exercise routes
  app.get("/api/workouts/:workoutId/exercises", isAuthenticated, async (req, res) => {
    try {
      const { workoutId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can access exercises" });
      }

      const workout = await storage.getWorkoutById(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only access exercises from your own workouts" });
      }

      const exercises = await storage.getExercisesByWorkoutId(workoutId);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  app.post("/api/workouts/:workoutId/exercises", isAuthenticated, async (req, res) => {
    try {
      const { workoutId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can create exercises" });
      }

      const workout = await storage.getWorkoutById(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only add exercises to your own workouts" });
      }

      const exerciseSchema = z.array(insertExerciseSchema);
      const validationResult = exerciseSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const exercises = await storage.createExercises(workoutId, validationResult.data);
      res.status(201).json(exercises);
    } catch (error) {
      console.error("Error creating exercises:", error);
      res.status(500).json({ message: "Failed to create exercises" });
    }
  });

  app.put("/api/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can update exercises" });
      }

      const exercise = await storage.getExerciseById(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      const workout = await storage.getWorkoutById(exercise.workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validationResult = insertExerciseSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedExercise = await storage.updateExercise(id, validationResult.data);
      res.json(updatedExercise);
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ message: "Failed to update exercise" });
    }
  });

  app.delete("/api/exercises/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can delete exercises" });
      }

      const exercise = await storage.getExerciseById(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      const workout = await storage.getWorkoutById(exercise.workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }

      const plan = await storage.getTrainingPlan(workout.planId);
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteExercise(id);
      res.json({ message: "Exercise deleted" });
    } catch (error) {
      console.error("Error deleting exercise:", error);
      res.status(500).json({ message: "Failed to delete exercise" });
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
      
      // Generate presigned URLs for videos
      const objectStorageService = new ObjectStorageService();
      const exercisesWithUrls = await Promise.all(
        exercises.map(async (exercise) => {
          if (exercise.videoUrl && exercise.videoUrl.startsWith('/objects/')) {
            const presignedUrl = await objectStorageService.getObjectReadUrl(exercise.videoUrl);
            return { ...exercise, videoUrl: presignedUrl || exercise.videoUrl };
          }
          return exercise;
        })
      );
      
      res.json(exercisesWithUrls);
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

      // If videoUrl is object storage path, set ACL policy
      if (exercise.videoUrl && exercise.videoUrl.startsWith('/objects/')) {
        const objectStorageService = new ObjectStorageService();
        try {
          await objectStorageService.trySetObjectEntityAclPolicy(
            exercise.videoUrl,
            {
              owner: userId,
              visibility: "public",
            }
          );
        } catch (error) {
          console.error("Failed to set ACL for exercise video:", error);
          // Continue - video URL is saved, ACL can be set later if needed
        }
      }

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

      // Generate presigned URL for video
      if (exercise.videoUrl && exercise.videoUrl.startsWith('/objects/')) {
        const objectStorageService = new ObjectStorageService();
        const presignedUrl = await objectStorageService.getObjectReadUrl(exercise.videoUrl);
        if (presignedUrl) {
          exercise.videoUrl = presignedUrl;
        }
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

  // Updates video URL in exercise library and sets ACL policy
  app.put("/api/exercises/library/:id/video", isAuthenticated, async (req, res) => {
    if (!req.body.videoUrl) {
      return res.status(400).json({ message: "videoUrl jest wymagane" });
    }

    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Wymagane uwierzytelnienie" });
    }

    try {
      const exerciseId = req.params.id;
      const exercise = await storage.getExerciseFromLibrary(exerciseId);
      
      if (!exercise) {
        return res.status(404).json({ message: "Ćwiczenie nie znalezione" });
      }

      const user = await storage.getUser(userId);
      
      // Only trainer who owns this exercise can update video
      if (user?.role !== 'trainer' || exercise.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do modyfikacji tego ćwiczenia" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Normalize and validate URL
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.videoUrl);
      
      if (!normalizedPath) {
        console.warn(`Invalid video URL rejected: ${req.body.videoUrl}`);
        return res.status(400).json({ message: "Nieprawidłowy URL filmu" });
      }
      
      // Get existing object file to verify owner (if exists)
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        const existingAcl = await objectStorageService.getObjectAclPolicy(objectFile);
        
        // Verify object owner matches trainer
        if (existingAcl && existingAcl.owner !== userId) {
          console.error(`Object owner mismatch: ${existingAcl.owner} !== ${userId}`);
          return res.status(403).json({ message: "Nie możesz użyć filmu innego użytkownika" });
        }
      } catch (error) {
        // Object doesn't exist yet - OK for new uploads
        console.info(`New video upload: ${normalizedPath}`);
      }
      
      // Set ACL policy (public visibility for exercise videos)
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.videoUrl,
        {
          owner: userId, // Trainer is owner
          visibility: "public", // Exercise videos are public
        }
      );
      
      if (!objectPath) {
        console.error(`Failed to set ACL policy for: ${req.body.videoUrl}`);
        return res.status(400).json({ message: "Nie udało się ustawić uprawnień do filmu" });
      }

      // Update the exercise with the new video path
      await storage.updateExerciseLibrary(exerciseId, { videoUrl: objectPath });

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting exercise video:", error);
      res.status(500).json({ message: "Błąd podczas zapisywania filmu" });
    }
  });

  // Get trainer information for client
  app.get("/api/my-trainer", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą zobaczyć informacje o swoim trenerze" });
      }

      const trainer = await storage.getTrainerForClient(userId);
      
      if (!trainer) {
        return res.status(404).json({ message: "Nie masz przypisanego trenera" });
      }

      // Return trainer info without sensitive data
      res.json({
        id: trainer.id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        profileImageUrl: trainer.profileImageUrl,
      });
    } catch (error) {
      console.error("Error fetching trainer info:", error);
      res.status(500).json({ message: "Nie udało się pobrać informacji o trenerze" });
    }
  });

  // User profile routes
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getUserProfile(userId);
      
      // Generate presigned URL for profileImageUrl if it exists
      let profileImageDisplayUrl = null;
      if (profile?.profileImageUrl) {
        const objectStorageService = new ObjectStorageService();
        profileImageDisplayUrl = await objectStorageService.getObjectReadUrl(profile.profileImageUrl);
      }
      
      res.json(profile ? {
        ...profile,
        profileImageDisplayUrl,
      } : null);
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

      const updatedProfile = await storage.upsertUserProfile(userId, validationResult.data);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/profile/photo", isAuthenticated, async (req, res) => {
    console.log("[PHOTO_UPLOAD] Received request:", { photoUrl: req.body.photoUrl, userId: req.session.userId });
    
    if (!req.body.photoUrl) {
      console.error("[PHOTO_UPLOAD] Missing photoUrl");
      return res.status(400).json({ message: "photoUrl jest wymagane" });
    }

    const userId = req.session.userId;
    if (!userId) {
      console.error("[PHOTO_UPLOAD] No userId in session");
      return res.status(401).json({ message: "Wymagane uwierzytelnienie" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      
      console.log("[PHOTO_UPLOAD] Normalizing path:", req.body.photoUrl);
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.photoUrl);
      console.log("[PHOTO_UPLOAD] Normalized path:", normalizedPath);
      
      if (!normalizedPath) {
        console.warn(`[PHOTO_UPLOAD] Invalid object URL rejected: ${req.body.photoUrl}`);
        return res.status(400).json({ message: "Nieprawidłowy URL zdjęcia" });
      }
      
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
        const existingAcl = await objectStorageService.getObjectAclPolicy(objectFile);
        
        if (existingAcl && existingAcl.owner !== userId) {
          console.error(`Object owner mismatch: ${existingAcl.owner} !== ${userId}`);
          return res.status(403).json({ message: "Nie możesz użyć zdjęcia innego użytkownika" });
        }
      } catch (error) {
        console.info(`New object upload: ${normalizedPath}`);
      }
      
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.photoUrl,
        {
          owner: userId,
          visibility: "public",
        }
      );
      
      if (!objectPath) {
        console.error(`Failed to set ACL policy for: ${req.body.photoUrl}`);
        return res.status(400).json({ message: "Nie udało się ustawić uprawnień do zdjęcia" });
      }

      const publicUrl = await objectStorageService.getObjectReadUrl(objectPath);
      
      if (!publicUrl) {
        console.error(`Failed to generate public URL for: ${objectPath}`);
        return res.status(500).json({ message: "Nie udało się wygenerować publicznego URL" });
      }

      await storage.updateUserProfile(userId, { profileImageUrl: objectPath });

      res.status(200).json({
        objectPath: objectPath,
        publicUrl: publicUrl,
      });
    } catch (error) {
      console.error("Error setting profile photo:", error);
      res.status(500).json({ message: "Błąd podczas zapisywania zdjęcia" });
    }
  });

  // View another user's profile (with authorization)
  app.get("/api/profile/:userId", isAuthenticated, async (req, res) => {
    try {
      const requesterId = req.session.userId!;
      const targetUserId = req.params.userId;

      // Can always view own profile
      if (targetUserId === requesterId) {
        const profile = await storage.getUserProfile(targetUserId);
        const user = await storage.getUser(targetUserId);
        
        if (!user) {
          return res.status(404).json({ message: "Użytkownik nie został znaleziony" });
        }

        let profileImageDisplayUrl = null;
        if (profile?.profileImageUrl) {
          const objectStorageService = new ObjectStorageService();
          profileImageDisplayUrl = await objectStorageService.getObjectReadUrl(profile.profileImageUrl);
        }

        return res.json({
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            profileImageUrl: user.profileImageUrl,
            profileImageDisplayUrl,
          },
          profile: profile ? {
            ...profile,
            profileImageDisplayUrl,
          } : null,
        });
      }

      // SECURITY FIX: Explicit relationship verification for cross-user profile access
      const requester = await storage.getUser(requesterId);
      if (!requester) {
        return res.status(401).json({ message: "Użytkownik nie został znaleziony" });
      }

      // Trainer viewing client profile - COMPLETE validation: verify relationship pairs THIS trainer with THIS client
      if (requester.role === 'trainer') {
        const relationship = await storage.getClientRelationship(requesterId, targetUserId);
        
        // CRITICAL: Validate ALL three conditions explicitly
        // Don't rely solely on getClientRelationship filtering - defense in depth
        if (!relationship ||
            relationship.clientId !== targetUserId ||      // Target IS the client in this relationship
            relationship.trainerId !== requesterId ||      // Requester IS the trainer in this relationship
            relationship.status !== 'active') {            // Relationship is currently active
          return res.status(403).json({ message: "Brak dostępu do tego profilu" });
        }
      }
      // Client viewing trainer profile - COMPLETE validation: verify relationship pairs THIS client with THIS trainer
      else if (requester.role === 'client') {
        const relationship = await storage.getClientRelationship(targetUserId, requesterId);
        
        // CRITICAL: Validate ALL three conditions explicitly
        // Don't rely solely on getClientRelationship filtering - defense in depth
        if (!relationship ||
            relationship.trainerId !== targetUserId ||     // Target IS the trainer in this relationship
            relationship.clientId !== requesterId ||       // Requester IS the client in this relationship
            relationship.status !== 'active') {            // Relationship is currently active
          return res.status(403).json({ message: "Brak dostępu do tego profilu" });
        }
      }
      // Neither trainer nor client - deny access
      else {
        return res.status(403).json({ message: "Brak dostępu do tego profilu" });
      }

      // Fetch and return authorized profile
      const targetUser = await storage.getUser(targetUserId);
      const targetProfile = await storage.getUserProfile(targetUserId);

      if (!targetUser) {
        return res.status(404).json({ message: "Użytkownik nie został znaleziony" });
      }

      let profileImageDisplayUrl = null;
      if (targetProfile?.profileImageUrl) {
        const objectStorageService = new ObjectStorageService();
        profileImageDisplayUrl = await objectStorageService.getObjectReadUrl(targetProfile.profileImageUrl);
      }

      res.json({
        user: {
          id: targetUser.id,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          email: targetUser.email,
          role: targetUser.role,
          profileImageUrl: targetUser.profileImageUrl,
          profileImageDisplayUrl,
        },
        profile: targetProfile ? {
          ...targetProfile,
          profileImageDisplayUrl,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Nie udało się pobrać profilu użytkownika" });
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
      
      // Demo client progress: return empty progress with isDemo flag
      if (isDemoId(clientId)) {
        return res.json({
          id: "demo-progress-001",
          clientId: DEMO_CLIENT_ID,
          currentWeight: 80.5,
          targetWeight: 78,
          height: 180,
          notes: "Podopieczny demonstracyjny - postępy są tylko przykładowe",
          createdAt: new Date(),
          updatedAt: new Date(),
          isDemo: true,
        });
      }
      
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

  // Trainer viewing client exercise logs
  app.get("/api/trainer/clients/:clientId/exercise-logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can view client exercise logs" });
      }

      const { clientId } = req.params;
      
      // Demo client: return empty logs array
      if (isDemoId(clientId)) {
        return res.json([]);
      }
      
      const trainerClients = await storage.getTrainerClients(userId);
      const isTrainerClient = trainerClients.some(client => client.id === clientId);
      
      if (!isTrainerClient) {
        return res.status(403).json({ message: "You can only view exercise logs of your own clients" });
      }

      const logs = await storage.getAllClientExerciseLogs(clientId);
      const sortedLogs = logs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

      res.json(sortedLogs);
    } catch (error) {
      console.error("Error fetching client exercise logs:", error);
      res.status(500).json({ message: "Failed to fetch client exercise logs" });
    }
  });

  // Trainer viewing client profile
  app.get("/api/clients/:clientId/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can view client profiles" });
      }

      const { clientId } = req.params;
      
      // Demo client: return demo profile
      if (isDemoId(clientId)) {
        return res.json({
          id: "demo-profile-001",
          userId: DEMO_CLIENT_ID,
          bio: "Podopieczny demonstracyjny - aktywny sportowiec amator",
          goals: "Redukcja tkanki tłuszczowej, poprawa siły i wytrzymałości",
          fitnessLevel: "intermediate",
          isDemo: true,
        });
      }
      
      const trainerClients = await storage.getTrainerClients(userId);
      const isTrainerClient = trainerClients.some(client => client.id === clientId);
      
      if (!isTrainerClient) {
        return res.status(403).json({ message: "You can only view profiles of your own clients" });
      }

      const profile = await storage.getUserProfile(clientId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ message: "Failed to fetch client profile" });
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
      
      // Guard: Cannot assign plans to demo clients
      if (clientIds.some(id => isDemoId(id))) {
        return res.status(400).json({ message: "Nie można modyfikować danych demonstracyjnych" });
      }
      
      const plan = await storage.getTrainingPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "You can only assign your own plans" });
      }

      const assignments = await storage.createBulkAssignments(planId, clientIds);
      res.json(assignments);
      // Fire-and-forget push to each assigned client
      void Promise.all(
        clientIds.map((clientId) =>
          sendPushToUserAndRecord(
            clientId,
            "Nowy plan treningowy!",
            `Twój trener przypisał Ci plan: ${plan.name}`,
            { type: "plan_assigned", planId },
            "plan_assigned"
          )
        )
      );
    } catch (error) {
      console.error("Error creating assignments:", error);
      res.status(500).json({ message: "Failed to create assignments" });
    }
  });

  app.delete("/api/assignments/client/:clientId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Only trainers can remove plan assignments" });
      }

      const { clientId } = req.params;
      
      // Guard: Cannot modify demo data
      if (isDemoId(clientId)) {
        return res.status(400).json({ message: "Nie można modyfikować danych demonstracyjnych" });
      }
      
      // Verify the trainer has a relationship with this client
      const trainerClients = await storage.getTrainerClients(userId);
      const isTrainerClient = trainerClients.some(client => client.id === clientId);
      
      if (!isTrainerClient) {
        return res.status(403).json({ message: "You can only remove assignments from your own clients" });
      }

      await storage.deleteClientAssignment(clientId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing assignment:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });

  // Client routes
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
      
      const assignment = await storage.getClientAssignment(client.id);
      let assignmentWithPlan = undefined;
      
      if (assignment) {
        const plan = await storage.getTrainingPlan(assignment.planId);
        if (plan) {
          assignmentWithPlan = { ...assignment, plan };
        }
      }
      
      res.json({ 
        ...clientWithoutPassword,
        assignment: assignmentWithPlan 
      });
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
      
      // If no real clients, return demo client
      if (clients.length === 0) {
        const demoClient = getDemoClient(userId);
        const demoPlans = getDemoTrainingPlans(userId);
        const demoClientWithAssignment = {
          ...demoClient,
          assignment: demoPlans.length > 0 ? {
            id: "demo-assignment-001",
            clientId: DEMO_CLIENT_ID,
            planId: demoPlans[0].id,
            trainerId: userId,
            assignedAt: new Date(),
            plan: demoPlans[0],
          } : undefined,
        };
        return res.json([demoClientWithAssignment]);
      }
      
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

  // Delete test client for trainer (also handles demo client deletion request)
  app.delete("/api/trainer/test-client", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać podopiecznego testowego" });
      }

      // Check if this is a request to delete demo client - just return success
      // since demo data is virtual and doesn't exist in DB
      const clients = await storage.getTrainerClients(userId);
      if (clients.length === 0) {
        return res.status(200).json({ message: "Dane demonstracyjne zostały ukryte" });
      }

      const result = await deleteTestClient(userId);
      
      if (!result.success) {
        return res.status(404).json({ message: result.error || "Nie znaleziono podopiecznego testowego" });
      }
      
      res.status(200).json({ message: "Podopieczny testowy został usunięty" });
    } catch (error) {
      console.error("Error deleting test client:", error);
      res.status(500).json({ message: "Nie udało się usunąć podopiecznego testowego" });
    }
  });

  app.post("/api/clients/:clientId/archive", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą archiwizować podopiecznych" });
      }

      const { clientId } = req.params;
      
      // Guard: Cannot modify demo data
      if (isDemoId(clientId)) {
        return res.status(400).json({ message: "Nie można modyfikować danych demonstracyjnych" });
      }
      
      await storage.archiveClientRelationship(userId, clientId);
      
      res.status(200).json({ message: "Współpraca została zakończona" });
    } catch (error) {
      console.error("Error archiving client relationship:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Nie udało się zakończyć współpracy" });
    }
  });

  // Invitations routes
  app.post("/api/invitations/send", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą wysyłać zaproszenia" });
      }

      // Check trainer client limit before sending invitation
      const limitCheck = await storage.checkTrainerClientLimit(userId);
      if (!limitCheck.withinLimit) {
        return res.status(403).json({ 
          message: `Osiągnąłeś limit podopiecznych (${limitCheck.currentCount}/${limitCheck.maxCount}). Ulepsz konto do Premium, aby mieć nieograniczoną liczbę podopiecznych.`,
          currentCount: limitCheck.currentCount,
          maxCount: limitCheck.maxCount,
          limitReached: true
        });
      }

      const validationResult = insertPlanInvitationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const invitation = await storage.createInvitation(userId, validationResult.data);
      res.status(200).json(invitation);
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Nie udało się wysłać zaproszenia" });
    }
  });

  app.get("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Użytkownik nie znaleziony" });
      }

      let invitations;
      
      if (user.role === "client") {
        invitations = await storage.getClientInvitations(user.email);
        
        const invitationsWithDetails = await Promise.all(
          invitations.map(async (invitation) => {
            // Plan może być null - zaproszenie bez planu
            const plan = invitation.planId ? await storage.getTrainingPlan(invitation.planId) : null;
            const trainer = await storage.getUser(invitation.trainerId);
            
            if (!trainer) {
              return null;
            }
            
            const { password: _, ...trainerWithoutPassword } = trainer;
            
            return {
              ...invitation,
              plan: plan || undefined,
              trainer: trainerWithoutPassword,
            };
          })
        );
        
        res.json(invitationsWithDetails.filter(inv => inv !== null));
      } else if (user.role === "trainer") {
        invitations = await storage.getTrainerInvitations(userId);
        
        const invitationsWithDetails = await Promise.all(
          invitations.map(async (invitation) => {
            // Plan może być null - zaproszenie bez planu
            const plan = invitation.planId ? await storage.getTrainingPlan(invitation.planId) : null;
            
            return {
              ...invitation,
              plan: plan || undefined,
            };
          })
        );
        
        res.json(invitationsWithDetails);
      } else {
        return res.status(403).json({ message: "Nieznana rola użytkownika" });
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Nie udało się pobrać zaproszeń" });
    }
  });

  app.delete("/api/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą anulować zaproszenia" });
      }
      const { id } = req.params;
      await storage.cancelInvitation(id, userId);
      res.json({ message: "Zaproszenie anulowane" });
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      res.status(500).json({ message: "Nie udało się anulować zaproszenia" });
    }
  });

  app.post("/api/invitations/:id/accept", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą akceptować zaproszenia" });
      }

      const { id } = req.params;
      
      try {
        const invitationBefore = await storage.getInvitation(id);
        await storage.acceptInvitation(id, userId);
        res.status(200).json({ message: "Zaproszenie zaakceptowane" });
        // Fire-and-forget push and emails
        if (invitationBefore?.trainerId) {
          const clientName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || (user?.email ?? "Nowy klient");
          void sendPushToUserAndRecord(
            invitationBefore.trainerId,
            "Nowy podopieczny!",
            `${clientName} zaakceptował(a) Twoje zaproszenie.`,
            { type: "invitation_accepted", clientId: userId },
            "invitation_accepted"
          );
          // Fetch trainer data once for both emails
          const trainer = await storage.getUser(invitationBefore.trainerId).catch(() => null);
          const trainerName = trainer
            ? `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email
            : "Twój trener";
          // Send welcome email to client
          if (user?.email && user?.firstName) {
            void sendWelcomeEmail({
              email: user.email,
              firstName: user.firstName,
              trainerName,
            });
          }
          // Send notification email to trainer (independent of client email condition)
          if (trainer?.email && trainer?.firstName) {
            void sendTrainerNotificationEmail({
              email: trainer.email,
              trainerFirstName: trainer.firstName,
              clientName,
            });
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ message: "Zaproszenie nie zostało znalezione" });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Nie udało się zaakceptować zaproszenia" });
    }
  });

  app.post("/api/invitations/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą odrzucać zaproszenia" });
      }

      const { id } = req.params;
      
      try {
        await storage.rejectInvitation(id, userId);
        res.status(200).json({ message: "Zaproszenie odrzucone" });
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          return res.status(404).json({ message: "Zaproszenie nie zostało znalezione" });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error rejecting invitation:", error);
      res.status(500).json({ message: "Nie udało się odrzucić zaproszenia" });
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
      const limitCheck = await storage.checkTrainerClientLimit(userId);
      res.json({
        ...stats,
        maxClients: limitCheck.maxCount,
      });
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

      const workouts = await storage.getWorkoutsByPlanId(plan.id);
      const workoutsWithExercises = await Promise.all(
        workouts.map(async (workout) => {
          const exercises = await storage.getExercisesByWorkoutId(workout.id);
          return { ...workout, exercises };
        })
      );
      
      res.json({
        ...assignment,
        plan: {
          ...plan,
          workouts: workoutsWithExercises,
        },
      });
    } catch (error) {
      console.error("Error fetching client assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  // Exercise logs endpoints
  app.post("/api/exercises/:exerciseId/log", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą logować wykonania ćwiczeń" });
      }

      const { exerciseId } = req.params;
      
      // Verify exercise exists before logging
      const exercise = await storage.getExerciseById(exerciseId);
      if (!exercise) {
        console.error(`Exercise not found: ${exerciseId}`);
        return res.status(404).json({ message: "Ćwiczenie nie zostało znalezione" });
      }
      
      // Verify client has access to this exercise
      const assignment = await storage.getClientAssignment(userId);
      if (!assignment) {
        console.error(`Client ${userId} has no plan assignment`);
        return res.status(403).json({ message: "Nie masz przypisanego planu treningowego" });
      }
      
      // Get workouts for the assigned plan and verify this exercise belongs to one of them
      const workouts = await storage.getWorkoutsByPlanId(assignment.planId);
      const workoutIds = workouts.map(w => w.id);
      
      if (!exercise.workoutId || !workoutIds.includes(exercise.workoutId)) {
        console.error(`Exercise ${exerciseId} (workoutId: ${exercise.workoutId}) is not in client's assigned plan ${assignment.planId}`);
        return res.status(403).json({ message: "Nie masz dostępu do tego ćwiczenia" });
      }
      
      const validationResult = insertExerciseLogSchema.safeParse({
        ...req.body,
        exerciseId,
      });

      if (!validationResult.success) {
        console.error("Exercise log validation error:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const { reps, load, notes, setNumber } = validationResult.data;
      const log = await storage.logExercise(userId, exerciseId, { 
        reps, 
        load: load ?? undefined, 
        notes: notes ?? undefined,
        setNumber: setNumber ?? 1
      });
      res.json(log);
    } catch (error) {
      console.error("Error logging exercise:", error);
      res.status(500).json({ message: "Nie udało się zapisać wykonania ćwiczenia" });
    }
  });

  app.get("/api/exercises/:exerciseId/logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą pobierać logi ćwiczeń" });
      }

      const { exerciseId } = req.params;
      const logs = await storage.getExerciseLogs(userId, exerciseId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching exercise logs:", error);
      res.status(500).json({ message: "Nie udało się pobrać logów ćwiczeń" });
    }
  });

  app.get("/api/exercises/:exerciseId/latest-log", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą pobierać logi ćwiczeń" });
      }

      const { exerciseId } = req.params;
      const latestLog = await storage.getLatestExerciseLog(userId, exerciseId);
      res.json(latestLog || null);
    } catch (error) {
      console.error("Error fetching latest exercise log:", error);
      res.status(500).json({ message: "Nie udało się pobrać najnowszego loga ćwiczenia" });
    }
  });

  app.get("/api/exercises/:exerciseId/latest-logs-by-set", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą pobierać logi ćwiczeń" });
      }

      const { exerciseId } = req.params;
      const logs = await storage.getLatestExerciseLogsBySet(userId, exerciseId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching latest exercise logs by set:", error);
      res.status(500).json({ message: "Nie udało się pobrać logów ćwiczeń" });
    }
  });

  app.get("/api/exercise-logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą pobierać logi ćwiczeń" });
      }

      const logs = await storage.getAllClientExerciseLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching exercise logs:", error);
      res.status(500).json({ message: "Nie udało się pobrać logów ćwiczeń" });
    }
  });

  // Workout sessions endpoints
  app.post("/api/workout-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą zapisywać sesje treningowe" });
      }

      const validation = insertWorkoutSessionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Nieprawidłowe dane sesji", errors: validation.error.errors });
      }

      const { workoutId, planId, exercisesCompleted, totalExercises, durationSeconds } = validation.data;

      // Sanity-check numeric fields
      if (durationSeconds < 0) {
        return res.status(400).json({ message: "Czas trwania sesji nie może być ujemny" });
      }
      if (totalExercises < 0 || exercisesCompleted < 0) {
        return res.status(400).json({ message: "Liczba ćwiczeń nie może być ujemna" });
      }
      if (exercisesCompleted > totalExercises) {
        return res.status(400).json({ message: "Liczba ukończonych ćwiczeń przekracza łączną liczbę ćwiczeń" });
      }

      // Verify the client has an active assignment to the given planId
      const assignment = await storage.getClientAssignment(userId);
      if (!assignment || assignment.planId !== planId) {
        return res.status(403).json({ message: "Plan treningowy nie należy do Ciebie" });
      }

      // Verify the workoutId belongs to this plan
      const planWorkouts = await storage.getWorkoutsByPlanId(planId);
      const workoutBelongsToPlan = planWorkouts.some((w) => w.id === workoutId);
      if (!workoutBelongsToPlan) {
        return res.status(403).json({ message: "Trening nie należy do Twojego planu" });
      }

      const session = await storage.createWorkoutSession(userId, validation.data);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error saving workout session:", error);
      res.status(500).json({ message: "Nie udało się zapisać sesji treningowej" });
    }
  });

  app.get("/api/workout-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko klienci mogą pobierać sesje treningowe" });
      }

      const sessions = await storage.getClientWorkoutSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching workout sessions:", error);
      res.status(500).json({ message: "Nie udało się pobrać sesji treningowych" });
    }
  });

  // Trainer: get and update private notes about a client
  app.get("/api/trainer/clients/:clientId/notes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Dostęp tylko dla trenerów" });
      }
      const { clientId } = req.params;
      const notes = await storage.getTrainerNotes(userId, clientId);
      res.json({ notes });
    } catch (error) {
      console.error("Error fetching trainer notes:", error);
      res.status(500).json({ message: "Nie udało się pobrać notatek" });
    }
  });

  app.patch("/api/trainer/clients/:clientId/notes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Dostęp tylko dla trenerów" });
      }
      const { clientId } = req.params;
      const { notes } = req.body;
      if (typeof notes !== "string") {
        return res.status(400).json({ message: "Pole notes musi być tekstem" });
      }
      await storage.updateTrainerNotes(userId, clientId, notes);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating trainer notes:", error);
      res.status(500).json({ message: "Nie udało się zaktualizować notatek" });
    }
  });

  // Trainer: view a client's workout sessions
  app.get("/api/trainer/clients/:clientId/workout-sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Dostęp tylko dla trenerów" });
      }

      const { clientId } = req.params;

      // Verify the client belongs to this trainer
      const clients = await storage.getClientsByTrainerId(userId);
      const isOwnClient = clients.some((c) => c.id === clientId);
      if (!isOwnClient) {
        return res.status(403).json({ message: "Brak dostępu do tego podopiecznego" });
      }

      const sessions = await storage.getClientWorkoutSessions(clientId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching client workout sessions for trainer:", error);
      res.status(500).json({ message: "Nie udało się pobrać sesji treningowych" });
    }
  });

  // Weekly reports endpoints
  app.post("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą tworzyć raporty" });
      }

      // Check if client has an active trainer
      const hasTrainer = await storage.hasActiveTrainer(userId);
      if (!hasTrainer) {
        return res.status(403).json({ 
          message: "Aby tworzyć raporty, musisz mieć przypisanego trenera. Poproś swojego trenera o zaproszenie." 
        });
      }

      const validationResult = insertWeeklyReportSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const report = await storage.createWeeklyReport(userId, validationResult.data);
      res.json(report);
    } catch (error) {
      console.error("Error creating weekly report:", error);
      res.status(500).json({ message: "Nie udało się utworzyć raportu" });
    }
  });

  app.get("/api/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą pobierać swoje raporty" });
      }

      const reports = await storage.getClientWeeklyReports(userId);
      
      // CRITICAL FIX: Generate presigned URLs for photos but preserve original paths
      // This prevents photo loss when editing reports without changing the photo
      const objectStorageService = new ObjectStorageService();
      const reportsWithUrls = await Promise.all(
        reports.map(async (report) => {
          if (report.photoUrl) {
            const presignedUrl = await objectStorageService.getObjectReadUrl(report.photoUrl);
            return { 
              ...report, 
              photoUrl: presignedUrl || report.photoUrl,  // Presigned URL for display
              photoOriginalPath: report.photoUrl  // Original object path for saving
            };
          }
          return report;
        })
      );
      
      res.json(reportsWithUrls);
    } catch (error) {
      console.error("Error fetching weekly reports:", error);
      res.status(500).json({ message: "Nie udało się pobrać raportów" });
    }
  });

  // GET /api/reports/:id - Fetch single report with ownership check
  app.get("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą pobierać raporty" });
      }
      
      const reportId = req.params.id;
      const report = await storage.getWeeklyReportById(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Raport nie znaleziony" });
      }
      
      // CRITICAL: Verify ownership before returning data
      if (report.clientId !== userId) {
        return res.status(403).json({ message: "Brak dostępu do tego raportu" });
      }
      
      // Generate presigned URL AND preserve original path
      if (report.photoUrl) {
        const objectStorageService = new ObjectStorageService();
        const presignedUrl = await objectStorageService.getObjectReadUrl(report.photoUrl);
        return res.json({
          ...report,
          photoUrl: presignedUrl || report.photoUrl,
          photoOriginalPath: report.photoUrl
        });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching weekly report:", error);
      res.status(500).json({ message: "Nie udało się pobrać raportu" });
    }
  });

  // PATCH /api/reports/:id - Update report with ownership check
  app.patch("/api/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą edytować raporty" });
      }

      const validationResult = insertWeeklyReportSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const report = await storage.updateWeeklyReport(req.params.id, userId, validationResult.data);
      res.json(report);
    } catch (error) {
      console.error("Error updating weekly report:", error);
      if (error instanceof Error && (error.message.includes("not found") || error.message.includes("not owned"))) {
        return res.status(404).json({ message: "Raport nie znaleziony" });
      }
      res.status(500).json({ message: "Nie udało się zaktualizować raportu" });
    }
  });

  app.get("/api/clients/:clientId/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą pobierać raporty podopiecznych" });
      }

      const { clientId } = req.params;
      
      // Return demo weekly reports for demo client
      if (isDemoId(clientId)) {
        const demoReports = getDemoWeeklyReports();
        return res.json(demoReports);
      }
      
      const reports = await storage.getClientWeeklyReportsForTrainer(clientId, userId);
      
      // CRITICAL FIX: Generate presigned URLs for photos but preserve original paths
      // This prevents photo loss when editing reports without changing the photo
      const objectStorageService = new ObjectStorageService();
      const reportsWithUrls = await Promise.all(
        reports.map(async (report) => {
          if (report.photoUrl) {
            const presignedUrl = await objectStorageService.getObjectReadUrl(report.photoUrl);
            return { 
              ...report, 
              photoUrl: presignedUrl || report.photoUrl,  // Presigned URL for display
              photoOriginalPath: report.photoUrl  // Original object path for saving
            };
          }
          return report;
        })
      );
      
      res.json(reportsWithUrls);
    } catch (error) {
      console.error("Error fetching client weekly reports:", error);
      res.status(500).json({ message: "Nie udało się pobrać raportów podopiecznego" });
    }
  });

  app.get("/api/trainer/unread-reports-count", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą sprawdzać liczbę nieprzeczytanych raportów" });
      }

      const count = await storage.getUnreadReportsCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread reports count:", error);
      res.status(500).json({ message: "Nie udało się pobrać liczby nieprzeczytanych raportów" });
    }
  });

  app.post("/api/reports/:reportId/mark-as-viewed", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą oznaczać raporty jako przeczytane" });
      }

      const { reportId } = req.params;
      
      // Demo reports: just return success without modifying anything
      if (isDemoId(reportId)) {
        return res.json({ message: "Raport oznaczony jako przeczytany" });
      }
      
      // Verify the report belongs to one of trainer's clients
      const report = await storage.getWeeklyReport(reportId);
      if (!report) {
        return res.status(404).json({ message: "Raport nie został znaleziony" });
      }

      // Check if the client belongs to this trainer
      const relationship = await storage.getClientRelationship(userId, report.clientId);
      if (!relationship || relationship.status !== 'active') {
        return res.status(403).json({ message: "Ten raport nie należy do Twoich podopiecznych" });
      }

      await storage.markReportAsViewed(reportId);
      res.json({ message: "Raport oznaczony jako przeczytany" });
    } catch (error) {
      console.error("Error marking report as viewed:", error);
      res.status(500).json({ message: "Nie udało się oznaczyć raportu jako przeczytanego" });
    }
  });

  // Diet Plans - Trainer endpoints
  app.post("/api/diets/plans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą tworzyć plany dietetyczne" });
      }

      const validationResult = insertDietPlanSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const plan = await storage.createDietPlan({
        ...validationResult.data,
        trainerId: userId,
        mealsPerDay: validationResult.data.mealsPerDay ?? 3,
      });
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating diet plan:", error);
      res.status(500).json({ message: "Nie udało się utworzyć planu dietetycznego" });
    }
  });

  app.get("/api/diets/plans", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą przeglądać plany dietetyczne" });
      }

      const plans = await storage.getTrainerDietPlans(userId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching diet plans:", error);
      res.status(500).json({ message: "Nie udało się pobrać planów dietetycznych" });
    }
  });

  app.get("/api/diets/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      
      const plan = await storage.getDietPlanById(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (user?.role === "trainer" && plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      if (user?.role === "client" && plan.clientId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      res.json(plan);
    } catch (error) {
      console.error("Error fetching diet plan:", error);
      res.status(500).json({ message: "Nie udało się pobrać planu dietetycznego" });
    }
  });

  app.put("/api/diets/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą aktualizować plany dietetyczne" });
      }

      const plan = await storage.getDietPlanById(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const validationResult = insertDietPlanSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedPlan = await storage.updateDietPlan(id, validationResult.data);
      res.json(updatedPlan);
    } catch (error) {
      console.error("Error updating diet plan:", error);
      res.status(500).json({ message: "Nie udało się zaktualizować planu dietetycznego" });
    }
  });

  app.delete("/api/diets/plans/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać plany dietetyczne" });
      }

      const plan = await storage.getDietPlanById(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      await storage.deleteDietPlan(id);
      res.json({ message: "Plan dietetyczny został usunięty" });
    } catch (error) {
      console.error("Error deleting diet plan:", error);
      res.status(500).json({ message: "Nie udało się usunąć planu dietetycznego" });
    }
  });

  // Diet Meals - Trainer endpoints
  app.post("/api/diets/plans/:planId/meals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą dodawać posiłki" });
      }

      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const validationResult = insertDietMealSchema.safeParse({
        ...req.body,
        planId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const meal = await storage.createDietMeal(validationResult.data);
      res.status(201).json(meal);
    } catch (error) {
      console.error("Error creating diet meal:", error);
      res.status(500).json({ message: "Nie udało się utworzyć posiłku" });
    }
  });

  app.get("/api/diets/plans/:planId/meals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params;
      
      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (user?.role === "trainer" && plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      if (user?.role === "client" && plan.clientId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const meals = await storage.getDietPlanMeals(planId);
      res.json(meals);
    } catch (error) {
      console.error("Error fetching diet meals:", error);
      res.status(500).json({ message: "Nie udało się pobrać posiłków" });
    }
  });

  // Get meals for a specific day of week
  app.get("/api/diets/plans/:planId/meals/day/:dayOfWeek", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId, dayOfWeek } = req.params;
      const dayNum = parseInt(dayOfWeek);
      
      if (isNaN(dayNum) || dayNum < 1 || dayNum > 7) {
        return res.status(400).json({ message: "Dzień musi być liczbą od 1 do 7" });
      }
      
      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (user?.role === "trainer" && plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      if (user?.role === "client" && plan.clientId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const meals = await storage.getDietPlanMealsForDay(planId, dayNum);
      res.json(meals);
    } catch (error) {
      console.error("Error fetching diet meals for day:", error);
      res.status(500).json({ message: "Nie udało się pobrać posiłków" });
    }
  });

  app.put("/api/diets/meals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą aktualizować posiłki" });
      }

      const meals = await storage.getDietPlanMeals(req.body.planId);
      const meal = meals.find(m => m.id === id);
      
      if (!meal) {
        return res.status(404).json({ message: "Posiłek nie został znaleziony" });
      }

      const plan = await storage.getDietPlanById(meal.planId);
      
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego posiłku" });
      }

      const validationResult = insertDietMealSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedMeal = await storage.updateDietMeal(id, validationResult.data);
      res.json(updatedMeal);
    } catch (error) {
      console.error("Error updating diet meal:", error);
      res.status(500).json({ message: "Nie udało się zaktualizować posiłku" });
    }
  });

  app.delete("/api/diets/meals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać posiłki" });
      }

      const meals = await storage.getDietPlanMeals(req.body.planId || '');
      const meal = meals.find(m => m.id === id);
      
      if (meal) {
        const plan = await storage.getDietPlanById(meal.planId);
        
        if (plan && plan.trainerId !== userId) {
          return res.status(403).json({ message: "Nie masz uprawnień do tego posiłku" });
        }
      }

      await storage.deleteDietMeal(id);
      res.json({ message: "Posiłek został usunięty" });
    } catch (error) {
      console.error("Error deleting diet meal:", error);
      res.status(500).json({ message: "Nie udało się usunąć posiłku" });
    }
  });

  app.delete("/api/diets/plans/:planId/meals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać posiłki" });
      }

      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }

      if (plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      await storage.deleteDietMealsByPlanId(planId);
      res.json({ message: "Wszystkie posiłki zostały usunięte" });
    } catch (error) {
      console.error("Error deleting diet meals:", error);
      res.status(500).json({ message: "Nie udało się usunąć posiłków" });
    }
  });

  // Diet supplements endpoints
  app.get("/api/diet-plans/:planId/supplements", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params;
      
      const plan = await storage.getDietPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan dietetyczny nie został znaleziony" });
      }
      
      // Allow both trainer and assigned client to view supplements
      if (user?.role === "trainer" && plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }
      
      if (user?.role === "client" && plan.clientId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const supplements = await storage.getDietSupplements(planId);
      res.json(supplements);
    } catch (error) {
      console.error("Error fetching diet supplements:", error);
      res.status(500).json({ message: "Nie udało się pobrać suplementów" });
    }
  });

  app.post("/api/diet-plans/:planId/supplements", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { planId } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą dodawać suplementy" });
      }

      const plan = await storage.getDietPlanById(planId);
      
      if (!plan || plan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      const validationResult = insertDietSupplementSchema.safeParse({
        ...req.body,
        dietPlanId: planId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const supplement = await storage.createDietSupplement(validationResult.data);
      res.status(201).json(supplement);
    } catch (error) {
      console.error("Error creating diet supplement:", error);
      res.status(500).json({ message: "Nie udało się utworzyć suplementu" });
    }
  });

  app.patch("/api/diet-supplements/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą edytować suplementy" });
      }

      // Get the supplement to check ownership
      const supplements = await storage.getDietSupplements(req.body.dietPlanId || '');
      const supplement = supplements.find(s => s.id === id);
      
      if (supplement) {
        const plan = await storage.getDietPlanById(supplement.dietPlanId);
        
        if (!plan || plan.trainerId !== userId) {
          return res.status(403).json({ message: "Nie masz uprawnień do tego suplementu" });
        }
      }

      const validationResult = insertDietSupplementSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedSupplement = await storage.updateDietSupplement(id, validationResult.data);
      res.json(updatedSupplement);
    } catch (error) {
      console.error("Error updating diet supplement:", error);
      res.status(500).json({ message: "Nie udało się zaktualizować suplementu" });
    }
  });

  app.delete("/api/diet-supplements/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać suplementy" });
      }

      const supplements = await storage.getDietSupplements(req.body.dietPlanId || '');
      const supplement = supplements.find(s => s.id === id);
      
      if (supplement) {
        const plan = await storage.getDietPlanById(supplement.dietPlanId);
        
        if (!plan || plan.trainerId !== userId) {
          return res.status(403).json({ message: "Nie masz uprawnień do tego suplementu" });
        }
      }

      await storage.deleteDietSupplement(id);
      res.json({ message: "Suplement został usunięty" });
    } catch (error) {
      console.error("Error deleting diet supplement:", error);
      res.status(500).json({ message: "Nie udało się usunąć suplementu" });
    }
  });

  // Client diet endpoints
  app.get("/api/client/diet", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą przeglądać swoje plany dietetyczne" });
      }

      const plan = await storage.getClientActiveDietPlan(userId);
      
      if (!plan) {
        return res.status(404).json({ message: "Nie masz aktywnego planu dietetycznego" });
      }

      const meals = await storage.getDietPlanMeals(plan.id);
      res.json({ ...plan, meals });
    } catch (error) {
      console.error("Error fetching client diet:", error);
      res.status(500).json({ message: "Nie udało się pobrać planu dietetycznego" });
    }
  });

  app.post("/api/client/diet/log", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą logować nawyki" });
      }

      const { date, waterLiters, hitCalories, hitProtein, hitFat, hitCarbs, mealCheckmarks, planId } = req.body;

      if (!planId) {
        return res.status(400).json({ message: "planId jest wymagane" });
      }

      const validationResult = insertDailyHabitLogSchema.safeParse({
        clientId: userId,
        planId,
        date,
        waterLiters,
        hitCalories,
        hitProtein,
        hitFat,
        hitCarbs,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const habitLog = await storage.upsertDailyHabitLog({
        ...validationResult.data,
        clientId: userId,
        date: validationResult.data.date.toISOString().split('T')[0],
      });

      if (mealCheckmarks && Array.isArray(mealCheckmarks)) {
        await Promise.all(
          mealCheckmarks.map((checkmark: { mealId: string, completed: boolean }) =>
            storage.upsertMealCheckmark({
              habitLogId: habitLog.id,
              mealId: checkmark.mealId,
              completed: checkmark.completed,
            })
          )
        );
      }

      const checkmarks = await storage.getHabitLogCheckmarks(habitLog.id);
      res.json({ habitLog, checkmarks });
    } catch (error) {
      console.error("Error logging daily habits:", error);
      res.status(500).json({ message: "Nie udało się zapisać dziennika nawyków" });
    }
  });

  app.get("/api/client/diet/logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą przeglądać swoje logi" });
      }

      const { startDate, endDate, planId } = req.query;

      if (!planId || !startDate || !endDate) {
        return res.status(400).json({ message: "planId, startDate i endDate są wymagane" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const logs = await storage.getClientHabitLogs(userId, planId as string, start, end);

      const logsWithCheckmarks = await Promise.all(
        logs.map(async (log) => {
          const checkmarks = await storage.getHabitLogCheckmarks(log.id);
          return { ...log, checkmarks };
        })
      );

      res.json(logsWithCheckmarks);
    } catch (error) {
      console.error("Error fetching client habit logs:", error);
      res.status(500).json({ message: "Nie udało się pobrać logów nawyków" });
    }
  });

  // Trainer - get client's active diet plan
  app.get("/api/trainer/clients/:clientId/active-diet", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą przeglądać plany podopiecznych" });
      }

      const { clientId } = req.params;
      
      // Return demo diet plan for demo client
      if (isDemoId(clientId)) {
        const demoDietPlan = getDemoDietPlan(userId);
        return res.json(demoDietPlan);
      }
      
      const activePlan = await storage.getClientActiveDietPlan(clientId);
      
      if (activePlan && activePlan.trainerId !== userId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tego planu" });
      }

      res.json(activePlan);
    } catch (error) {
      console.error("Error fetching client active diet plan:", error);
      res.status(500).json({ message: "Nie udało się pobrać aktywnego planu diety" });
    }
  });

  // Trainer stats endpoint
  app.get("/api/trainer/clients/:clientId/diet-stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą przeglądać statystyki podopiecznych" });
      }

      const { clientId } = req.params;
      const { planId, days = '7' } = req.query;

      if (!planId) {
        return res.status(400).json({ message: "planId jest wymagane" });
      }

      const plan = await storage.getDietPlanById(planId as string);
      
      if (!plan || plan.trainerId !== userId || plan.clientId !== clientId) {
        return res.status(403).json({ message: "Nie masz uprawnień do tych statystyk" });
      }

      const daysCount = parseInt(days as string);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);

      const logs = await storage.getClientHabitLogs(clientId, planId as string, startDate, endDate);
      const meals = await storage.getDietPlanMeals(planId as string);

      let totalCompletedMeals = 0;
      let totalPossibleMeals = 0;
      let totalWater = 0;
      let streak = 0;
      let currentStreak = 0;

      const logsWithCheckmarks = await Promise.all(
        logs.map(async (log) => {
          const checkmarks = await storage.getHabitLogCheckmarks(log.id);
          return { log, checkmarks };
        })
      );

      const dailyStats = [];

      for (let i = 0; i < logsWithCheckmarks.length; i++) {
        const { log, checkmarks } = logsWithCheckmarks[i];
        
        const waterLiters = parseFloat(log.waterLiters || '0');
        totalWater += waterLiters;
        
        const completedMealsCount = checkmarks.filter(c => c.completed).length;
        totalPossibleMeals += meals.length;
        totalCompletedMeals += completedMealsCount;

        const completedMealsPercent = meals.length > 0 
          ? (completedMealsCount / meals.length) * 100 
          : 0;

        dailyStats.push({
          date: log.date,
          completedMealsPercent: Math.round(completedMealsPercent * 10) / 10,
          waterLiters: Math.round(waterLiters * 10) / 10,
        });

        if (checkmarks.length > 0) {
          currentStreak++;
          if (currentStreak > streak) {
            streak = currentStreak;
          }
        } else {
          currentStreak = 0;
        }
      }

      const avgCompletedMealsPercent = totalPossibleMeals > 0 
        ? (totalCompletedMeals / totalPossibleMeals) * 100 
        : 0;
      
      const avgWaterLiters = logs.length > 0 
        ? totalWater / logs.length 
        : 0;

      res.json({
        avgCompletedMealsPercent: Math.round(avgCompletedMealsPercent * 10) / 10,
        streakDays: streak,
        avgWaterLiters: Math.round(avgWaterLiters * 10) / 10,
        totalDaysLogged: logs.length,
        dailyStats: dailyStats.sort((a, b) => a.date.localeCompare(b.date)),
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
        },
      });
    } catch (error) {
      console.error("Error fetching client diet stats:", error);
      res.status(500).json({ message: "Nie udało się pobrać statystyk" });
    }
  });

  // Charity donations endpoints
  app.get("/api/charity-donations", async (req, res) => {
    try {
      const donations = await storage.listCharityDonations();
      res.json(donations);
    } catch (error) {
      console.error("Error fetching charity donations:", error);
      res.status(500).json({ message: "Nie udało się pobrać darowizn" });
    }
  });

  app.post("/api/admin/charity-donations", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const validationResult = insertCharityDonationSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const donation = await storage.createCharityDonation(validationResult.data);
      res.json(donation);
    } catch (error) {
      console.error("Error creating charity donation:", error);
      
      const errMsg = error instanceof Error ? error.message : "";
      const errCode = (error as { code?: string })?.code;
      if (errCode === '23505' || errMsg.includes('unique')) {
        return res.status(400).json({ 
          message: "Darowizna dla tego miesiąca i roku już istnieje" 
        });
      }
      
      res.status(500).json({ message: "Nie udało się utworzyć darowizny" });
    }
  });

  app.delete("/api/admin/charity-donations/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCharityDonation(id);
      res.json({ message: "Darowizna została usunięta" });
    } catch (error) {
      console.error("Error deleting charity donation:", error);
      res.status(500).json({ message: "Nie udało się usunąć darowizny" });
    }
  });

  // Medical Tests endpoints
  
  // POST /api/medical-tests (client only - create new test)
  app.post("/api/medical-tests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą dodawać badania" });
      }

      const validationResult = insertMedicalTestSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const test = await storage.createMedicalTest(userId, validationResult.data);

      res.status(201).json(test);
    } catch (error) {
      console.error("Error creating medical test:", error);
      res.status(500).json({ message: "Nie udało się dodać badania medycznego" });
    }
  });

  // GET /api/medical-tests (client - own tests)
  app.get("/api/medical-tests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą przeglądać swoje badania" });
      }

      const tests = await storage.getClientMedicalTests(userId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching medical tests:", error);
      res.status(500).json({ message: "Nie udało się pobrać badań medycznych" });
    }
  });

  // GET /api/clients/:clientId/medical-tests (trainer - read only)
  app.get("/api/clients/:clientId/medical-tests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { clientId } = req.params;

      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Nieautoryzowany dostęp" });
      }

      // Return demo medical tests for demo client
      if (isDemoId(clientId)) {
        const demoTests = getDemoMedicalTests();
        return res.json(demoTests);
      }

      const canAccess = await storage.canTrainerAccessClientTests(userId, clientId);
      if (!canAccess) {
        return res.status(403).json({ message: "Brak dostępu do tego podopiecznego" });
      }

      const tests = await storage.getClientMedicalTests(clientId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching medical tests:", error);
      res.status(500).json({ message: "Nie udało się pobrać badań medycznych" });
    }
  });

  // PUT /api/medical-tests/:id (client only - update own test)
  app.put("/api/medical-tests/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;

      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą edytować badania" });
      }

      const validationResult = insertMedicalTestSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      const updatedTest = await storage.updateMedicalTest(id, userId, validationResult.data);
      res.json(updatedTest);
    } catch (error) {
      console.error("Error updating medical test:", error);
      if (error instanceof Error && error.message === "Test not found or unauthorized") {
        return res.status(404).json({ message: "Badanie nie znalezione lub brak uprawnień" });
      }
      res.status(500).json({ message: "Nie udało się zaktualizować badania" });
    }
  });

  // DELETE /api/medical-tests/:id (client only)
  app.delete("/api/medical-tests/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;

      if (user?.role !== "client") {
        return res.status(403).json({ message: "Tylko podopieczni mogą usuwać badania" });
      }

      await storage.deleteMedicalTest(id, userId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting medical test:", error);
      res.status(500).json({ message: "Nie udało się usunąć badania" });
    }
  });

  // Payment routes
  app.get("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.role) {
        return res.status(400).json({ message: "Użytkownik nie ma przypisanej roli" });
      }

      const payments = await storage.getClientPayments(userId, user.role);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Nie udało się pobrać płatności" });
    }
  });

  app.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą dodawać płatności" });
      }

      const validationResult = insertClientPaymentSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Nieprawidłowe dane wejściowe",
          errors: validationResult.error.errors 
        });
      }

      // Guard: Cannot modify demo data
      if (isDemoId(validationResult.data.clientId)) {
        return res.status(400).json({ message: "Nie można modyfikować danych demonstracyjnych" });
      }

      // Validate date is not too far in the past (max 1 year)
      const dueDate = new Date(validationResult.data.dueDate);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (dueDate < oneYearAgo) {
        return res.status(400).json({ 
          message: "Termin płatności nie może być starszy niż 1 rok" 
        });
      }

      // Verify client exists and belongs to trainer
      const clients = await storage.getTrainerClients(userId);
      const isTrainerClient = clients.some(c => c.id === validationResult.data.clientId);
      
      if (!isTrainerClient) {
        return res.status(403).json({ message: "Klient nie należy do tego trenera" });
      }

      const payment = await storage.createPayment({
        ...validationResult.data,
        trainerId: userId,
      });

      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Nie udało się utworzyć płatności" });
    }
  });

  app.patch("/api/payments/:id/mark-paid", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;

      // Only trainers can mark payment as paid
      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trener może oznaczyć płatność jako zapłaconą" });
      }

      await storage.markPaymentAsPaid(id);
      res.json({ message: "Płatność została oznaczona jako zapłacona" });
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      res.status(500).json({ message: "Nie udało się oznaczyć płatności" });
    }
  });

  app.delete("/api/payments/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { id } = req.params;

      if (user?.role !== "trainer") {
        return res.status(403).json({ message: "Tylko trenerzy mogą usuwać płatności" });
      }

      await storage.deletePayment(id);
      res.json({ message: "Płatność została usunięta" });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ message: "Nie udało się usunąć płatności" });
    }
  });

  app.get("/api/payments/upcoming", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.role || (user.role !== 'trainer' && user.role !== 'client')) {
        return res.status(400).json({ message: "Użytkownik nie ma przypisanej roli" });
      }

      const payments = await storage.getUpcomingPayments(userId, user.role);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching upcoming payments:", error);
      res.status(500).json({ message: "Nie udało się pobrać nadchodzących płatności" });
    }
  });

  // Chat endpoints
  app.get("/api/chat/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.role || (user.role !== 'trainer' && user.role !== 'client')) {
        return res.status(400).json({ message: "Użytkownik nie ma przypisanej roli" });
      }

      const conversations = await storage.getConversations(userId, user.role);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Nie udało się pobrać konwersacji" });
    }
  });

  app.get("/api/chat/messages/:trainerId/:clientId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const { trainerId, clientId } = req.params;
      
      if (!user?.role || (user.role !== 'trainer' && user.role !== 'client')) {
        return res.status(400).json({ message: "Użytkownik nie ma przypisanej roli" });
      }

      // Validate access: trainer can only view their client messages, client can only view their trainer messages
      if (user.role === "trainer") {
        if (trainerId !== userId) {
          return res.status(403).json({ message: "Brak dostępu do tej konwersacji" });
        }
        // Verify client belongs to trainer
        const clients = await storage.getTrainerClients(trainerId);
        if (!clients.some(c => c.id === clientId)) {
          return res.status(403).json({ message: "Ten podopieczny nie należy do Ciebie" });
        }
      } else {
        // Client
        if (clientId !== userId) {
          return res.status(403).json({ message: "Brak dostępu do tej konwersacji" });
        }
        // Verify trainer is their trainer
        const trainer = await storage.getTrainerForClient(clientId);
        if (!trainer || trainer.id !== trainerId) {
          return res.status(403).json({ message: "To nie jest Twój trener" });
        }
      }

      const messages = await storage.getMessages(trainerId, clientId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Nie udało się pobrać wiadomości" });
    }
  });

  // Declare broadcastMessage function that will be set after WebSocket setup
  let broadcastMessageFn: ((recipientId: string, message: any) => void) | null = null;

  app.post("/api/chat/messages", isAuthenticated, async (req, res) => {
    try {
      // SECURITY: Derive userId from session - NEVER trust client-provided IDs
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.role) {
        return res.status(400).json({ message: "Użytkownik nie ma przypisanej roli" });
      }

      // SECURITY: Only accept recipientId and body from client - derive everything else
      const { recipientId, body } = z.object({
        recipientId: z.string().uuid("Nieprawidłowy ID odbiorcy"),
        body: z.string().min(1, "Wiadomość nie może być pusta").max(5000, "Wiadomość może mieć maksymalnie 5000 znaków"),
      }).parse(req.body);
      
      // SECURITY: senderId is ALWAYS the authenticated user - never accept from client
      const senderId = userId;
      
      // Validate that recipient exists and get their role
      const recipient = await storage.getUser(recipientId);
      if (!recipient || !recipient.role) {
        return res.status(404).json({ message: "Odbiorca nie istnieje lub nie ma przypisanej roli" });
      }
      
      // SECURITY: Validate trainer-client relationship and derive trainerId/clientId
      let trainerId: string;
      let clientId: string;
      
      if (user.role === "trainer" && recipient.role === "client") {
        // Trainer sending to client - verify relationship
        trainerId = userId;
        clientId = recipientId;
        
        const clients = await storage.getTrainerClients(trainerId);
        if (!clients.some(c => c.id === clientId)) {
          return res.status(403).json({ message: "Ten podopieczny nie należy do Ciebie" });
        }
      } else if (user.role === "client" && recipient.role === "trainer") {
        // Client sending to trainer - verify relationship
        clientId = userId;
        trainerId = recipientId;
        
        const userTrainer = await storage.getTrainerForClient(clientId);
        if (!userTrainer || userTrainer.id !== trainerId) {
          return res.status(403).json({ message: "To nie jest Twój trener" });
        }
      } else {
        // Invalid conversation - trainers can only message clients, clients can only message trainers
        return res.status(403).json({ message: "Możesz wysyłać wiadomości tylko między trenerem a podopiecznym" });
      }

      // Build message with all validated/derived IDs
      const messageData = {
        trainerId,
        clientId,
        senderId,
        recipientId,
        body,
      };

      const message = await storage.createMessage(messageData);
      
      // Broadcast to recipient via WebSocket if available
      if (broadcastMessageFn) {
        broadcastMessageFn(recipientId, message);
      }
      
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Nieprawidłowe dane wiadomości", errors: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Nie udało się wysłać wiadomości" });
    }
  });

  app.post("/api/chat/mark-read", isAuthenticated, async (req, res) => {
    try {
      // SECURITY: Derive userId from session - NEVER trust client
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user?.role) {
        return res.status(400).json({ message: "Użytkownik nie ma przypisanej roli" });
      }
      
      const { partnerId } = req.body;
      
      if (!partnerId) {
        return res.status(400).json({ message: "Brak ID rozmówcy" });
      }
      
      // Validate partner exists and has a role
      const partner = await storage.getUser(partnerId);
      if (!partner || !partner.role) {
        return res.status(404).json({ message: "Rozmówca nie istnieje" });
      }
      
      // SECURITY: Validate only trainer-client conversations are allowed
      // Reject any trainer↔trainer or client↔client attempts
      if (user.role === "trainer" && partner.role === "client") {
        // Trainer marking conversation with client - verify relationship
        const clients = await storage.getTrainerClients(userId);
        if (!clients.some(c => c.id === partnerId)) {
          return res.status(403).json({ message: "Ten podopieczny nie należy do Ciebie" });
        }
      } else if (user.role === "client" && partner.role === "trainer") {
        // Client marking conversation with trainer - verify relationship
        const userTrainer = await storage.getTrainerForClient(userId);
        if (!userTrainer || userTrainer.id !== partnerId) {
          return res.status(403).json({ message: "To nie jest Twój trener" });
        }
      } else {
        // Reject any other role combination (trainer↔trainer, client↔client, etc.)
        return res.status(403).json({ message: "Możesz oznaczać tylko wiadomości między trenerem a podopiecznym" });
      }

      // Mark conversation as read (relationship already validated above)
      await storage.markConversationAsRead(userId, partnerId);
      res.json({ message: "Konwersacja oznaczona jako przeczytana" });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({ message: "Nie udało się oznaczyć konwersacji jako przeczytanej" });
    }
  });

  app.get("/api/chat/unread-count", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Nie udało się pobrać liczby nieprzeczytanych wiadomości" });
    }
  });

  // Referral system routes (trainers only)
  app.get("/api/referrals/my-code", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Tylko trenerzy mogą mieć kody polecające" });
      }

      const referralCode = await storage.ensureReferralCode(userId);
      res.json(referralCode);
    } catch (error) {
      console.error("Error fetching referral code:", error);
      res.status(500).json({ message: "Nie udało się pobrać kodu polecającego" });
    }
  });

  app.get("/api/referrals/my-stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Tylko trenerzy mają statystyki poleceń" });
      }

      const stats = await storage.getTrainerReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Nie udało się pobrać statystyk poleceń" });
    }
  });

  app.get("/api/referrals/my-referrals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Tylko trenerzy mogą przeglądać swoje polecenia" });
      }

      const referrals = await storage.listTrainerReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Nie udało się pobrać listy poleceń" });
    }
  });

  // Notification endpoints (TRAINER ONLY)
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Tylko trenerzy mają dostęp do powiadomień" });
      }

      const notifications = await storage.listNotificationsByTrainer(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Nie udało się pobrać powiadomień" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Tylko trenerzy mają dostęp do powiadomień" });
      }

      const notificationId = parseInt(req.params.id, 10);
      
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Nieprawidłowy ID powiadomienia" });
      }

      const notification = await storage.markNotificationRead(notificationId, userId);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      if (error instanceof Error && error.message === "Powiadomienie nie znalezione lub nie należy do tego trenera") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "Nie udało się oznaczyć powiadomienia jako przeczytane" });
    }
  });

  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'trainer') {
        return res.status(403).json({ message: "Tylko trenerzy mają dostęp do powiadomień" });
      }

      await storage.markAllNotificationsRead(userId);
      res.json({ message: "Wszystkie powiadomienia oznaczone jako przeczytane" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Nie udało się oznaczyć powiadomień jako przeczytane" });
    }
  });

  // Push notification history (all users)
  app.get("/api/notifications/mine", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(parseInt(req.query.limit as string ?? "50", 10) || 50, 100);
      const history = await storage.getPushNotificationHistoryForUser(userId, limit);
      const unreadCount = await storage.getUnreadPushNotificationCount(userId);
      res.json({ notifications: history, unreadCount });
    } catch (error) {
      console.error("Error fetching notification history:", error);
      res.status(500).json({ message: "Nie udało się pobrać historii powiadomień" });
    }
  });

  app.patch("/api/notifications/mine/:id/read", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const notification = await storage.markPushNotificationRead(id, userId);
      res.json(notification);
    } catch (error) {
      if (error instanceof Error && error.message === "Powiadomienie nie znalezione") {
        return res.status(404).json({ message: error.message });
      }
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Nie udało się oznaczyć powiadomienia jako przeczytane" });
    }
  });

  app.patch("/api/notifications/mine/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.markAllPushNotificationsRead(userId);
      res.json({ message: "Wszystkie powiadomienia oznaczone jako przeczytane" });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ message: "Nie udało się oznaczyć powiadomień jako przeczytane" });
    }
  });

  // Cron Jobs - Scheduled tasks triggered externally (e.g., Replit Scheduled Deployment)
  // These endpoints should NOT run on server startup to comply with Autoscale best practices
  
  /**
   * POST /api/cron/payment-notifications
   * 
   * Checks unpaid payments and creates notifications for overdue/upcoming payments.
   * 
   * Security: Requires CRON_JOB_TOKEN in Authorization header.
   * Usage: Call this endpoint from a Replit Scheduled Deployment hourly.
   * 
   * Example:
   *   curl -X POST https://your-app.replit.app/api/cron/payment-notifications \
   *     -H "Authorization: Bearer YOUR_CRON_JOB_TOKEN"
   */
  app.post("/api/cron/payment-notifications", async (req, res) => {
    try {
      // Verify cron job token
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.CRON_JOB_TOKEN;
      
      if (!expectedToken) {
        console.error("[CRON] CRON_JOB_TOKEN not configured in environment");
        return res.status(500).json({ 
          error: "Cron job token not configured" 
        });
      }
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ 
          error: "Missing or invalid Authorization header. Use: Authorization: Bearer <token>" 
        });
      }
      
      const token = authHeader.substring(7); // Remove "Bearer " prefix
      
      if (token !== expectedToken) {
        console.warn("[CRON] Invalid cron job token attempt");
        return res.status(401).json({ 
          error: "Invalid cron job token" 
        });
      }
      
      // Token valid - run payment notification check
      console.log("[CRON] Running payment notifications check...");
      const stats = await checkPaymentNotifications(storage);
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        stats,
      });
    } catch (error) {
      console.error("[CRON] Error running payment notifications:", error);
      res.status(500).json({ 
        error: "Failed to run payment notifications",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Global exercises endpoint
  app.get("/api/exercises", isAuthenticated, async (req, res) => {
    try {
      const muscleGroup = req.query.muscleGroup as string | undefined;
      const search = req.query.search as string | undefined;
      const exercises = await storage.getGlobalExercises(muscleGroup, search);
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching global exercises:", error);
      res.status(500).json({ message: "Nie udało się pobrać ćwiczeń" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/chat' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', async (ws: WebSocket, req) => {
    try {
      const cookies = req.headers.cookie;
      if (!cookies) {
        ws.close(1008, 'No cookies provided');
        return;
      }

      const parsedCookies = parseCookie(cookies);
      const signedSessionId = parsedCookies['connect.sid'];

      if (!signedSessionId) {
        ws.close(1008, 'No session cookie');
        return;
      }

      const sessionId = unsignSessionCookie(signedSessionId);
      if (!sessionId) {
        ws.close(1008, 'Invalid session signature');
        return;
      }

      const session = await getSessionFromStore(sessionId);
      if (!session || !session.userId) {
        ws.close(1008, 'Invalid session');
        return;
      }

      const userId = session.userId;
      
      clients.set(userId, ws);
      console.log(`WebSocket client connected: ${userId}`);

      ws.on('close', () => {
        clients.delete(userId);
        console.log(`WebSocket client disconnected: ${userId}`);
      });

      ws.on('pong', () => {});
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Server error');
    }
  });

  // Keep-alive ping interval
  const keepAliveInterval = setInterval(() => {
    clients.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clients.delete(userId);
      }
    });
  }, 30000); // Every 30 seconds

  // Cleanup on server shutdown
  httpServer.on('close', () => {
    clearInterval(keepAliveInterval);
    clients.forEach(ws => ws.close());
    clients.clear();
  });

  // Broadcast new message to recipient
  function broadcastMessage(recipientId: string, message: any) {
    const recipientWs = clients.get(recipientId);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({
        type: 'new_message',
        data: message
      }));
    }
  }

  // Set the broadcast function for use in message endpoint
  broadcastMessageFn = broadcastMessage;

  return httpServer;
}
