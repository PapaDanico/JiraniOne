/**
 * Migration: M-PESA payment integrity hardening
 * Run once: node migrate-payment-integrity.mjs
 *
 * - Partial UNIQUE indexes on M-PESA reference columns to make the
 *   callback handler idempotent against Safaricom retries (a known
 *   behaviour: Safaricom retries callbacks if it doesn't see a 200
 *   in time, and does NOT deduplicate).
 * - Partial because:
 *   * many rows may have NULL refs (pending payments)
 *   * legacy "DEV_STUB" / "STUB" values exist for dev/non-charged
 *     fundraising/chama paths and we can't break those.
 * - audit_logs table for admin-action accountability (Wave 5).
 * - sms_quotas for per-user / global SMS budget control (Wave 2).
 * - login_attempts for per-account lockout (Wave 3).
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  // ── Payment idempotency ────────────────────────────────────────────
  `CREATE UNIQUE INDEX IF NOT EXISTS payments_checkout_request_id_unique
     ON payments (checkout_request_id)
     WHERE checkout_request_id IS NOT NULL`,

  `CREATE UNIQUE INDEX IF NOT EXISTS payments_mpesa_ref_unique
     ON payments (mpesa_ref)
     WHERE mpesa_ref IS NOT NULL
       AND mpesa_ref NOT IN ('DEV_STUB', 'STUB')`,

  `CREATE UNIQUE INDEX IF NOT EXISTS donations_mpesa_ref_unique
     ON donations (mpesa_ref)
     WHERE mpesa_ref IS NOT NULL
       AND mpesa_ref NOT IN ('DEV_STUB', 'STUB')`,

  `CREATE UNIQUE INDEX IF NOT EXISTS chama_contributions_mpesa_ref_unique
     ON chama_contributions (mpesa_ref)
     WHERE mpesa_ref IS NOT NULL
       AND mpesa_ref NOT IN ('DEV_STUB', 'STUB')`,

  // ── Audit log (P1) ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id          TEXT PRIMARY KEY,
    actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_role  VARCHAR(20),
    action      VARCHAR(80) NOT NULL,
    target_type VARCHAR(40),
    target_id   TEXT,
    estate_id   TEXT REFERENCES estates(id) ON DELETE SET NULL,
    metadata    JSONB,
    ip          VARCHAR(64),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx  ON audit_logs(actor_id)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_target_id_idx ON audit_logs(target_id)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_estate_id_idx ON audit_logs(estate_id)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at)`,

  // ── Per-user SMS quota (P0) ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS sms_quotas (
    user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    day         DATE NOT NULL,
    sent_count  INTEGER NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS sms_quotas_day_idx ON sms_quotas(day)`,

  // Global daily counter, single-row table keyed by date
  `CREATE TABLE IF NOT EXISTS sms_global_quota (
    day         DATE PRIMARY KEY,
    sent_count  INTEGER NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // ── Login attempt tracking (P2) ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS login_attempts (
    user_id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    failed_count   INTEGER NOT NULL DEFAULT 0,
    locked_until   TIMESTAMP,
    last_failed_at TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
  )`,

  // ── Forgot-password per-phone OTP cap (P3) ─────────────────────────
  `CREATE INDEX IF NOT EXISTS password_reset_created_at_idx
     ON password_reset_tokens(created_at)`,

  // ── Hot composite index for tickets/announcements/parcels (P3) ─────
  `CREATE INDEX IF NOT EXISTS tickets_estate_created_idx
     ON maintenance_tickets(estate_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS announcements_estate_created_idx
     ON announcements(estate_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS parcels_estate_status_idx
     ON parcels(estate_id, status)`,
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
