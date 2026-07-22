import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import { db } from "../db.js";
import { documents } from "@shared/schema.js";
import { createDocumentSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { processUploadedDocument } from "../lib/documentUpload.js";
import { readFile, deleteFile } from "../lib/blobStorage.js";
import { logger } from "../lib/logger.js";
import { writeAudit } from "../lib/audit.js";
import { MAX_DOCUMENT_BYTES } from "@shared/constants.js";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// List estate documents — every role can view (residents need to read
// estate rules / AGM minutes, not just admins).
documentsRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.estateId, user.estateId))
    .orderBy(desc(documents.createdAt));
  res.json({ data: rows });
});

// Admin: upload a document
documentsRouter.post("/", requireRole("admin"), upload.single("file"), async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const parsed = createDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  let stored: { key: string; contentType: string } | null;
  try {
    stored = await processUploadedDocument(req.file);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "File processing failed" });
    return;
  }
  if (!stored) {
    res.status(400).json({ error: "A file is required" });
    return;
  }

  const [doc] = await db
    .insert(documents)
    .values({
      id: newId(),
      estateId: user.estateId,
      uploadedById: user.id,
      title: parsed.data.title.trim(),
      fileUrl: stored.key,
      fileType: stored.contentType,
    })
    .returning();

  void writeAudit(req, {
    action: "document.uploaded",
    targetType: "document",
    targetId: doc!.id,
    metadata: { title: doc!.title },
  });

  res.status(201).json({ data: doc });
});

// Download/view a document — estate-scoped (not a bare /uploads/:key
// fetch, since documents can carry sensitive estate business unlike
// content-addressed ticket photos).
documentsRouter.get("/:id/file", async (req, res) => {
  const user = res.locals.user!;
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, req.params.id!))
    .limit(1);

  if (!doc || doc.estateId !== user.estateId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const file = await readFile(doc.fileUrl);
  if (!file) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.setHeader("Content-Type", file.contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  // filename= must be ASCII-only or Node throws "Invalid character in
  // header content" and the download 500s (real case: a Word-pasted
  // en-dash or emoji in the title). ASCII fallback + RFC 5987 filename*
  // carries the true title for modern browsers.
  const asciiName = doc.title.replace(/["\r\n]/g, "").replace(/[^\x20-\x7E]/g, "_") || "document";
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.title)}`,
  );
  res.send(file.buffer);
});

// Admin: delete a document
documentsRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, req.params.id!), eq(documents.estateId, user.estateId!)))
    .limit(1);

  if (!doc) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(documents).where(eq(documents.id, doc.id));

  // Remove the payload too — without this every deleted document orphans
  // its blob forever (unbounded storage growth, and "deleted" PII that
  // was never actually destroyed). Best-effort: the DB row is already
  // gone, so a failed blob delete just leaves an unreachable orphan.
  try {
    await deleteFile(doc.fileUrl);
  } catch (err) {
    logger.warn({ err, documentId: doc.id }, "document blob delete failed (orphaned)");
  }

  void writeAudit(req, {
    action: "document.deleted",
    targetType: "document",
    targetId: doc.id,
    metadata: { title: doc.title },
  });

  res.json({ data: { success: true } });
});
