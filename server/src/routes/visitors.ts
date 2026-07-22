import { Router } from "express";
import { eq, desc, and, isNull, ilike } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../db.js";
import { visitors } from "@shared/schema.js";
import { createVisitorSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { sendThrottledSms } from "../lib/sms.js";
import { safeCsvCell, csvRow } from "../lib/csv.js";
import { SMS_SENDER_ID } from "@shared/brand.js";

export const visitorsRouter = Router();
visitorsRouter.use(requireAuth);

// Resident: list my visitors
visitorsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select()
    .from(visitors)
    .where(and(eq(visitors.residentId, user.id), isNull(visitors.deletedAt)))
    .orderBy(desc(visitors.createdAt));
  res.json({ data: rows });
});

// Security / Admin: all estate visitors
visitorsRouter.get(
  "/estate",
  requireRole("admin", "security"),
  async (_req, res) => {
    const user = res.locals.user!;
    if (!user.estateId) {
      res.status(400).json({ error: "No estate assigned" });
      return;
    }
    const rows = await db
      .select()
      .from(visitors)
      .where(eq(visitors.estateId, user.estateId))
      .orderBy(desc(visitors.createdAt));
    res.json({ data: rows });
  },
);

// Gate log: checked-in + checked-out, newest first
visitorsRouter.get(
  "/gate-log",
  requireRole("admin", "security"),
  async (req, res) => {
    const user = res.locals.user!;
    if (!user.estateId) {
      res.status(400).json({ error: "No estate assigned" });
      return;
    }
    const search = req.query.q as string | undefined;
    const conditions = [eq(visitors.estateId, user.estateId)];
    const rows = await db
      .select()
      .from(visitors)
      .where(and(...conditions))
      .orderBy(desc(visitors.checkedInAt));

    const filtered = search
      ? rows.filter(
          (v) =>
            v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.phone.includes(search),
        )
      : rows;

    res.json({ data: filtered });
  },
);

