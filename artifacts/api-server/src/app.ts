import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import path from "path";

const app: Express = express();

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

      // Allow Replit dev/prod/preview domains and localhost.
      const trusted =
        /\.replit\.dev$/.test(origin) ||
        /\.replit\.app$/.test(origin) ||
        /\.repl\.co$/.test(origin) ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

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
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

export default app;
