import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { lucia } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { visitorsRouter } from "./routes/visitors.js";
import { maintenanceRouter } from "./routes/maintenance.js";
import { announcementsRouter } from "./routes/announcements.js";
import { notificationsRouter } from "./routes/notifications.js";
import { paymentsRouter } from "./routes/payments.js";
import { emergencyRouter } from "./routes/emergency.js";
import { eventsRouter } from "./routes/events.js";
import { pollsRouter } from "./routes/polls.js";
import { facilitiesRouter } from "./routes/facilities.js";
import { servicesRouter } from "./routes/services.js";
import { usersRouter } from "./routes/users.js";
import { weatherRouter } from "./routes/weather.js";
import { trafficRouter } from "./routes/traffic.js";
import { parcelsRouter } from "./routes/parcels.js";
import { classifiedsRouter } from "./routes/classifieds.js";
import { harambeeRouter } from "./routes/harambee.js";
import { carpoolRouter } from "./routes/carpool.js";
import { chamaRouter } from "./routes/chama.js";
import { analyticsRouter } from "./routes/analytics.js";
import { createWsServer } from "./ws.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? 5000);

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc:      ["'self'"],
            scriptSrc:       ["'self'"],
            styleSrc:        ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc:         ["https://fonts.gstatic.com"],
            imgSrc:          ["'self'", "data:", "https:"],
            connectSrc:      ["'self'", "wss://jiranihub.onrender.com", "https://www.jiranihub.co.ke", "wss://www.jiranihub.co.ke"],
            frameAncestors:  ["'none'"],
            baseUri:         ["'self'"],
            formAction:      ["'self'"],
            upgradeInsecureRequests: [],
          },
          reportOnly: true,   // audit mode — watch logs for violations, then enforce
        }
      : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

// Permissions-Policy header (camera, mic, geolocation, payment lockdown)
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  next();
});

const ALLOWED_ORIGINS = isProd
  ? [
      "https://www.jiranihub.co.ke",
      "https://jiranihub.co.ke",
      process.env.CLIENT_URL,
      process.env.RENDER_EXTERNAL_URL,
    ].filter(Boolean) as string[]
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Global rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Tight limit on auth — 10 attempts per 15 min per IP (P6)
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again later." },
  }),
);
app.use(
  "/api/auth/register",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many registration attempts. Please try again later." },
  }),
);

// Tight limit on M-Pesa STK push — 5 per 15 min per IP
app.use(
  "/api/payments/stk-push",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many payment requests. Please wait before retrying." },
  }),
);

// ─── Auth session middleware (Lucia) ──────────────────────────────────────────
app.use(async (req, res, next) => {
  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "");
  if (!sessionId) {
    res.locals.user = null;
    res.locals.session = null;
    return next();
  }
  const { session, user } = await lucia.validateSession(sessionId);
  if (session?.fresh) {
    res.appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
  }
  if (!session) {
    res.appendHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize());
  }
  res.locals.session = session;
  res.locals.user = user;
  next();
});

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Static uploads ───────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/visitors", visitorsRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/emergency", emergencyRouter);
app.use("/api/events", eventsRouter);
app.use("/api/polls", pollsRouter);
app.use("/api/facilities", facilitiesRouter);
app.use("/api/services", servicesRouter);
app.use("/api/users", usersRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/traffic", trafficRouter);
app.use("/api/parcels", parcelsRouter);
app.use("/api/classifieds", classifiedsRouter);
app.use("/api/harambee", harambeeRouter);
app.use("/api/carpool", carpoolRouter);
app.use("/api/chama", chamaRouter);
app.use("/api/analytics", analyticsRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Serve React in production ────────────────────────────────────────────────
if (isProd) {
  const staticPath = path.join(process.cwd(), "dist/public");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
const httpServer = createServer(app);
createWsServer(httpServer);

httpServer.listen(PORT, () => {
  console.info(`JiraniHub server running on http://localhost:${PORT}`);
});
