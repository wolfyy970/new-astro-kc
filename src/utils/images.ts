import type { getImage } from "astro:assets";
import type { PopoverData } from "../types/content";
import {
  VIDEO_EXTENSIONS,
  POPOVER_IMAGE_WIDTH,
  POPOVER_IMAGE_HEIGHT,
} from "../scripts/constants";

// Shared optimisation options applied to every popover image/media item.
// Centralised here so changes to format, quality, or dimensions only need one edit.
// `fit: "inside"` — a bounding box, not a crop.
//
// This was `fit: "cover"`, which made 600x400 a mandate rather than a limit:
// every figure was hard-cropped to 3:2 at build time, whatever it actually
// was. A 1100x2070 portrait screenshot lost two thirds of itself before the
// stylesheet ever saw it, and no amount of `object-fit: contain` downstream
// could bring it back — the pixels were already gone. "inside" scales each
// image to fit within the box and keeps its proportions.
const IMAGE_OPTIMIZE_OPTIONS = {
  width: POPOVER_IMAGE_WIDTH,
  height: POPOVER_IMAGE_HEIGHT,
  fit: "inside",
  format: "webp",
  quality: "mid",
} as const;

// Mirror Astro's real getImage signature rather than re-declaring a looser one,
// so the optimisation options are checked against the actual image service.
type GetImageFn = (
  options: Parameters<typeof getImage>[0],
) => ReturnType<typeof getImage>;

/**
 * Pre-optimizes all images in the popover inventory.
 *
 * @param popoversRaw The raw popover data object from JSON.
 * @param getImageFn  The Astro getImage function.
 * @returns A promise that resolves to a record of optimized popover data.
 */
export async function optimizePopoverImages(
  popoversRaw: Record<string, PopoverData>,
  getImageFn: GetImageFn,
): Promise<Record<string, PopoverData>> {
  const popovers: Record<string, PopoverData> = { ...popoversRaw };

  const isVideo = (src: string) =>
    VIDEO_EXTENSIONS.some((ext) => src.toLowerCase().endsWith(ext));

  for (const [key, item] of Object.entries(popovers)) {
    if (item.img) {
      if (isVideo(item.img)) {
        // skip Astro image optimization for video formats
      } else {
        try {
          const optimized = await getImageFn({
            src: item.img,
            ...IMAGE_OPTIMIZE_OPTIONS,
          });
          popovers[key] = { ...popovers[key], img: optimized.src };
        } catch {
          console.warn(
            `⚠️ Failed to optimize image for popover "${key}": ${item.img}`,
          );
        }
      }
    }

    if (item.media && item.media.length > 0) {
      const optimizedMedia: string[] = [];
      for (const m of item.media) {
        if (isVideo(m)) {
          optimizedMedia.push(m);
        } else {
          try {
            const optimized = await getImageFn({
              src: m,
              ...IMAGE_OPTIMIZE_OPTIONS,
            });
            optimizedMedia.push(optimized.src);
          } catch {
            console.warn(
              `⚠️ Failed to optimize media item "${m}" for popover "${key}"`,
            );
            optimizedMedia.push(m);
          }
        }
      }
      popovers[key] = { ...popovers[key], media: optimizedMedia };
    }
  }

  return popovers;
}
