import { Router } from "express";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../db.js";
import { users, userSetupTokens, estates } from "@shared/schema.js";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  setEstateSchema,
} from "@shared/validators.js";
import { lucia } from "../auth.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { writeAudit } from "../lib/audit.js";
import { logger } from "../lib/logger.js";

const log = logger.child({ component: "users" });

// Bcrypt cost factor — kept in sync with auth.ts. OWASP 2026 recommendation
// is 12 rounds.
const BCRYPT_COST = 12;

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

// Admin: create estate user. Issues a one-time setup link (valid 7 days)
// instead of a temp password over SMS. The admin copies the link and shares
// it with the new user via any channel. The link hits /setup/:token where the
// user sets their own password. The token is a 32-byte random value; only its
// SHA-256 hash is stored in the DB.
usersRouter.post("/", requireRole("admin"), async (req, res) => {
  const admin = res.locals.user!;
  const parsed = adminCreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { phone, name, role, unitNumber } = parsed.data;

  const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Phone number already registered" });
    return;
  }

  // Placeholder hash — user has no password until they consume the setup link.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_COST);

  const insertedRows = await db.insert(users).values({
    id: newId(),
    phone,
    passwordHash,
    name,
    role,
    estateId: admin.estateId,
    unitNumber: unitNumber ?? null,
  }).returning();
  const newUser = insertedRows[0]!;

  // 32-byte token (~192 bits). Store only the SHA-256 hash.
  const { createHash } = await import("crypto");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(userSetupTokens).values({
    id: newId(),
    userId: newUser.id,
    tokenHash,
    expiresAt,
  });

  log.info(
    { event: "setup_link_issued", userId: newUser.id, adminId: admin.id },
    "account setup link created",
  );

  await writeAudit(req, {
    action: "user.create",
    targetType: "user",
    targetId: newUser.id,
    metadata: { role: newUser.role, unitNumber: newUser.unitNumber, setupLinkIssued: true },
  });

  const clientUrl = process.env.CLIENT_URL ?? "https://www.jiranihub.co.ke";

  res.status(201).json({
    data: {
      id: newUser.id, phone: newUser.phone, name: newUser.name,
      role: newUser.role, unitNumber: newUser.unitNumber,
    },
    setupLink: `${clientUrl}/setup/${token}`,
    setupLinkExpiresAt: expiresAt.toISOString(),
  });
});

// Admin: update user (unit number, role, reactivate)
usersRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const admin = res.locals.user!;
  const parsed = adminUpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { name, unitNumber, role } = parsed.data;

  const [existing] = await db.select().from(users)
    .where(and(eq(users.id, req.params['id']!), eq(users.estateId, admin.estateId!)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "User not found" }); return; }

  const updates: Partial<typeof existing> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (unitNumber !== undefined) updates.unitNumber = unitNumber;
  if (role !== undefined) updates.role = role;

  const updatedRows = await db.update(users).set(updates)
    .where(eq(users.id, req.params['id']!)).returning();
  const updated = updatedRows[0]!;

  // If a role change occurred, invalidate the user's sessions so cached
  // role state on their devices does not lag behind authoritative state.
  if (role !== undefined && role !== existing.role) {
    await lucia.invalidateUserSessions(existing.id);
  }

  await writeAudit(req, {
    action: "user.update",
    targetType: "user",
    targetId: existing.id,
    metadata: {
      before: { role: existing.role, unitNumber: existing.unitNumber, name: existing.name },
      after: { role: updated.role, unitNumber: updated.unitNumber, name: updated.name },
    },
  });

  res.json({
    data: {
      id: updated.id, phone: updated.phone, name: updated.name,
      role: updated.role, unitNumber: updated.unitNumber,
    },
  });
});

// Admin: deactivate user (soft delete). Also invalidates the target's
// sessions — without this, an existing session cookie continues to work
// until cookie expiry even after the admin "fires" the user.
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

  await lucia.invalidateUserSessions(existing.id);

  await writeAudit(req, {
    action: "user.deactivate",
    targetType: "user",
    targetId: existing.id,
    metadata: { phone: existing.phone, name: existing.name, role: existing.role },
  });

  res.json({ data: { success: true } });
});

