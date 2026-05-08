/**
 * Migration: Add metadata jsonb column to payments table.
 * Used by harambee_donation and chama_contribution payment types to store
 * the downstream record parameters (campaignId, chamaId, etc.) so the
 * M-PESA callback can create the correct record on ResultCode === 0.
 * Run once: node migrate-payment-metadata.mjs
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata jsonb`,
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
