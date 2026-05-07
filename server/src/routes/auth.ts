import { Router } from "express";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db.js";
import { lucia } from "../auth.js";
import { users, estates, passwordResetTokens } from "@shared/schema.js";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { newId } from "../lib/ids.js";
import { sendSms } from "../lib/sms.js";
import type { AuthUser } from "@shared/types.js";

const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes
const OTP_MAX_ATTEMPTS = 5;

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
    res.status(409).json({ error: "Phone number already registered" });
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

  const passwordHash = await bcrypt.hash(password, 10);
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

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid phone number or password" });
    return;
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
    const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const otpHash = await bcrypt.hash(otp, 10);

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

    await sendSms({
      to: phone,
      message: `JiraniHub: Your password reset code is ${otp}. It expires in 15 minutes. If you did not request this, ignore this SMS.`,
    });
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

  const passwordHash = await bcrypt.hash(password, 10);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await db
    .update(passwordResetTokens)
    .set({ consumedAt: new Date() })
    .where(eq(passwordResetTokens.id, token.id));

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
