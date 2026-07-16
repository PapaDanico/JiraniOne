import { Router } from "express";
import { readImage } from "../lib/blobStorage.js";

// Filenames are content-addressed (random hex from imageUpload.ts), so we
// can long-cache and mark immutable. nosniff prevents browser MIME-type
// guessing — defence in depth on top of magic-byte validation at upload.
// Serves from Netlify Blobs in production, local disk in dev (see
// blobStorage.ts) — either way this is a dynamic route, not express.static,
// since Netlify's CDN can't serve blobs written at runtime by a function.
export const uploadsRouter = Router();

uploadsRouter.get("/:key", async (req, res) => {
  const image = await readImage(req.params.key!);
  if (!image) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.setHeader("Content-Type", image.contentType);
  res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  res.send(image.buffer);
});
