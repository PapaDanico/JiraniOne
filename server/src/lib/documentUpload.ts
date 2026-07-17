// Estate document upload (rules, AGM minutes, notices) — mirrors
// imageUpload.ts's hardening (magic-byte MIME sniffing against multer's
// spoofable extension-only filter) but skips the sharp re-encode step: a
// PDF can't be re-encoded as an image, and we don't want to touch document
// content anyway (unlike photos, there's no EXIF/GPS stripping concern).

import { randomBytes } from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { saveFile } from "./blobStorage.js";

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function processUploadedDocument(
  file: Express.Multer.File | undefined,
): Promise<{ key: string; contentType: string } | null> {
  if (!file) return null;

  const detected = await fileTypeFromBuffer(file.buffer);
  const ext = detected ? ALLOWED_MIME[detected.mime] : undefined;
  if (!detected || !ext) {
    throw new Error(
      `Unsupported file type: ${detected?.mime ?? "unknown"}. Only PDF, JPEG, and PNG are allowed.`,
    );
  }

  const key = `${randomBytes(12).toString("hex")}.${ext}`;
  await saveFile(file.buffer, key, detected.mime);
  return { key, contentType: detected.mime };
}
