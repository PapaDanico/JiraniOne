import { Router } from "express";
import { eq, desc, and, isNull, count, lt } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { db } from "../db.js";
import { maintenanceTickets, ticketComments, users } from "@shared/schema.js";
import {
  createTicketSchema,
  updateTicketSchema,
  addCommentSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { broadcastToEstate } from "../ws.js";
import { processUploadedImages } from "../lib/imageUpload.js";

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// Resident: my tickets
maintenanceRouter.get("/my", async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select()
    .from(maintenanceTickets)
    .where(
      and(
        eq(maintenanceTickets.residentId, user.id),
        isNull(maintenanceTickets.deletedAt),
      ),
    )
    .orderBy(desc(maintenanceTickets.createdAt));
  res.json({ data: rows });
});

// Admin: all estate tickets with optional filters
maintenanceRouter.get(
  "/estate",
  requireRole("admin"),
  async (req, res) => {
    const user = res.locals.user!;
    const { status, priority, category } = req.query as Record<string, string>;

    const rows = await db.query.maintenanceTickets.findMany({
      where: and(
        eq(maintenanceTickets.estateId, user.estateId!),
        isNull(maintenanceTickets.deletedAt),
        status ? eq(maintenanceTickets.status, status as never) : undefined,
        priority ? eq(maintenanceTickets.priority, priority as never) : undefined,
        category ? eq(maintenanceTickets.category, category as never) : undefined,
      ),
      with: {
        resident: { columns: { name: true, unitNumber: true } },
        assignedTo: { columns: { name: true } },
        comments: {
          with: { author: { columns: { name: true, role: true } } },
          orderBy: [desc(ticketComments.createdAt)],
        },
      },
      orderBy: [desc(maintenanceTickets.createdAt)],
    });

    res.json({ data: rows });
  },
);

// Admin: dashboard stats
maintenanceRouter.get("/stats", requireRole("admin"), async (_req, res) => {
  const user = res.locals.user!;
  const estateId = user.estateId!;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [openCount] = await db
    .select({ count: count() })
    .from(maintenanceTickets)
    .where(
      and(
        eq(maintenanceTickets.estateId, estateId),
        eq(maintenanceTickets.status, "open"),
      ),
    );

  const [overdueCount] = await db
    .select({ count: count() })
    .from(maintenanceTickets)
    .where(
      and(
        eq(maintenanceTickets.estateId, estateId),
        eq(maintenanceTickets.status, "open"),
        lt(maintenanceTickets.createdAt, sevenDaysAgo),
      ),
    );

  const [inProgressCount] = await db
    .select({ count: count() })
    .from(maintenanceTickets)
    .where(
      and(
        eq(maintenanceTickets.estateId, estateId),
        eq(maintenanceTickets.status, "in_progress"),
      ),
    );

  res.json({
    data: {
      open: openCount?.count ?? 0,
      overdue: overdueCount?.count ?? 0,
      inProgress: inProgressCount?.count ?? 0,
    },
  });
});

// Resident / Admin: get single ticket
maintenanceRouter.get("/:id", async (req, res) => {
  const user = res.locals.user!;
  const ticket = await db.query.maintenanceTickets.findFirst({
    where: eq(maintenanceTickets.id, req.params['id']!),
    with: {
      resident: { columns: { name: true, unitNumber: true } },
      assignedTo: { columns: { name: true } },
      comments: {
        with: { author: { columns: { name: true, role: true } } },
        orderBy: [desc(ticketComments.createdAt)],
      },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const isOwner = ticket.residentId === user.id;
  const isAdmin = user.role === "admin" && ticket.estateId === user.estateId;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json({ data: ticket });
});

// Resident: submit ticket (with optional photos)
maintenanceRouter.post(
  "/",
  upload.array("photos", 5),
  async (req, res) => {
    const user = res.locals.user!;
    if (!user.estateId) {
      res.status(400).json({ error: "No estate assigned" });
      return;
    }

    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }

    let photoUrls: string[] = [];
    try {
      photoUrls = await processUploadedImages(req.files as Express.Multer.File[]);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Photo processing failed",
      });
      return;
    }

    const [ticket] = await db
      .insert(maintenanceTickets)
      .values({
        id: newId(),
        residentId: user.id,
        estateId: user.estateId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        photoUrls,
        status: "open",
      })
      .returning();

    broadcastToEstate(user.estateId, {
      type: "ticket:created",
      payload: ticket,
      estateId: user.estateId,
    });

    res.status(201).json({ data: ticket });
  },
);

// Admin: update ticket status / assign / notes
maintenanceRouter.patch(
  "/:id",
  requireRole("admin"),
  async (req, res) => {
    const user = res.locals.user!;
    const parsed = updateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }

    const [existing] = await db
      .select()
      .from(maintenanceTickets)
      .where(
        and(
          eq(maintenanceTickets.id, req.params['id']!),
          eq(maintenanceTickets.estateId, user.estateId!),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const updates: Partial<typeof existing> = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    if (parsed.data.status === "resolved" && existing.status !== "resolved") {
      updates.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(maintenanceTickets)
      .set(updates)
      .where(eq(maintenanceTickets.id, req.params['id']!))
      .returning();

    broadcastToEstate(user.estateId!, {
      type: "ticket:updated",
      payload: updated,
      estateId: user.estateId!,
    });

    res.json({ data: updated });
  },
);

// Resident or Admin: add comment
maintenanceRouter.post("/:id/comments", async (req, res) => {
  const user = res.locals.user!;
  const parsed = addCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [ticket] = await db
    .select()
    .from(maintenanceTickets)
    .where(eq(maintenanceTickets.id, req.params['id']!))
    .limit(1);

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const isOwner = ticket.residentId === user.id;
  const isAdmin = user.role === "admin" && ticket.estateId === user.estateId;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [comment] = await db
    .insert(ticketComments)
    .values({
      id: newId(),
      ticketId: req.params['id']!,
      authorId: user.id,
      body: parsed.data.body,
    })
    .returning();

  res.status(201).json({ data: comment });
});
