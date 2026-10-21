import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import path from "path";

const app: Express = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// Public code lookups (invitation / referral codes): generous for people, hostile to code guessing
export const lookupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zbyt wiele prób. Spróbuj ponownie za 15 minut." },
  skip: (req) => process.env.NODE_ENV === "test",
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zbyt wiele prób. Spróbuj ponownie za 15 minut." },
  skip: (req) => process.env.NODE_ENV === "test",
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // No origin header: native mobile apps and server-to-server calls — allow.
      if (!origin) return callback(null, true);

      // Credentialed CORS: only exact, known origins (no wildcard hosting domains —
      // any app hosted on *.replit.app could otherwise call this API with the user's cookie).
      const exactOrigins = new Set<string>([
        "https://paneltrenera.pl",
        "https://www.paneltrenera.pl",
        ...(process.env.REPLIT_DOMAINS ?? "")
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
          .map((d) => `https://${d}`),
      ]);
      if (process.env.REPLIT_DEV_DOMAIN) exactOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);

      const isDev = process.env.NODE_ENV !== "production";
      const trusted =
        exactOrigins.has(origin) ||
        (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

      if (trusted) return callback(null, true);
      return callback(new Error("CORS: origin not allowed"));
    },
  })
);
// Stripe webhooks require raw body for signature verification — must come before express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve uploaded files (local multer uploads) — matches original app behavior
// Files uploaded before extensions were derived from the MIME type may still be active content: never serve those
app.use('/attached_assets', (req, res, next) => {
  if (/\.(html?|xhtml|svg|xml|js|mjs|css)$/i.test(req.path)) {
    res.status(404).end();
    return;
  }
  next();
});
// Defense in depth for user-uploaded files: even if active content slipped through, the browser may not run it
// (no scripts, no framing, no network) when someone opens the file directly.
app.use(['/attached_assets', '/objects'], (_req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

export default app;
