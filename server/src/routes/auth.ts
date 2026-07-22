import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomInt, createHash } from "crypto";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { db, dbTx } from "../db.js";
import { lucia } from "../auth.js";
import { users, estates, passwordResetTokens, loginAttempts, userSetupTokens } from "@shared/schema.js";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  claimSetupSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { newId } from "../lib/ids.js";
import { sendThrottledSms } from "../lib/sms.js";
import { logger } from "../lib/logger.js";
import type { AuthUser } from "@shared/types.js";
import { SMS_SENDER_ID } from "@shared/brand.js";

const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_DAILY_PER_PHONE_CAP = 3;
const LOGIN_LOCKOUT_THRESHOLD = 10;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const BCRYPT_COST = 12;

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { phone, password, name, estateId, unitNumber } = parsed.data;

  // Only an ACTIVE account blocks registration — a deactivated account's
  // phone must stay reusable (mirrors users.ts's admin-invite route).
  const [existing] = await db.select().from(users)
    .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
    .limit(1);
  if (existing) {
    // Previously this returned a 202 "success-shaped" response to avoid
    // leaking whether the phone was taken — but the status code (202 vs
    // 201) and body shape already gave it away, AND the client's register()
    // treats any 2xx as success and stores the response body as the
    // AuthUser, so a returning user got silently dropped into a broken,
    // logged-out-but-truthy auth state instead of a usable error. A clear
    // 409 is both more honest and fixes that client-side breakage.
    res.status(409).json({
      error: "This phone number is already registered. Try signing in instead.",
    });
    return;
  }

  // Verify estate exists if provided
  if (estateId) {
    const [estate] = await db.select().from(estates).where(eq(estates.id, estateId)).limit(1);
    if (!estate) {
      res.status(400).json({ error: "Estate not found — check the estate code" });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const inserted = await db.insert(users).values({
    id: newId(),
    phone,
    passwordHash,
    name,
    role: "resident",
    estateId: estateId ?? null,
    unitNumber: unitNumber ?? null,
  }).returning();
  const user = inserted[0]!;

  const session = await lucia.createSession(user.id, {});
  res.appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize());

  const authUser: AuthUser = {
    id: user.id, phone: user.phone, name: user.name,
    role: user.role, estateId: user.estateId, unitNumber: user.unitNumber, avatarUrl: user.avatarUrl,
  };
  res.status(201).json({ data: authUser });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { phone, password } = parsed.data;

  // Filtered at the query, not just checked after — a phone can now map to
  // more than one row (an active account plus any deactivated ones sharing
  // the same reused number), and `.limit(1)` with no ORDER BY does not
  // guarantee which row comes back if the filter doesn't narrow it first.
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid phone number or password" });
    return;
  }

  // Per-account lockout. The IP-level limiter at index.ts caps brute-force
  // from a single IP, but an attacker rotating IPs (botnet, residential
  // proxies) can run unlimited guesses without this.
  const [attemptRow] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.userId, user.id))
    .limit(1);

  if (attemptRow?.lockedUntil && attemptRow.lockedUntil > new Date()) {
    res.status(429).json({
      error: "Account temporarily locked due to repeated failed sign-ins. Try again later or use Forgot password.",
    });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    // Atomic upsert-increment: a plain select-then-insert/update race let
    // two concurrent bad-password requests both read the same failedCount
    // (lost update), and a user's very first failure could throw a
    // primary-key violation when two requests both tried to INSERT,
    // surfacing as an uncaught 500 instead of 401.
    const [attempt] = await db
      .insert(loginAttempts)
      .values({
        userId: user.id,
        failedCount: 1,
        lastFailedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: loginAttempts.userId,
        set: {
          failedCount: sql`${loginAttempts.failedCount} + 1`,
          lastFailedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    if (attempt!.failedCount >= LOGIN_LOCKOUT_THRESHOLD) {
      await db.update(loginAttempts)
        .set({ lockedUntil: new Date(Date.now() + LOGIN_LOCKOUT_MS) })
        .where(eq(loginAttempts.userId, user.id));
    }

    res.status(401).json({ error: "Invalid phone number or password" });
    return;
  }

  // Successful auth — reset the failed-attempt counter.
  if (attemptRow && (attemptRow.failedCount > 0 || attemptRow.lockedUntil)) {
    await db.update(loginAttempts)
      .set({ failedCount: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(loginAttempts.userId, user.id));
  }

  const session = await lucia.createSession(user.id, {});
  const cookie = lucia.createSessionCookie(session.id);
  res.appendHeader("Set-Cookie", cookie.serialize());

  const authUser: AuthUser = {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    estateId: user.estateId,
    unitNumber: user.unitNumber,
    avatarUrl: user.avatarUrl,
  };

  res.json({ data: authUser });
});

// ─── Forgot password: request OTP via SMS ─────────────────────────────────────
// Always returns 200 so attackers cannot enumerate registered phone numbers.
authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid Kenyan phone number" });
    return;
  }

  const { phone } = parsed.data;
  const [user] = await db.select().from(users)
    .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
    .limit(1);

  if (user) {
    // Per-phone daily cap: 3 OTP requests / 24h regardless of source IP.
    // Prevents an attacker rotating IPs from blasting SMS (smishing /
    // SMS-cost amplification) at any victim's number. Locking the user row
    // for the transaction's duration serializes concurrent forgot-password
    // requests for the same phone — without it, the count check and the
    // insert run as separate statements and concurrent requests can all
    // read the same pre-insert count, letting the cap be exceeded.
    const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const otpHash = await bcrypt.hash(otp, BCRYPT_COST);
    const sent = await dbTx.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`);

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const countRows = await tx
        .select({ value: count() })
        .from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.userId, user.id),
          gt(passwordResetTokens.createdAt, since),
        ));
      const recentCount = countRows[0]?.value ?? 0;
      if (recentCount >= OTP_DAILY_PER_PHONE_CAP) return false;

      // Invalidate any prior unconsumed tokens for this user
      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.consumedAt),
        ));

      await tx.insert(passwordResetTokens).values({
        id: newId(),
        userId: user.id,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      });
      return true;
    });

    if (sent) {
      const sms = await sendThrottledSms({
        userId: user.id,
        to: phone,
        message: `${SMS_SENDER_ID}: Your password reset code is ${otp}. It expires in 15 minutes. If you did not request this, ignore this SMS.`,
      });
      // The response below is intentionally generic regardless of outcome
      // (anti phone-enumeration) — but that means a delivery failure is
      // otherwise completely invisible. Log it so an SMS-misconfiguration
      // or quota issue that's silently locking every resident out of
      // password reset shows up somewhere.
      if (!sms.ok) {
        logger.warn({ userId: user.id, reason: sms.reason }, "password reset OTP SMS failed to send");
      }
    }
  }

  res.json({
    data: {
      message:
        "If that number is registered, we've sent a 6-digit code by SMS. Check your phone.",
    },
  });
});

// ─── Reset password: verify OTP and set new password ──────────────────────────
authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { phone, otp, password } = parsed.data;
  const [user] = await db.select().from(users)
    .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
    .limit(1);
  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const [token] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.userId, user.id),
      isNull(passwordResetTokens.consumedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ))
    .orderBy(passwordResetTokens.createdAt)
    .limit(1);

  if (!token) {
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  if (token.attempts >= OTP_MAX_ATTEMPTS) {
    await db
      .update(passwordResetTokens)
      .set({ consumedAt: new Date() })
      .where(eq(passwordResetTokens.id, token.id));
    res.status(429).json({ error: "Too many attempts. Request a new code." });
    return;
  }

  const valid = await bcrypt.compare(otp, token.otpHash);
  if (!valid) {
    // `attempts + 1` computed in SQL against the live row, not the JS-side
    // value read earlier — two concurrent guesses for the same token would
    // otherwise both compute off the same stale `token.attempts`, losing an
    // increment and letting an attacker exceed OTP_MAX_ATTEMPTS by firing
    // guesses in parallel (the same race already fixed for login lockout).
    await db
      .update(passwordResetTokens)
      .set({ attempts: sql`${passwordResetTokens.attempts} + 1` })
      .where(eq(passwordResetTokens.id, token.id));
    res.status(400).json({ error: "Invalid or expired reset code" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db
    .update(passwordResetTokens)
    .set({ consumedAt: new Date() })
    .where(eq(passwordResetTokens.id, token.id));

  // Clear any lockout state on successful reset.
  await db.update(loginAttempts)
    .set({ failedCount: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(loginAttempts.userId, user.id));

  // Force re-login on every device
  await lucia.invalidateUserSessions(user.id);

  res.json({
    data: {
      message: "Password reset successful. Sign in with your new password.",
    },
  });
});

authRouter.post("/logout", requireAuth, async (_req, res) => {
  await lucia.invalidateSession(res.locals.session!.id);
  res.appendHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize());
  res.json({ data: { success: true } });
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const u = res.locals.user!;
  const authUser: AuthUser = {
    id: u.id, phone: u.phone, name: u.name,
    role: u.role, estateId: u.estateId, unitNumber: u.unitNumber, avatarUrl: u.avatarUrl,
  };
  res.json({ data: authUser });
});

// Get current user's estate info
authRouter.get("/estate", requireAuth, async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: null }); return; }
  const [estate] = await db.select().from(estates).where(eq(estates.id, user.estateId)).limit(1);
  res.json({ data: estate ?? null });
});

// List all estates (for registration dropdown)
authRouter.get("/estates", async (_req, res) => {
  const rows = await db.select({
    id: estates.id,
    name: estates.name,
    location: estates.location,
  }).from(estates).orderBy(estates.name);
  res.json({ data: rows });
});

// Validate a setup token — returns the pre-filled phone number for the form.
// Does NOT reveal whether the token is invalid vs expired to limit oracle attacks
// (both return 404 with the same message).
authRouter.get("/setup/:token", async (req, res) => {
  const raw = req.params["token"];
  if (!raw || raw.length < 32) {
    res.status(404).json({ error: "Invalid setup link" });
    return;
  }

  const tokenHash = createHash("sha256").update(raw).digest("hex");

  const [record] = await db
    .select()
    .from(userSetupTokens)
    .where(eq(userSetupTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    res.status(404).json({ error: "Invalid or expired setup link" });
    return;
  }

  const [user] = await db
    .select({ phone: users.phone, name: users.name, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, record.userId))
    .limit(1);

  // Deactivated account = revoked invite; the link must read as dead.
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "Invalid or expired setup link" });
    return;
  }

  res.json({ data: { phone: user.phone, name: user.name } });
});

// Claim account: validate token, set password, create session, invalidate token.
authRouter.post("/setup", async (req, res) => {
  const parsed = claimSetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { token, password } = parsed.data;

  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Atomic claim: consume the token in the same statement that checks it's
  // unconsumed and unexpired. The previous select-then-unconditional-update
  // let two concurrent POSTs with the same token both pass the check before
  // either write landed — both got sessions and the one-time token was
  // effectively replayed. Now the second request's UPDATE matches 0 rows.
  const claimed = await db
    .update(userSetupTokens)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(userSetupTokens.tokenHash, tokenHash),
      isNull(userSetupTokens.consumedAt),
      gt(userSetupTokens.expiresAt, new Date()),
    ))
    .returning();
  const record = claimed[0];

  if (!record) {
    res.status(404).json({ error: "Invalid or expired setup link" });
    return;
  }

  // A deactivated account must not be claimable — deactivation is how an
  // admin revokes a mistaken invite. Token is already consumed above, so
  // the link is dead either way.
  const [targetUser] = await db
    .select({ deletedAt: users.deletedAt })
    .from(users)
    .where(eq(users.id, record.userId))
    .limit(1);
  if (!targetUser || targetUser.deletedAt) {
    res.status(404).json({ error: "Invalid or expired setup link" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, record.userId));

  // Create a session so the user is logged in immediately after setup.
  const session = await lucia.createSession(record.userId, {});
  res
    .appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize())
    .status(201)
    .json({ data: { message: "Account set up. You are now signed in." } });
});
