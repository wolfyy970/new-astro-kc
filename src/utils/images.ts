import type { getImage } from "astro:assets";
import type {
  OptimizedPopoverImage,
  PopoverData,
  PopoverMap,
  PopoverMedia,
} from "../types/content";
import {
  POPOVER_IMAGE_HEIGHT,
  POPOVER_IMAGE_WIDTH,
  VIDEO_EXTENSIONS,
} from "../scripts/constants";

const IMAGE_OPTIMIZE_OPTIONS = {
  width: POPOVER_IMAGE_WIDTH,
  height: POPOVER_IMAGE_HEIGHT,
  fit: "inside",
  format: "webp",
  quality: "mid",
} as const;

type GetImageFn = (
  options: Parameters<typeof getImage>[0],
) => ReturnType<typeof getImage>;

function isVideo(src: string): boolean {
  return VIDEO_EXTENSIONS.some((extension) =>
    src.toLowerCase().endsWith(extension),
  );
}

function imageMetadata(
  optimized: Awaited<ReturnType<GetImageFn>>,
): OptimizedPopoverImage | null {
  const width = Number(optimized.attributes.width);
  const height = Number(optimized.attributes.height);
  if (!Number.isFinite(width) || width <= 0) return null;
  if (!Number.isFinite(height) || height <= 0) return null;
  return { src: optimized.src, width, height };
}

async function optimizeMedia(
  media: PopoverMedia,
  key: string,
  getImageFn: GetImageFn,
): Promise<PopoverMedia> {
  if (typeof media !== "string" || isVideo(media)) return media;

  try {
    const optimized = await getImageFn({
      src: media,
      ...IMAGE_OPTIMIZE_OPTIONS,
    });
    return imageMetadata(optimized) ?? optimized.src;
  } catch {
    console.warn(
      `⚠️ Failed to optimize media item "${media}" for popover "${key}"`,
    );
    return media;
  }
}

async function optimizePopover(
  key: string,
  item: PopoverData,
  getImageFn: GetImageFn,
): Promise<PopoverData> {
  const [img, media] = await Promise.all([
    item.img ? optimizeMedia(item.img, key, getImageFn) : undefined,
    item.media
      ? Promise.all(
          item.media.map((source) => optimizeMedia(source, key, getImageFn)),
        )
      : undefined,
  ]);

  return {
    ...item,
    ...(img ? { img } : {}),
    ...(media ? { media } : {}),
  };
}

/**
 * Pre-optimizes authored popover images and retains the actual output
 * dimensions so client-side notes reserve the correct aspect ratio.
 */
export async function optimizePopoverImages(
  popoversRaw: PopoverMap,
  getImageFn: GetImageFn,
): Promise<PopoverMap> {
  const entries = await Promise.all(
    Object.entries(popoversRaw).map(async ([key, item]) => {
      return [key, await optimizePopover(key, item, getImageFn)] as const;
    }),
  );
  return Object.fromEntries(entries);
}
