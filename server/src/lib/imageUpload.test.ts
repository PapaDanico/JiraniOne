import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from "os";
import sharp from "sharp";
import { processUploadedImages } from "./imageUpload.js";

// processUploadedImages reads/writes under process.cwd()/uploads.
// We point cwd at a temp dir for the duration of each test so we don't
// pollute the real uploads/ tree.
let workDir: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();
  workDir = await fs.mkdtemp(path.join(tmpdir(), "imgtest-"));
  process.chdir(workDir);
  await fs.mkdir(path.join(workDir, "uploads-src"), { recursive: true });
});

afterEach(async () => {
  process.chdir(originalCwd);
  await fs.rm(workDir, { recursive: true, force: true });
});

interface FakeFile {
  path: string;
  originalname: string;
}

async function writeFixture(name: string, buffer: Buffer): Promise<FakeFile> {
  const fpath = path.join(workDir, "uploads-src", name);
  await fs.writeFile(fpath, buffer);
  return { path: fpath, originalname: name };
}

async function makeJpeg(): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .jpeg()
    .toBuffer();
}

async function makeBigJpeg(): Promise<Buffer> {
  return sharp({
    create: {
      width: 4000,
      height: 3000,
      channels: 3,
      background: { r: 50, g: 50, b: 50 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

describe("processUploadedImages", () => {
  it("returns an empty list and creates no files when given no input", async () => {
    expect(await processUploadedImages(undefined)).toEqual([]);
    expect(await processUploadedImages([])).toEqual([]);
  });

  it("converts a JPEG to a WebP under /uploads and removes the original", async () => {
    const file = await writeFixture("photo.jpg", await makeJpeg());
    const out = await processUploadedImages([file as never]);

    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/^\/uploads\/[a-f0-9]{24}\.webp$/);

    // Original temp file gone.
    await expect(fs.access(file.path)).rejects.toThrow();

    // Destination file exists and is a real WebP (magic bytes 'RIFF....WEBP').
    const written = await fs.readFile(
      path.join(workDir, "uploads", out[0]!.replace("/uploads/", "")),
    );
    expect(written.subarray(0, 4).toString()).toBe("RIFF");
    expect(written.subarray(8, 12).toString()).toBe("WEBP");
  });

  it("rejects an extension-spoofed file (bytes don't match an image MIME)", async () => {
    const file = await writeFixture(
      "evil.jpg",
      Buffer.from("totally not an image; <script>alert(1)</script>"),
    );

    await expect(
      processUploadedImages([file as never]),
    ).rejects.toThrow(/Unsupported image type/);

    // Suspect bytes have been removed from disk.
    await expect(fs.access(file.path)).rejects.toThrow();
  });

  it("rejects an unsupported but real image type (gif)", async () => {
    // Minimal GIF89a header — file-type sniffs this as image/gif which is
    // not in the allowlist.
    const gif = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
    ]);
    const file = await writeFixture("anim.gif", gif);
    await expect(
      processUploadedImages([file as never]),
    ).rejects.toThrow(/Unsupported image type/);
    await expect(fs.access(file.path)).rejects.toThrow();
  });

  it("strips EXIF metadata when re-encoding", async () => {
    // Build a JPEG that *has* EXIF, then process it and verify EXIF is gone.
    const jpegWithExif = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 1, g: 2, b: 3 },
      },
    })
      .withMetadata({
        exif: {
          IFD0: { Copyright: "test", Make: "TestCam" },
        },
      })
      .jpeg()
      .toBuffer();

    const file = await writeFixture("with-exif.jpg", jpegWithExif);
    const out = await processUploadedImages([file as never]);

    const written = await fs.readFile(
      path.join(workDir, "uploads", out[0]!.replace("/uploads/", "")),
    );
    const meta = await sharp(written).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it("downsizes huge images to MAX_DIMENSION on the long edge", async () => {
    const file = await writeFixture("big.jpg", await makeBigJpeg());
    const out = await processUploadedImages([file as never]);
    const written = await fs.readFile(
      path.join(workDir, "uploads", out[0]!.replace("/uploads/", "")),
    );
    const meta = await sharp(written).metadata();
    expect(meta.width).toBeLessThanOrEqual(1280);
    expect(meta.height).toBeLessThanOrEqual(1280);
    // It actually shrank from 4000 wide.
    expect(meta.width).toBeLessThan(4000);
  });

  it("processes multiple files in order and gives each a unique filename", async () => {
    const f1 = await writeFixture("a.jpg", await makeJpeg());
    const f2 = await writeFixture("b.jpg", await makeJpeg());
    const out = await processUploadedImages([f1, f2] as never);
    expect(out).toHaveLength(2);
    expect(out[0]).not.toEqual(out[1]);
  });

  it("aborts the whole batch if any single file is bad (no partial result)", async () => {
    const good = await writeFixture("good.jpg", await makeJpeg());
    const bad = await writeFixture(
      "bad.jpg",
      Buffer.from("definitely not a jpeg"),
    );

    await expect(
      processUploadedImages([good, bad] as never),
    ).rejects.toThrow(/Unsupported image type/);
  });
});
