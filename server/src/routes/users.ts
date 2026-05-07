import { Router } from "express";
import bcrypt from "bcrypt";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../db.js";
import { users } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { sendSms } from "../lib/sms.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

// Admin: list all estate users
usersRouter.get("/", requireRole("admin"), async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select({
      id: users.id,
      phone: users.phone,
      name: users.name,
      role: users.role,
      estateId: users.estateId,
      unitNumber: users.unitNumber,
      avatarUrl: users.avatarUrl,
      deletedAt: users.deletedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.estateId, user.estateId!), isNull(users.deletedAt)))
    .orderBy(users.role, users.name);
  res.json({ data: rows });
});

// Admin: create estate user
usersRouter.post("/", requireRole("admin"), async (req, res) => {
  const admin = res.locals.user!;
  const { phone, name, role, unitNumber, password } = req.body as {
    phone: string; name: string; role?: string;
    unitNumber?: string; password?: string;
  };

  if (!phone || !name) {
    res.status(400).json({ error: "phone and name are required" });
    return;
  }

  const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Phone number already registered" });
    return;
  }

  const tempPassword = password ?? Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const insertedRows = await db.insert(users).values({
    id: newId(),
    phone,
    passwordHash,
    name,
    role: (role ?? "resident") as never,
    estateId: admin.estateId,
    unitNumber: unitNumber ?? null,
  }).returning();
  const newUser = insertedRows[0]!;

  // Notify via SMS if configured
  await sendSms({
    to: phone,
    message: `Welcome to JiraniHub! Your login: Phone ${phone}, Password: ${tempPassword}. Visit https://www.jiranihub.co.ke`,
  });

  res.status(201).json({
    data: {
      id: newUser.id, phone: newUser.phone, name: newUser.name,
      role: newUser.role, unitNumber: newUser.unitNumber,
    },
    tempPassword,
  });
});

// Admin: update user (unit number, role, reactivate)
usersRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const admin = res.locals.user!;
  const { name, unitNumber, role } = req.body as {
    name?: string; unitNumber?: string | null; role?: string;
  };

  const [existing] = await db.select().from(users)
    .where(and(eq(users.id, req.params['id']!), eq(users.estateId, admin.estateId!)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const updates: Partial<typeof existing> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (unitNumber !== undefined) updates.unitNumber = unitNumber;
  if (role !== undefined) updates.role = role as never;

  const updatedRows = await db.update(users).set(updates)
    .where(eq(users.id, req.params['id']!)).returning();
  const updated = updatedRows[0]!;

  res.json({
    data: {
      id: updated.id, phone: updated.phone, name: updated.name,
      role: updated.role, unitNumber: updated.unitNumber,
    },
  });
});

// Admin: deactivate user (soft delete)
usersRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const admin = res.locals.user!;

  if (req.params['id'] === admin.id) {
    res.status(400).json({ error: "Cannot deactivate your own account" });
    return;
  }

  const [existing] = await db.select().from(users)
    .where(and(eq(users.id, req.params['id']!), eq(users.estateId, admin.estateId!)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  await db.update(users).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, req.params['id']!));

  res.json({ data: { success: true } });
});

// Resident: update own profile
usersRouter.patch("/me/profile", async (req, res) => {
  const user = res.locals.user!;
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }

  await db.update(users).set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  res.json({ data: { success: true } });
});

// Resident: change own password
usersRouter.post("/me/password", async (req, res) => {
  const user = res.locals.user!;
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string; newPassword: string;
  };

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const valid = await bcrypt.compare(currentPassword, dbUser!.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

  res.json({ data: { success: true } });
});
