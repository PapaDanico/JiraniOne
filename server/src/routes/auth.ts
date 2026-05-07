import { Router } from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { lucia } from "../auth.js";
import { users, estates } from "@shared/schema.js";
import { loginSchema, registerSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { newId } from "../lib/ids.js";
import type { AuthUser } from "@shared/types.js";

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
