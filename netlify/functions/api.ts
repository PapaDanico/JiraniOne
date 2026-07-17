import "dotenv/config";
import serverless from "serverless-http";
import { createApp } from "../../server/src/createApp.js";

// NODE_ENV is deliberately NOT in this list — confirmed directly that
// Netlify silently refuses to actually store it as a Function env var
// (an "upserted" NODE_ENV never showed up in the site's env vars, and the
// live function kept reporting it missing). server/src/lib/env.ts's
// isProduction() reads Netlify's automatically-provided CONTEXT instead,
// which needs no configuration and has no such gap. See CLAUDE.md's
// DEPLOYMENT TARGET section for the full story — this exact gap caused a
// production login outage (broke CORS) and silently let payments
// auto-complete for free when M-PESA wasn't configured.
const requiredEnvVars = ["DATABASE_URL", "SESSION_SECRET"];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

export const handler = serverless(createApp(), {
  basePath: "/.netlify/functions/api",
});
