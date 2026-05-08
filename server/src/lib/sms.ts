// SMS dispatch via Africa's Talking, with budget controls.
//
// Two layers of protection against runaway SMS spend:
//   - SMS_PER_USER_DAILY_CAP   (default: 30/day per authenticated user)
//   - SMS_GLOBAL_DAILY_CAP     (default: 5000/day across the platform)
// Both are read at request time so they can be tuned without redeploy
// (set via Render environment variables).
//
// All caller paths (visitor invites, OTPs, announcements, emergency alerts)
// should go through `sendThrottledSms`. The raw `sendSmsRaw` is exported for
// system-level dispatches that legitimately bypass per-user quota — but
// they STILL count against the global cap.

import { sql } from "drizzle-orm";
import { db } from "../db.js";
import { smsQuotas, smsGlobalQuota } from "@shared/schema.js";

interface SmsOptions {
  to: string;
  message: string;
}

interface ThrottledSmsOptions extends SmsOptions {
  userId?: string;
  // Bypass per-user quota for system-level messages (still subject to global).
  systemMessage?: boolean;
}

interface SmsResult {
  ok: boolean;
  reason?: "user_quota_exceeded" | "global_quota_exceeded" | "send_failed";
}

const PER_USER_CAP = () =>
  parseInt(process.env.SMS_PER_USER_DAILY_CAP ?? "30", 10);
const GLOBAL_CAP = () =>
  parseInt(process.env.SMS_GLOBAL_DAILY_CAP ?? "5000", 10);

function today(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Atomic per-user counter increment. Returns the count AFTER increment.
// Resets the count when a new day rolls over (day column is the rolling
// daily bucket).
async function incrementUserQuota(userId: string): Promise<number> {
  const day = today();
  const rows = await db.execute<{ sent_count: number }>(sql`
    INSERT INTO sms_quotas (user_id, day, sent_count, updated_at)
    VALUES (${userId}, ${day}, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
       SET sent_count = CASE
             WHEN sms_quotas.day = EXCLUDED.day THEN sms_quotas.sent_count + 1
             ELSE 1
           END,
           day = EXCLUDED.day,
           updated_at = NOW()
    RETURNING sent_count
  `);
  return rows.rows[0]?.sent_count ?? 0;
}

async function decrementUserQuota(userId: string): Promise<void> {
  const day = today();
  await db.execute(sql`
    UPDATE sms_quotas
       SET sent_count = GREATEST(sent_count - 1, 0),
           updated_at = NOW()
     WHERE user_id = ${userId}
       AND day = ${day}
  `);
}

async function incrementGlobalQuota(): Promise<number> {
  const day = today();
  const rows = await db.execute<{ sent_count: number }>(sql`
    INSERT INTO sms_global_quota (day, sent_count, updated_at)
    VALUES (${day}, 1, NOW())
    ON CONFLICT (day) DO UPDATE
       SET sent_count = sms_global_quota.sent_count + 1,
           updated_at = NOW()
    RETURNING sent_count
  `);
  return rows.rows[0]?.sent_count ?? 0;
}

async function decrementGlobalQuota(): Promise<void> {
  const day = today();
  await db.execute(sql`
    UPDATE sms_global_quota
       SET sent_count = GREATEST(sent_count - 1, 0),
           updated_at = NOW()
     WHERE day = ${day}
  `);
}

// Raw send — does NOT check quotas. Internal use only.
export async function sendSmsRaw({ to, message }: SmsOptions): Promise<boolean> {
  const apiKey = process.env.SMS_API_KEY;
  const username = process.env.SMS_USERNAME;

  if (!apiKey || !username || apiKey === "your_africastalking_api_key") {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[SMS STUB] To: ${to}\n${message}`);
    }
    return true;
  }

  try {
    const body = new URLSearchParams({
      username,
      to,
      message,
      from: "JiraniHub",
    });
    const res = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );
    return res.ok;
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "sms_send_failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return false;
  }
}

/**
 * Send an SMS while honouring per-user and global daily caps.
 * Returns { ok: false, reason } when capped or send fails — callers must
 * handle the failure (typically: log + don't retry).
 */
export async function sendThrottledSms({
  userId,
  to,
  message,
  systemMessage,
}: ThrottledSmsOptions): Promise<SmsResult> {
  // ── Global cap (always enforced) ─────────────────────────────────
  let globalCount: number;
  try {
    globalCount = await incrementGlobalQuota();
  } catch (err) {
    // If quota write fails, fall through to send — losing visibility
    // is better than blocking SMS during DB hiccups.
    console.error(
      JSON.stringify({
        event: "sms_global_quota_write_failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: await sendSmsRaw({ to, message }), reason: "send_failed" };
  }

  if (globalCount > GLOBAL_CAP()) {
    await decrementGlobalQuota();
    console.warn(
      JSON.stringify({
        event: "sms_global_cap_hit",
        cap: GLOBAL_CAP(),
        attempted_to: to,
      }),
    );
    return { ok: false, reason: "global_quota_exceeded" };
  }

  // ── Per-user cap ─────────────────────────────────────────────────
  if (userId && !systemMessage) {
    let userCount: number;
    try {
      userCount = await incrementUserQuota(userId);
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "sms_user_quota_write_failed",
          userId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      return { ok: await sendSmsRaw({ to, message }), reason: "send_failed" };
    }
    if (userCount > PER_USER_CAP()) {
      await decrementUserQuota(userId);
      await decrementGlobalQuota();
      console.warn(
        JSON.stringify({
          event: "sms_user_cap_hit",
          userId,
          cap: PER_USER_CAP(),
        }),
      );
      return { ok: false, reason: "user_quota_exceeded" };
    }
  }

  const ok = await sendSmsRaw({ to, message });
  if (!ok) {
    if (userId && !systemMessage) await decrementUserQuota(userId);
    await decrementGlobalQuota();
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true };
}

// Backwards-compatible default export — most existing call sites pass only
// {to, message}. Routes that already have a user context should migrate to
// sendThrottledSms({ userId, ... }).
export async function sendSms(opts: SmsOptions): Promise<boolean> {
  const result = await sendThrottledSms({
    ...opts,
    systemMessage: true, // default to system-level (no per-user cap) for
                          // legacy call sites; route migrations should
                          // pass an explicit userId.
  });
  return result.ok;
}
