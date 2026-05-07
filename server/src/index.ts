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
import { paymentsRouter, mpesaCallbackRouter } from "./routes/payments.js";
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
import { registerCronJobs } from "./cron.js";
import { logger } from "./lib/logger.js";
import pinoHttp from "pino-http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? 5000);

const app = express();

// Render terminates TLS at its load balancer; trust the first proxy hop so
// req.ip resolves to the real client IP (used by the M-PESA IP allowlist
// and rate limiters).
app.set("trust proxy", 1);

// Structured request logging — every request gets a per-request logger
// with a generated request id, accessible as req.log.
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        // Strip query strings of OTPs / passwords if accidentally appended
        // to a GET via misconfiguration.
      }),
    },
  }),
);

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
app.use(
  "/api/auth/forgot-password",
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many reset requests. Please try again later." },
  }),
);
app.use(
  "/api/auth/reset-password",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Please request a new code." },
  }),
);
// Public estate list — leaks customer estate names. Rate-limit aggressively
// so it can't be scraped for competitive intelligence or attack targeting.
app.use(
  "/api/auth/estates",
  rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
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

// ─── Origin check on mutating requests ────────────────────────────────────────
// Layered defence on top of SameSite=lax. Rejects state-changing requests
// whose Origin header is not in the CORS allowlist. The CORS middleware
// catches browser-driven cross-origin requests, but server-to-server callers
// can spoof Origin freely; this is a belt-and-braces guard against CSRF in
// case a future GET endpoint accidentally mutates state.
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
app.use((req, res, next) => {
  if (!MUTATING_METHODS.has(req.method)) return next();

  // Allow public M-PESA callback (it has its own IP allowlist) and
  // server-to-server callers without an Origin (curl, mobile native,
  // Daraja). Browsers ALWAYS send Origin on mutating XHR/fetch.
  if (req.path === "/api/payments/mpesa/callback") return next();
  const origin = req.headers.origin;
  if (!origin) return next();

  if (isProd && !ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  next();
});

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

  // Reject sessions for soft-deleted users — without this, a banned user's
  // existing cookie keeps working until cookie expiry. Lucia's session
  // model doesn't know about deletedAt; we have to filter here.
  if (user && (user as { deletedAt?: Date | null }).deletedAt) {
    if (session) await lucia.invalidateSession(session.id);
    res.appendHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize());
    res.locals.session = null;
    res.locals.user = null;
    return next();
  }

  res.locals.session = session;
  res.locals.user = user;
  next();
});

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Static uploads ───────────────────────────────────────────────────────────
// Filenames are content-addressed (random hex from imageUpload.ts), so we
// can long-cache and mark immutable. nosniff prevents browser MIME-type
// guessing — defence in depth on top of magic-byte validation at upload.
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    maxAge: "30d",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
    },
  }),
);

// ─── M-PESA callback (public, IP-allowlisted) ─────────────────────────────────
// Mounted BEFORE the authenticated paymentsRouter so Safaricom can reach it.
app.use("/api/payments", mpesaCallbackRouter);

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
// Render's health probe hits this; returning OK without a DB ping means a
// DB outage looks healthy. Run a cheap SELECT 1 and 503 if the DB is down.
app.get("/api/health", async (_req, res) => {
  try {
    const { sql } = await import("drizzle-orm");
    const { db } = await import("./db.js");
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      error: err instanceof Error ? err.message : "db_unreachable",
    });
  }
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
registerCronJobs();

httpServer.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? "development" }, "JiraniHub server started");
});
