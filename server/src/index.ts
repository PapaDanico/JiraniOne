import "dotenv/config";

// Validate critical environment variables early
const requiredEnvVars = ["DATABASE_URL", "SESSION_SECRET"];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`❌ FATAL: Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Please configure these variables before starting the server");
  process.exit(1);
}

import express from "express";
import { createServer } from "http";
import path from "path";
import { createApp } from "./createApp.js";
import { logger, captureException } from "./lib/logger.js";
import { isProduction } from "./lib/env.js";

// This entry point is for local dev (`npm run dev`) and any traditional
// Node hosting fallback — not used by the deployed Netlify Function, which
// wraps createApp() directly via serverless-http (see
// netlify/functions/api.ts). Process-lifetime concerns live here rather
// than in createApp() because they don't apply to a stateless function
// invocation.

const isProd = isProduction();
const PORT = Number(process.env.PORT ?? 5000);

const app = createApp();

// ─── Serve React in production (Netlify's CDN does this instead when
// deployed there — this block only matters for a traditional Node host) ───
if (isProd) {
  const staticPath = path.join(process.cwd(), "dist/public");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

// ─── Process-level guards ─────────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
  captureException(reason);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  captureException(err);
  // Crash deliberately — let the process manager restart on a clean slate.
  process.exit(1);
});

// ─── Start ────────────────────────────────────────────────────────────────────
const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? "development" }, "JiraniHub server started");
});