// Resident: update own profile
usersRouter.patch("/me/profile", async (req, res) => {
  const user = res.locals.user!;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { name } = parsed.data;

  await db.update(users).set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  res.json({ data: { success: true } });
});

// Resident: confirm which estate they live in. Only allowed as a one-time
// self-service action while unset — an estate admin owns changing it after
// that (via the admin/users management screen), since it gates which
// estate's data the account can see.
usersRouter.patch("/me/estate", async (req, res) => {
  const user = res.locals.user!;
  if (user.estateId) {
    res.status(409).json({ error: "Your estate is already set. Ask your estate admin to change it." });
    return;
  }

  const parsed = setEstateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { estateId, unitNumber } = parsed.data;

  const [estate] = await db.select().from(estates).where(eq(estates.id, estateId)).limit(1);
  if (!estate) {
    res.status(400).json({ error: "Estate not found — check the estate code" });
    return;
  }

  await db.update(users)
    .set({ estateId, unitNumber: unitNumber?.trim() || null, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  res.json({ data: { success: true } });
});

// Resident: change own password. Invalidates ALL OTHER sessions and
// issues a fresh cookie for the current request — so a stolen session
// elsewhere is logged out as soon as the legitimate user changes password.
usersRouter.post("/me/password", async (req, res) => {
  const user = res.locals.user!;
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;

  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const valid = await bcrypt.compare(currentPassword, dbUser!.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

  // Invalidate every Lucia session for this user, then issue a new one for
  // the current request so the user stays signed in here.
  await lucia.invalidateUserSessions(user.id);
  const session = await lucia.createSession(user.id, {});
  res.appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize());

  await writeAudit(req, {
    action: "user.password_change",
    targetType: "user",
    targetId: user.id,
  });

  res.json({ data: { success: true } });
});

// ── Kenya DPA 2019 — data subject rights ─────────────────────────────────────

// GET /api/users/me/sms-quota — current SMS usage for the authenticated user
usersRouter.get("/me/sms-quota", async (_req, res) => {
  const user = res.locals.user!;
  const dailyCap = parseInt(process.env.SMS_PER_USER_DAILY_CAP ?? "30", 10);

  const [row] = await db
    .select({ sentCount: sql<number>`COALESCE(sent_count, 0)` })
    .from(sql`sms_quotas`)
    .where(
      sql`user_id = ${user.id} AND day = CURRENT_DATE`
    )
    .limit(1);

  const sentCount = row?.sentCount ?? 0;
  const remaining = Math.max(0, dailyCap - sentCount);

  res.json({
    data: {
      sentToday: sentCount,
      dailyLimit: dailyCap,
      remaining,
      percentUsed: Math.round((sentCount / dailyCap) * 100),
    },
  });
});

// GET /api/users/me/data — return all data we hold about this user.
// Used to satisfy DPA Article 26 (right to data portability / access).
usersRouter.get("/me/data", async (_req, res) => {
  const user = res.locals.user!;
  const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!me) { res.status(404).json({ error: "User not found" }); return; }

  // Strip sensitive internals (passwordHash) before returning.
  const { passwordHash: _ph, ...exportable } = me;
  void _ph;
  res.json({
    data: {
      profile: exportable,
      generatedAt: new Date().toISOString(),
      note: "This export is your account record. Linked records (visitors you registered, tickets you filed, payments, etc.) are accessible via the corresponding /api/* endpoints.",
    },
  });
});

// POST /api/users/me/erase — soft-delete and scrub PII.
// DPA Article 26 right to erasure. Implemented as anonymize-in-place
// (NOT hard delete) so referential integrity for audit/billing data is
// preserved. The phone is replaced with a non-routable placeholder, name
// is anonymized, sessions are killed.
usersRouter.post("/me/erase", async (req, res) => {
  const user = res.locals.user!;
  const erasedPhone = `+254000${user.id.slice(0, 7).padEnd(7, "0")}`;
  await db.update(users)
    .set({
      name: "Erased user",
      phone: erasedPhone,
      avatarUrl: null,
      unitNumber: null,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await lucia.invalidateUserSessions(user.id);
  res.appendHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize());

  await writeAudit(req, {
    action: "user.self_erase",
    targetType: "user",
    targetId: user.id,
  });

  res.json({ data: { success: true, message: "Account erased. Goodbye." } });
});
