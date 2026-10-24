// ── Display vs. full-resolution case-study images ─────────────────────────────
// Case-study artwork ships as 4K+ WebP so the lightbox can show every pixel of
// the design, but the inline page only ever paints it ~1300 CSS px wide.
// Serving the same file for both made the Truist page download ~8 MB of 4K
// art before anyone asked to see it larger.
//
// `npm run images:display` writes a `<name>.display.webp` next to each heavy
// source (max 2000 px wide). Inline <img> tags use that variant; the trigger's
// `data-full-src` keeps pointing at the full-resolution original, which only
// the lightbox and its magnifier ever download.

import { existsSync } from "node:fs";
import path from "node:path";
import { publicImageSize } from "./image-size";

export const DISPLAY_MAX_WIDTH = 2000;
export const DISPLAY_SUFFIX = ".display.webp";

interface ImageSize {
  width: number;
  height: number;
}

export interface DisplayImage {
  /** Site path the inline <img> should load. */
  src: string;
  /** Intrinsic size of `src`; null when the file could not be read. */
  size: ImageSize | null;
}

export function isDisplayVariant(src: string): boolean {
  return src.toLowerCase().endsWith(DISPLAY_SUFFIX);
}

/** `/images/a/b.webp` → `/images/a/b.display.webp`; null for non-WebP or variants. */
export function displayVariantPath(src: string): string | null {
  if (isDisplayVariant(src) || !/\.webp$/i.test(src)) return null;
  return src.replace(/\.webp$/i, DISPLAY_SUFFIX);
}

/**
 * Picks the file an inline image should load: the display variant when one has
 * been generated, otherwise the original. The variant shares the original's
 * aspect ratio (enforced by `npm run verify`), so layout math that only uses
 * the ratio is unaffected.
 */
export async function resolveDisplayImage(src: string): Promise<DisplayImage> {
  const variant = displayVariantPath(src);
  if (variant) {
    const file = path.join(process.cwd(), "public", variant.replace(/^\//, ""));
    if (existsSync(file)) {
      const size = await publicImageSize(variant);
      if (size) return { src: variant, size };
    }
  }
  return { src, size: await publicImageSize(src) };
}
