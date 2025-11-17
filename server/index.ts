import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { storage } from "./storage";

// FIX: Validate required environment variables at startup
function validateObjectStorageEnvVars() {
  const requiredVars = {
    PUBLIC_OBJECT_SEARCH_PATHS: process.env.PUBLIC_OBJECT_SEARCH_PATHS,
    PRIVATE_OBJECT_DIR: process.env.PRIVATE_OBJECT_DIR,
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key);

  if (missing.length > 0) {
    const errorMsg = `CRITICAL: Missing required Object Storage environment variables: ${missing.join(', ')}. ` +
      `Please configure these in the 'Object Storage' tool.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log('✓ Object Storage environment variables validated');
  console.log(`  - PUBLIC_OBJECT_SEARCH_PATHS: ${process.env.PUBLIC_OBJECT_SEARCH_PATHS}`);
  console.log(`  - PRIVATE_OBJECT_DIR: ${process.env.PRIVATE_OBJECT_DIR}`);
}

// Validate env vars before starting the app
validateObjectStorageEnvVars();

const app = express();

// CRITICAL: Stripe webhook needs raw body for signature verification
// This MUST come BEFORE express.json() to prevent body parsing
app.use('/api/webhooks/stripe', express.raw({type: 'application/json'}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files (images, videos) from attached_assets
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // Payment notification scheduler - runs every hour
  async function checkPaymentNotifications() {
    try {
      log('[SCHEDULER] Checking unpaid payments for notifications...');
      
      const unpaidPayments = await storage.getUnreadPayments();
      log(`[SCHEDULER] Found ${unpaidPayments.length} unpaid payments`);
      
      const now = new Date();
      
      for (const payment of unpaidPayments) {
        const dueDate = new Date(payment.dueDate);
        
        // Normalize to start of day (00:00:00) for calendar-based comparison
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        
        const startOfDueDate = new Date(dueDate);
        startOfDueDate.setHours(0, 0, 0, 0);
        
        // Calculate difference in calendar days
        const DAY_MS = 1000 * 60 * 60 * 24;
        const daysDiff = Math.round((startOfDueDate.getTime() - startOfToday.getTime()) / DAY_MS);
        
        let notificationType: 'upcoming' | 'due_today' | 'overdue' | null = null;
        let title = '';
        let body = '';
        
        if (daysDiff === 3) {
          notificationType = 'upcoming';
          title = 'Zbliżający się termin płatności';
          body = `Płatność od ${payment.clientId} za 3 dni (kwota: ${(payment.amount / 100).toFixed(2)} PLN)`;
        } else if (daysDiff === 0) {
          notificationType = 'due_today';
          title = 'Płatność dzisiaj';
          body = `Płatność od ${payment.clientId} dzisiaj (kwota: ${(payment.amount / 100).toFixed(2)} PLN)`;
        } else if (daysDiff < 0) {
          notificationType = 'overdue';
          title = 'Przeterminowana płatność';
          body = `Płatność od ${payment.clientId} przeterminowana o ${Math.abs(daysDiff)} dni (kwota: ${(payment.amount / 100).toFixed(2)} PLN)`;
        }
        
        if (notificationType) {
          try {
            await storage.createNotification({
              trainerId: payment.trainerId,
              clientId: payment.clientId,
              paymentId: payment.id,
              type: notificationType,
              title,
              body,
              metadata: { daysDiff, amount: payment.amount },
              isRead: false,
            });
            log(`[SCHEDULER] Created ${notificationType} notification for payment ${payment.id}`);
          } catch (error: any) {
            // Unique constraint violation - notification already exists, skip silently
            if (error?.code === '23505') {
              log(`[SCHEDULER] Notification already exists for payment ${payment.id}, skipping`);
            } else {
              console.error(`[SCHEDULER] Error creating notification for payment ${payment.id}:`, error);
            }
          }
        }
      }
      
      log('[SCHEDULER] Payment notification check completed');
    } catch (error) {
      console.error('[SCHEDULER] Error in payment notification scheduler:', error);
    }
  }
  
  // Run immediately on startup
  checkPaymentNotifications();
  
  // Then run every hour (3600000ms)
  setInterval(checkPaymentNotifications, 3600000);
  log('[SCHEDULER] Payment notification scheduler started (runs every hour)');

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
