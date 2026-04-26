import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import cookieSignature from "cookie-signature";
import { storage } from "./storage";
import type { User } from "@workspace/db";

const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
const pgStore = connectPg(session);

export const sessionStore = new pgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  ttl: sessionTtl,
  tableName: "sessions",
});

const sessionConfig = {
  secret: process.env.SESSION_SECRET!,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    maxAge: sessionTtl,
  },
};

export function getSession() {
  return session(sessionConfig);
}

export interface SessionStoreWithGet extends session.Store {
  get(sid: string, callback: (err: any, session?: session.SessionData | null) => void): void;
}

export function getSessionFromStore(sessionId: string): Promise<session.SessionData | null> {
  return new Promise((resolve, reject) => {
    (sessionStore as SessionStoreWithGet).get(sessionId, (err, session) => {
      if (err) {
        reject(err);
      } else {
        resolve(session || null);
      }
    });
  });
}

export function unsignSessionCookie(signedValue: string): string | null {
  const secret = process.env.SESSION_SECRET!;
  const decoded = decodeURIComponent(signedValue);
  
  if (!decoded.startsWith('s:')) {
    return null;
  }
  
  const signedPart = decoded.slice(2);
  const result = cookieSignature.unsign(signedPart, secret);
  
  return result === false ? null : result;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (req.session.userId) return next();

  // Fallback: Bearer token for mobile app (avoids cross-site cookie blocking)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const record = await storage.getMobileTokenByToken(token);
      if (record && record.expiresAt > new Date()) {
        req.session.userId = record.userId;
        return next();
      }
    } catch (err) {
      console.error("[isAuthenticated] Bearer token lookup error:", err);
    }
  }

  return res.status(401).json({ message: "Unauthorized" });
};

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}
