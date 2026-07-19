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
import { processUploadedImages } from "../lib/imageUpload.js";
import { writeAudit } from "../lib/audit.js";
import { createNotification } from "../lib/notify.js";
import { MAX_TICKET_PHOTOS, MAX_TICKET_PHOTO_BYTES } from "@shared/constants.js";

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TICKET_PHOTO_BYTES, files: MAX_TICKET_PHOTOS },
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

    const conditions = [
      eq(maintenanceTickets.estateId, user.estateId!),
      isNull(maintenanceTickets.deletedAt),
    ];
    if (status) conditions.push(eq(maintenanceTickets.status, status as never));
    if (priority) conditions.push(eq(maintenanceTickets.priority, priority as never));
    if (category) conditions.push(eq(maintenanceTickets.category, category as never));

    const rows = await db.query.maintenanceTickets.findMany({
      where: and(...conditions),
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
  upload.array("photos", MAX_TICKET_PHOTOS),
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

    // Offline-queue retry of a submission that already landed — the
    // original request's response never reached the client (timeout on
    // flaky 3G), but the ticket exists. Return it instead of creating a
    // duplicate; the unique index on (residentId, clientDraftId) is the
    // backstop if two retries race each other.
    if (parsed.data.clientDraftId) {
      const [existingTicket] = await db
        .select()
        .from(maintenanceTickets)
        .where(and(
          eq(maintenanceTickets.residentId, user.id),
          eq(maintenanceTickets.clientDraftId, parsed.data.clientDraftId),
        ))
        .limit(1);
      if (existingTicket) {
        res.status(200).json({ data: existingTicket });
        return;
      }
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
        clientDraftId: parsed.data.clientDraftId ?? null,
      })
      .returning();

    void writeAudit(req, {
      action: "ticket.created",
      targetType: "maintenance_ticket",
      targetId: ticket!.id,
      metadata: { category: ticket!.category, priority: ticket!.priority },
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

    if (parsed.data.assignedToId) {
      const [assignee] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.id, parsed.data.assignedToId),
            eq(users.estateId, user.estateId!),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);
      if (!assignee) {
        res.status(400).json({ error: "Assignee must belong to this estate" });
        return;
      }
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

    // Notify resident of status change
    if (parsed.data.status && parsed.data.status !== existing.status) {
      const statusLabels: Record<string, string> = {
        open: "Open",
        assigned: "Assigned",
        in_progress: "In Progress",
        resolved: "Resolved",
        closed: "Closed",
      };
      await createNotification({
        userId: existing.residentId,
        title: "Ticket Update",
        body: `Your "${existing.title}" ticket status changed to ${statusLabels[parsed.data.status]}.`,
        type: "ticket_status",
        linkTo: `/maintenance`,
      });
    }

    // Notify assignee if assigned
    if (parsed.data.assignedToId && parsed.data.assignedToId !== existing.assignedToId) {
      await createNotification({
        userId: parsed.data.assignedToId,
        title: "New Assignment",
        body: `You've been assigned to: ${existing.title}`,
        type: "ticket_assigned",
        linkTo: `/maintenance`,
      });
    }

    void writeAudit(req, {
      action: "ticket.updated",
      targetType: "maintenance_ticket",
      targetId: updated!.id,
      metadata: {
        previousStatus: existing.status,
        newStatus: updated!.status,
        assignedToId: updated!.assignedToId ?? undefined,
      },
    });

    res.json({ data: updated });
  },
);

// Resident or Admin: add comment
maintenanceRouter.post("/:id/comments", async (req, res) => {
  const user = res.locals.user!;
  const parsed = addCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
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

  // Notify ticket owner if comment from admin
  if (user.role === "admin" && ticket.residentId !== user.id) {
    await createNotification({
      userId: ticket.residentId,
      title: "New Update",
      body: `Admin added a comment on your ticket: "${ticket.title}"`,
      type: "ticket_comment",
      linkTo: `/maintenance`,
    });
  }

  res.status(201).json({ data: comment });
});
