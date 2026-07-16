import { promises as fs } from "fs";
import path from "path";

// Netlify Functions have no durable/shared filesystem, so uploaded ticket
// photos can't live in a local `uploads/` dir once deployed there — use
// Netlify Blobs instead. Local dev (`npm run dev`) keeps writing to disk
// exactly as before, so day-to-day development needs no extra setup.
//
// `NETLIFY=true` is only reliably set in Netlify's *build* environment, not
// necessarily inside the deployed Function's runtime — `@netlify/blobs`
// itself auto-configures off `NETLIFY_BLOBS_CONTEXT` (injected by the
// Functions runtime whenever Blobs is available), so check that directly
// instead of guessing at a proxy signal.
const useBlobs = Boolean(process.env.NETLIFY_BLOBS_CONTEXT);

const uploadsDir = path.join(process.cwd(), "uploads");

export async function saveImage(
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
  await fs.writeFile(path.join(uploadsDir, key), buffer);
}

export async function readImage(
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
    const buffer = await fs.readFile(path.join(uploadsDir, key));
    return { buffer, contentType: "image/webp" };
  } catch {
    return null;
  }
}
