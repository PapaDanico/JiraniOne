/**
 * Migration: Add password_reset_tokens table
 * Run once: node migrate-password-reset.mjs
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash    TEXT NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    expires_at  TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS password_reset_user_id_idx    ON password_reset_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS password_reset_expires_at_idx ON password_reset_tokens(expires_at)`,
];

async function run() {
  console.log(`Running ${statements.length} migration statements…`);
  for (let i = 0; i < statements.length; i++) {
    try {
      await sql(statements[i]);
      console.log(`  OK [${i + 1}/${statements.length}]`);
    } catch (err) {
      console.error(`  FAILED [${i + 1}/${statements.length}]:`, err.message);
      process.exit(1);
    }
  }
  console.log("Migration complete");
}

run();
