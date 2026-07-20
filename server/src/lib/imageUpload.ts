// Hardened image upload pipeline.
//
// multer holds uploads in memory (Express.Multer.File.buffer) — its filter
// only checks the *extension*, which is trivially spoofable. Anyone could
// upload `evil.png` containing arbitrary bytes (script payloads, malware,
// EXIF with PII, etc.) and it would be stored and served back as-is.
//
// processUploadedImages tightens the loop:
//   1. Sniff the actual MIME from magic bytes (file-type) — reject if
//      the bytes don't match an allowlist.
//   2. Re-encode through sharp — produces a clean WebP, strips EXIF (GPS,
//      camera serial), drops anything embedded that wasn't pixel data.
//   3. Resize to a sensible max so a 12 MB iPhone JPEG doesn't burn mobile
//      data on every admin viewing the ticket.
//   4. Store under a content-addressed key (Netlify Blobs in production,
//      local disk in dev — see blobStorage.ts).
//
// Returns the public /uploads/... paths for the new files, in the same
// order as the input files. Errors on any single file abort the whole
// batch — partial uploads would corrupt photoUrls arrays.

import { randomBytes } from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { saveFile } from "./blobStorage.js";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIMENSION = 1280;

export async function processUploadedImages(
  files: Express.Multer.File[] | undefined,
): Promise<string[]> {
  if (!files || files.length === 0) return [];

  const results: string[] = [];

  for (const file of files) {
    const buffer = file.buffer;

    // 1. Magic-byte MIME check.
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_MIME.has(detected.mime)) {
      throw new Error(
        `Unsupported image type: ${detected?.mime ?? "unknown"} on ${file.originalname}`,
      );
    }

    // 2 + 3. Re-encode + resize via sharp. WebP gives the best quality/size
    // for our use case (mobile data scarcity is a CLAUDE.md concern).
    //
    // sharp is loaded lazily, on first actual use, rather than imported at
    // module top-level. This module is pulled in transitively by
    // createApp.ts (via routes/maintenance.ts) for every API request, not
    // just photo uploads — a top-level `import sharp from "sharp"` means
    // sharp's native binary is loaded (and can fail to load) at Netlify
    // Function cold start, before any route runs, taking down every
    // endpoint including login. Loading it here confines any native-binding
    // failure to the one code path that actually needs it, caught by the
    // try/catch below like any other processing error. Mirrors the same
    // lazy-import treatment blobStorage.ts already gives `@netlify/blobs`.
    let processed: Buffer;
    try {
      const sharp = (await import("sharp")).default;
      processed = await sharp(buffer, { failOn: "error" })
        .rotate() // honour EXIF orientation before stripping
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
    } catch (err) {
      throw new Error(
        `Failed to process ${file.originalname}: ${err instanceof Error ? err.message : "encode error"}`,
      );
    }

    // 4. Store under a content-addressed key.
    const safeName = `${randomBytes(12).toString("hex")}.webp`;
    await saveFile(processed, safeName, "image/webp");
    results.push(`/uploads/${safeName}`);
  }

  return results;
}
