import "dotenv/config";
import serverless from "serverless-http";
import { createApp } from "../../server/src/createApp.js";

const requiredEnvVars = ["DATABASE_URL", "SESSION_SECRET"];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

const serverlessHandler = serverless(createApp(), {
  basePath: "/.netlify/functions/api",
});

// Temporary diagnostic wrapper (2026-07-17): production login was 500ing
// with no corresponding entry in Netlify's Observability log viewer even
// though our own Express error handler calls logger.error() on every
// unhandled exception. That gap means something is failing outside
// Express's own request/response cycle — before pino-http's response-finish
// hook fires, or in serverless-http's event translation itself — so a
// plain, unmissable console.error here (no pino, no dependency on Express
// ever completing a response) is the fastest way to see what's actually
// throwing. Remove once the root cause is confirmed and fixed.
export const handler = async (event: unknown, context: unknown) => {
  try {
    return await (serverlessHandler as (e: unknown, c: unknown) => Promise<unknown>)(event, context);
  } catch (err) {
    console.error("DIAGNOSTIC_TOP_LEVEL_CATCH", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      event: JSON.stringify(event).slice(0, 500),
    });
    throw err;
  }
};
