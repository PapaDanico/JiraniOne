/**
 * Migration: anonymous-poll vote leak fix.
 *
 * Existing schema stored votes.user_id NOT NULL, so admin queries against
 * anonymous polls could trivially deanonymize voters by joining votes to
 * users. New design:
 *
 *  - votes.user_id becomes NULLABLE. Anonymous polls insert NULL.
 *  - vote_eligibility(poll_id, user_id) replaces the double-vote check —
 *    it tracks WHO voted (always) without recording WHAT they voted.
 *
 * Idempotent: each statement guarded by IF NOT EXISTS / IF EXISTS.
 * Run once via preDeployCommand.
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  // Drop the NOT NULL on existing column. PG: ALTER COLUMN ... DROP NOT NULL.
  `ALTER TABLE votes ALTER COLUMN user_id DROP NOT NULL`,

  // Eligibility table — single row per (poll, user).
  `CREATE TABLE IF NOT EXISTS vote_eligibility (
    id          TEXT PRIMARY KEY,
    poll_id     TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS vote_eligibility_poll_user_uq
     ON vote_eligibility(poll_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS vote_eligibility_poll_id_idx
     ON vote_eligibility(poll_id)`,
  `CREATE INDEX IF NOT EXISTS vote_eligibility_user_id_idx
     ON vote_eligibility(user_id)`,

  // Backfill: existing rows in votes copied into vote_eligibility so the
  // double-vote check stays consistent. Skip rows that already exist.
  `INSERT INTO vote_eligibility (id, poll_id, user_id, created_at)
     SELECT id, poll_id, user_id, created_at FROM votes
       WHERE user_id IS NOT NULL
     ON CONFLICT (poll_id, user_id) DO NOTHING`,

  // For polls already marked anonymous, scrub user_id from existing vote
  // rows so the prior leak is repaired retroactively. Eligibility records
  // were just inserted above, so double-vote check still holds.
  `UPDATE votes
      SET user_id = NULL
    WHERE poll_id IN (SELECT id FROM polls WHERE anonymous = true)`,
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