// Resident: create visitor pass
visitorsRouter.post("/", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const parsed = createVisitorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const id = newId();
  const qrPayload = JSON.stringify({ visitorId: id, estateId: user.estateId });
  const qrCode = await QRCode.toDataURL(qrPayload);

  const [visitor] = await db
    .insert(visitors)
    .values({
      id,
      residentId: user.id,
      estateId: user.estateId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      purpose: parsed.data.purpose ?? null,
      expectedAt: parsed.data.expectedAt
        ? new Date(parsed.data.expectedAt)
        : null,
      qrCode,
      status: "pending",
    })
    .returning();

  // SMS visitor with pass ID. user.name is user-controlled — sanitize so
  // a malicious resident cannot turn the SMS into a smishing message
  // (e.g. setting their name to "URGENT: send M-PESA to 0712...").
  const safeHostName = user.name.replace(/[^\p{L}\p{N}\s'\-]/gu, "").slice(0, 40);
  const smsText = `${SMS_SENDER_ID}: You have a visitor pass to ${safeHostName}. Show this SMS at the gate. Pass ID: ${id.slice(0, 8).toUpperCase()}`;
  const sms = await sendThrottledSms({
    userId: user.id,
    to: parsed.data.phone,
    message: smsText,
  });

  if (sms.ok) {
    await db
      .update(visitors)
      .set({ smsSent: true })
      .where(eq(visitors.id, id));
  }

  res.status(201).json({ data: { ...visitor, smsSent: sms.ok, smsBlockedReason: sms.reason } });
});

// Security: lookup visitor by QR payload or phone
visitorsRouter.get("/lookup", requireRole("admin", "security"), async (req, res) => {
  const { qr, phone } = req.query as { qr?: string; phone?: string };
  const user = res.locals.user!;

  if (!qr && !phone) {
    res.status(400).json({ error: "Provide qr or phone query param" });
    return;
  }

  let visitorId: string | undefined;
  if (qr) {
    try {
      const parsed = JSON.parse(qr);
      visitorId = parsed.visitorId;
    } catch {
      res.status(400).json({ error: "Invalid QR payload" });
      return;
    }
  }

  const rows = await db
    .select()
    .from(visitors)
    .where(
      and(
        eq(visitors.estateId, user.estateId!),
        visitorId
          ? eq(visitors.id, visitorId)
          : ilike(visitors.phone, `%${phone}%`),
      ),
    )
    .limit(5);

  res.json({ data: rows });
});

// Security: check-in
visitorsRouter.post("/:id/check-in", requireRole("admin", "security"), async (req, res) => {
  const user = res.locals.user!;
  const [visitor] = await db
    .select()
    .from(visitors)
    .where(
      and(eq(visitors.id, req.params['id']!), eq(visitors.estateId, user.estateId!)),
    )
    .limit(1);

  if (!visitor) {
    res.status(404).json({ error: "Visitor not found" });
    return;
  }
  if (visitor.status === "checked_in") {
    res.status(409).json({ error: "Already checked in" });
    return;
  }
  if (visitor.status === "cancelled" || visitor.status === "expired") {
    res.status(409).json({ error: "Pass is no longer valid" });
    return;
  }

  const [updated] = await db
    .update(visitors)
    .set({
      status: "checked_in",
      checkedInAt: new Date(),
      checkedInById: user.id,
      // Clear the prior cycle's checkout — otherwise a re-checked-in
      // visitor (checked out earlier, now checking in again) shows a
      // checkedOutAt timestamp that predates this checkedInAt, which reads
      // as an already-checked-out visitor or a negative-duration gate-log
      // entry depending on what a view derives from the two fields.
      checkedOutAt: null,
      updatedAt: new Date(),
    })
    .where(eq(visitors.id, req.params['id']!))
    .returning();

  res.json({ data: updated });
});

// Security: check-out
visitorsRouter.post("/:id/check-out", requireRole("admin", "security"), async (req, res) => {
  const user = res.locals.user!;
  const [visitor] = await db
    .select()
    .from(visitors)
    .where(
      and(eq(visitors.id, req.params['id']!), eq(visitors.estateId, user.estateId!)),
    )
    .limit(1);

  if (!visitor) {
    res.status(404).json({ error: "Visitor not found" });
    return;
  }
  if (visitor.status !== "checked_in") {
    res.status(409).json({ error: "Visitor is not checked in" });
    return;
  }

  const [updated] = await db
    .update(visitors)
    .set({
      status: "checked_out",
      checkedOutAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(visitors.id, req.params['id']!))
    .returning();

  res.json({ data: updated });
});

// Resident: cancel visitor pass
visitorsRouter.post("/:id/cancel", async (req, res) => {
  const user = res.locals.user!;
  const [visitor] = await db
    .select()
    .from(visitors)
    .where(
      and(eq(visitors.id, req.params['id']!), eq(visitors.residentId, user.id)),
    )
    .limit(1);

  if (!visitor) {
    res.status(404).json({ error: "Visitor not found" });
    return;
  }
  if (visitor.status === "checked_in") {
    res.status(409).json({ error: "Cannot cancel — visitor is currently inside" });
    return;
  }

  const [updated] = await db
    .update(visitors)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(visitors.id, req.params['id']!))
    .returning();

  res.json({ data: updated });
});

// Admin: export CSV
visitorsRouter.get(
  "/export/csv",
  requireRole("admin"),
  async (_req, res) => {
    const user = res.locals.user!;
    const rows = await db
      .select()
      .from(visitors)
      .where(eq(visitors.estateId, user.estateId!))
      .orderBy(desc(visitors.createdAt));

    const header = "id,name,phone,purpose,status,expectedAt,checkedInAt,checkedOutAt,createdAt\n";
    const csv = rows
      .map((v) =>
        csvRow([
          v.id,
          v.name,
          v.phone,
          v.purpose,
          v.status,
          v.expectedAt,
          v.checkedInAt,
          v.checkedOutAt,
          v.createdAt,
        ]),
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="visitors.csv"',
    );
    res.send(header + csv);
  },
);
