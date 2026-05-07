import { Router } from "express";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db.js";
import { lucia } from "../auth.js";
import { users, estates, passwordResetTokens, loginAttempts } from "@shared/schema.js";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { newId } from "../lib/ids.js";
import { sendThrottledSms } from "../lib/sms.js";
import type { AuthUser } from "@shared/types.js";

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

  const { phone, password, name, role, estateId, unitNumber } = parsed.data;

  const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) {
    // Anti-enumeration: don't reveal whether the phone is taken. Return a
    // success-shaped response so an attacker probing /register cannot map
    // which numbers have accounts. Real registrations succeed below; the
    // duplicate write would have collided on the UNIQUE phone column anyway.
    res.status(202).json({
      data: {
        message: "If your phone number is eligible, we've started your registration. Check your SMS or sign in.",
        deferred: true,
      },
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
    role: role ?? "resident",
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

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);

  if (!user || user.deletedAt) {
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
    const newCount = (attemptRow?.failedCount ?? 0) + 1;
    const shouldLock = newCount >= LOGIN_LOCKOUT_THRESHOLD;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOGIN_LOCKOUT_MS) : null;

    if (attemptRow) {
      await db.update(loginAttempts)
        .set({
          failedCount: newCount,
          lockedUntil,
          lastFailedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(loginAttempts.userId, user.id));
    } else {
      await db.insert(loginAttempts).values({
        userId: user.id,
        failedCount: newCount,
        lockedUntil,
        lastFailedAt: new Date(),
      });
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
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

  if (user && !user.deletedAt) {
    // Per-phone daily cap: 3 OTP requests / 24h regardless of source IP.
    // Prevents an attacker rotating IPs from blasting SMS (smishing /
    // SMS-cost amplification) at any victim's number.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const countRows = await db
      .select({ value: count() })
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, user.id),
        gt(passwordResetTokens.createdAt, since),
      ));
    const recentCount = countRows[0]?.value ?? 0;

    if (recentCount < OTP_DAILY_PER_PHONE_CAP) {
      const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const otpHash = await bcrypt.hash(otp, BCRYPT_COST);

      // Invalidate any prior unconsumed tokens for this user
      await db
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.consumedAt),
        ));

      await db.insert(passwordResetTokens).values({
        id: newId(),
        userId: user.id,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      });

      await sendThrottledSms({
        userId: user.id,
        to: phone,
        message: `JiraniHub: Your password reset code is ${otp}. It expires in 15 minutes. If you did not request this, ignore this SMS.`,
      });
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
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user || user.deletedAt) {
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
    await db
      .update(passwordResetTokens)
      .set({ attempts: token.attempts + 1 })
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
