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

export const handler = serverless(createApp());
