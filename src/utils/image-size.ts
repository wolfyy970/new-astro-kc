// ── Intrinsic size of a public/ image ─────────────────────────────────────────
// Case-study artwork lives in public/, so Astro never processes it: <Image>
// simply stamps whatever width/height it was handed onto the tag. Those numbers
// were hardcoded per component (800x600, 800x500, 800x1200 …) while the real
// files run from 0.47 to 2.36 in aspect ratio, so every tag declared a ratio
// its picture did not have. With `height: auto` in CSS the browser corrects
// itself once the file loads — but only after reserving the wrong box first,
// which is a layout shift on every image.
//
// Reading the real dimensions at build time makes the reservation truthful.
// sharp ships with Astro's image service, so this adds no dependency.

import sharp from "sharp";
import { existsSync } from "node:fs";
import path from "node:path";

interface ImageSize {
  width: number;
  height: number;
}

// Build-time memo: a photo grid can reference the same file several times, and
// each miss is a file read plus a header parse.
const cache = new Map<string, ImageSize | null>();

/**
 * Reads the intrinsic pixel dimensions of an image under `public/`.
 *
 * @param src Absolute site path, e.g. `/images/sparks-grove/gala_5.jpg`.
 * @returns The real dimensions, or `null` when the file is missing or
 *          unreadable — callers fall back to their own defaults rather than
 *          failing the build, matching the warn-and-degrade policy used by
 *          images.ts and color.ts.
 */
export async function publicImageSize(src: string): Promise<ImageSize | null> {
  const cached = cache.get(src);
  if (cached !== undefined) return cached;

  const file = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  if (!existsSync(file)) {
    console.warn(`[image-size] No such file: ${file}`);
    cache.set(src, null);
    return null;
  }

  try {
    const { width, height } = await sharp(file).metadata();
    const size = width && height ? { width, height } : null;
    cache.set(src, size);
    return size;
  } catch (err) {
    console.warn(`[image-size] Could not read ${file}:`, err);
    cache.set(src, null);
    return null;
  }
}
