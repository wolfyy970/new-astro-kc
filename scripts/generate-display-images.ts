/**
 * Display-variant generator for heavy case-study images.
 *
 *   npm run images:display
 *
 * For every `public/images/**\/*.webp` that is wider than 2000 px or heavier
 * than 300 KB, writes `<name>.display.webp` beside it (max 2000 px wide,
 * quality 82, alpha preserved). Inline page images load the variant; only the
 * lightbox/magnifier downloads the full-resolution original. Idempotent: an
 * up-to-date variant is left alone, a variant that no longer pays for itself
 * is removed.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  DISPLAY_MAX_WIDTH,
  DISPLAY_SUFFIX,
  isDisplayVariant,
} from "../src/utils/display-image.ts";

// Files are replaced in place between runs (and in tests); never trust libvips'
// file cache for them.
sharp.cache(false);

const HEAVY_BYTES = 300 * 1024;
const DISPLAY_QUALITY = 82;
// A same-width variant is only worth shipping when it is clearly lighter.
const MIN_SAVING_RATIO = 0.85;

export interface DisplayImageReport {
  generated: { file: string; from: number; to: number }[];
  skipped: string[];
  removed: string[];
}

function webpFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return webpFiles(full);
    return entry.name.toLowerCase().endsWith(".webp") ? [full] : [];
  });
}

const variantFile = (source: string): string =>
  source.replace(/\.webp$/i, DISPLAY_SUFFIX);

export async function generateDisplayImages(
  publicDir: string,
): Promise<DisplayImageReport> {
  const report: DisplayImageReport = {
    generated: [],
    skipped: [],
    removed: [],
  };
  const imagesDir = path.join(publicDir, "images");

  for (const source of webpFiles(imagesDir)) {
    if (isDisplayVariant(source)) continue;
    const target = variantFile(source);
    const rel = path.relative(publicDir, source);
    const stat = fs.statSync(source);
    const meta = await sharp(source).metadata();
    const width = meta.width ?? 0;
    const heavy = width > DISPLAY_MAX_WIDTH || stat.size > HEAVY_BYTES;

    if (!heavy) {
      if (fs.existsSync(target)) {
        fs.rmSync(target);
        report.removed.push(rel);
      }
      continue;
    }

    if (fs.existsSync(target) && fs.statSync(target).mtimeMs >= stat.mtimeMs) {
      const existing = await sharp(target).metadata();
      const expectedHeight =
        ((existing.width ?? 0) * (meta.height ?? 0)) / (width || 1);
      if (Math.abs((existing.height ?? 0) - expectedHeight) <= 1) {
        report.skipped.push(rel);
        continue;
      }
    }

    const buffer = await sharp(source)
      .resize({ width: DISPLAY_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: DISPLAY_QUALITY, effort: 6 })
      .toBuffer();

    if (
      width <= DISPLAY_MAX_WIDTH &&
      buffer.length > stat.size * MIN_SAVING_RATIO
    ) {
      if (fs.existsSync(target)) {
        fs.rmSync(target);
        report.removed.push(rel);
      }
      continue;
    }

    fs.writeFileSync(target, buffer);
    report.generated.push({
      file: path.relative(publicDir, target),
      from: stat.size,
      to: buffer.length,
    });
  }

  return report;
}

/**
 * Integrity checks for committed display variants: each needs a source, must
 * not be larger than it, and must share its aspect ratio (a stale variant
 * would otherwise show a different crop than the lightbox).
 */
export async function checkDisplayImages(publicDir: string): Promise<string[]> {
  const errors: string[] = [];
  for (const file of webpFiles(path.join(publicDir, "images"))) {
    if (!isDisplayVariant(file)) continue;
    const rel = path.relative(publicDir, file);
    const source = file.slice(0, -DISPLAY_SUFFIX.length) + ".webp";
    if (!fs.existsSync(source)) {
      errors.push(`Display variant has no source image: "${rel}"`);
      continue;
    }
    const [variant, original] = await Promise.all([
      sharp(file).metadata(),
      sharp(source).metadata(),
    ]);
    const vw = variant.width ?? 0;
    const vh = variant.height ?? 0;
    const ow = original.width ?? 0;
    const oh = original.height ?? 0;
    if (!vw || !vh || !ow || !oh) {
      errors.push(`Unreadable display variant or source: "${rel}"`);
      continue;
    }
    if (vw > ow) {
      errors.push(
        `Display variant is wider than its source (${vw}px > ${ow}px): "${rel}"`,
      );
    }
    if (Math.abs(vh - (vw * oh) / ow) > 1) {
      errors.push(
        `Display variant aspect ratio differs from its source (${vw}x${vh} vs ${ow}x${oh}); re-run "npm run images:display": "${rel}"`,
      );
    }
  }
  return errors;
}

const kb = (bytes: number): string => `${Math.round(bytes / 1024)} KB`;

async function main(): Promise<void> {
  const publicDir = path.join(process.cwd(), "public");
  const report = await generateDisplayImages(publicDir);
  report.generated.forEach(({ file, from, to }) =>
    console.log(`✓ ${file}  ${kb(from)} → ${kb(to)}`),
  );
  report.removed.forEach((file) =>
    console.log(`– removed variant for ${file} (no longer worth shipping)`),
  );
  console.log(
    `${report.generated.length} generated, ${report.skipped.length} up to date.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
