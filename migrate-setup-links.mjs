/**
 * Migration: Add user_setup_tokens table
 * Run once: node migrate-setup-links.mjs
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS user_setup_tokens (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL UNIQUE,
    expires_at   TIMESTAMP NOT NULL,
    consumed_at  TIMESTAMP,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS user_setup_tokens_user_id_idx   ON user_setup_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS user_setup_tokens_expires_at_idx ON user_setup_tokens(expires_at)`,
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
