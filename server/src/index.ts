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
import { createWsServer } from "./ws.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT ?? 5000);

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);

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

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
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
