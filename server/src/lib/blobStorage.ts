import { promises as fs } from "fs";
import path from "path";

// Netlify Functions have no durable/shared filesystem, so uploaded ticket
// photos and estate documents can't live in a local `uploads/` dir once
// deployed there — use Netlify Blobs instead. Local dev (`npm run dev`)
// keeps writing to disk exactly as before, so day-to-day development needs
// no extra setup.
//
// `NETLIFY=true` is only reliably set in Netlify's *build* environment, not
// necessarily inside the deployed Function's runtime — `@netlify/blobs`
// itself auto-configures off `NETLIFY_BLOBS_CONTEXT` (injected by the
// Functions runtime whenever Blobs is available), so check that directly
// instead of guessing at a proxy signal.
const useBlobs = Boolean(process.env.NETLIFY_BLOBS_CONTEXT);

const uploadsDir = path.join(process.cwd(), "uploads");

// Disk storage has no metadata sidecar the way Blobs does, so contentType
// is persisted in a small `.meta` companion file next to the payload.
function metaPath(filePath: string): string {
  return `${filePath}.meta`;
}

export async function saveFile(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<void> {
  if (useBlobs) {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("uploads");
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    await store.set(key, arrayBuffer, { metadata: { contentType } });
    return;
  }

  await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, key);
  await fs.writeFile(filePath, buffer);
  await fs.writeFile(metaPath(filePath), contentType, "utf-8");
}

export async function deleteFile(key: string): Promise<void> {
  if (useBlobs) {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("uploads");
    await store.delete(key);
    return;
  }

  const filePath = path.join(uploadsDir, key);
  await fs.unlink(filePath).catch(() => {});
  await fs.unlink(metaPath(filePath)).catch(() => {});
}

export async function readFile(
  key: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (useBlobs) {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore("uploads");
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result) return null;
    const contentType =
      (result.metadata?.contentType as string | undefined) ?? "application/octet-stream";
    return { buffer: Buffer.from(result.data), contentType };
  }

  try {
    const filePath = path.join(uploadsDir, key);
    const buffer = await fs.readFile(filePath);
    const contentType = await fs
      .readFile(metaPath(filePath), "utf-8")
      .catch(() => "application/octet-stream");
    return { buffer, contentType };
  } catch {
    return null;
  }
}
