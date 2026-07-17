import "dotenv/config";
import serverless from "serverless-http";
import { createApp } from "../../server/src/createApp.js";

// NODE_ENV specifically (not just DATABASE_URL/SESSION_SECRET) must be
// verified present — it drives createApp()'s isProd flag, which in turn
// picks ALLOWED_ORIGINS. If it's unset here, ALLOWED_ORIGINS silently
// falls back to the dev list (localhost only), and the global cors()
// middleware then rejects every request whose Origin header is the real
// site — a fast, synchronous 500 on every mutating request (login,
// register, etc.) that looks identical to a generic server crash. This
// exact gap caused a production login outage: NODE_ENV was never actually
// set on the live Netlify site despite an earlier PR's description
// claiming it was.
const requiredEnvVars = ["DATABASE_URL", "SESSION_SECRET", "NODE_ENV"];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

export const handler = serverless(createApp(), {
  basePath: "/.netlify/functions/api",
});
