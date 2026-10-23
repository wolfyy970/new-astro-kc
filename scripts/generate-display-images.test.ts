import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  checkDisplayImages,
  generateDisplayImages,
} from "./generate-display-images.ts";

let publicDir = "";

async function writeWebp(
  rel: string,
  width: number,
  height: number,
  options: { noisy?: boolean } = {},
): Promise<string> {
  const file = path.join(publicDir, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  const raw = Buffer.alloc(width * height * 3);
  // Noise keeps a "heavy" fixture heavy; flat colour keeps a light one light.
  for (let i = 0; i < raw.length; i++) {
    raw[i] = options.noisy ? Math.floor(Math.random() * 256) : 200;
  }
  await sharp(raw, { raw: { width, height, channels: 3 } })
    .webp({ quality: 92 })
    .toFile(file);
  return file;
}

beforeEach(() => {
  publicDir = mkdtempSync(path.join(tmpdir(), "display-images-"));
});

afterEach(() => {
  rmSync(publicDir, { recursive: true, force: true });
});

describe("generateDisplayImages", () => {
  it("writes a 2000px-wide variant that keeps the aspect ratio, and is idempotent", async () => {
    await writeWebp("images/demo/wide.webp", 3000, 1500);

    const first = await generateDisplayImages(publicDir);
    expect(first.generated.map((entry) => entry.file)).toEqual([
      path.join("images", "demo", "wide.display.webp"),
    ]);
    const meta = await sharp(
      path.join(publicDir, "images/demo/wide.display.webp"),
    ).metadata();
    expect(meta.width).toBe(2000);
    expect(meta.height).toBe(1000);

    const second = await generateDisplayImages(publicDir);
    expect(second.generated).toEqual([]);
    expect(second.skipped).toHaveLength(1);
  });

  it("leaves small, light images alone", async () => {
    await writeWebp("images/demo/small.webp", 800, 400);
    const report = await generateDisplayImages(publicDir);
    expect(report.generated).toEqual([]);
    expect(
      existsSync(path.join(publicDir, "images/demo/small.display.webp")),
    ).toBe(false);
  });

  it("does not re-process display variants and regenerates a stale one", async () => {
    const source = await writeWebp("images/demo/wide.webp", 3000, 1500);
    await generateDisplayImages(publicDir);
    // The source is replaced with a different aspect ratio (newer mtime).
    await writeWebp("images/demo/wide.webp", 3000, 2400);
    const future = new Date(Date.now() + 60_000);
    utimesSync(source, future, future);

    const report = await generateDisplayImages(publicDir);
    expect(report.generated).toHaveLength(1);
    const meta = await sharp(
      path.join(publicDir, "images/demo/wide.display.webp"),
    ).metadata();
    expect([meta.width, meta.height]).toEqual([2000, 1600]);
    expect(
      existsSync(path.join(publicDir, "images/demo/wide.display.display.webp")),
    ).toBe(false);
  });
});

describe("checkDisplayImages", () => {
  it("passes for freshly generated variants", async () => {
    await writeWebp("images/demo/wide.webp", 3000, 1500);
    await generateDisplayImages(publicDir);
    expect(await checkDisplayImages(publicDir)).toEqual([]);
  });

  it("flags a variant whose aspect ratio differs from its source", async () => {
    await writeWebp("images/demo/wide.webp", 3000, 1500);
    await writeWebp("images/demo/wide.display.webp", 2000, 1400);
    const errors = await checkDisplayImages(publicDir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/aspect ratio differs/);
  });

  it("flags a variant wider than its source and an orphaned variant", async () => {
    await writeWebp("images/demo/narrow.webp", 1000, 500);
    await writeWebp("images/demo/narrow.display.webp", 2000, 1000);
    writeFileSync(path.join(publicDir, "images/demo/ghost.display.webp"), "");
    const errors = await checkDisplayImages(publicDir);
    expect(errors.some((e) => /wider than its source/.test(e))).toBe(true);
    expect(errors.some((e) => /no source image/.test(e))).toBe(true);
  });
});
