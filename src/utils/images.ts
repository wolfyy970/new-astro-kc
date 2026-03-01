import type { PopoverData } from '../types/content';
import { VIDEO_EXTENSIONS } from '../scripts/constants';

// Shared optimisation options applied to every popover image/media item.
// Centralised here so changes to format, quality, or dimensions only need one edit.
const IMAGE_OPTIMIZE_OPTIONS = {
    width: 600,
    height: 400,
    fit: 'cover',
    format: 'webp',
    quality: 'mid',
} as const;

type GetImageFn = (options: {
    src: string;
    width?: number;
    height?: number;
    fit?: string;
    format?: string;
    quality?: string;
}) => Promise<{ src: string }>;

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

    const isVideo = (src: string) => VIDEO_EXTENSIONS.some(ext => src.toLowerCase().endsWith(ext));

    for (const [key, item] of Object.entries(popovers)) {
        if (item.img) {
            if (isVideo(item.img)) {
                // skip Astro image optimization for video formats
            } else {
                try {
                    const optimized = await getImageFn({ src: item.img, ...IMAGE_OPTIMIZE_OPTIONS });
                    popovers[key] = { ...popovers[key], img: optimized.src };
                } catch {
                    console.warn(`⚠️ Failed to optimize image for popover "${key}": ${item.img}`);
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
                        const optimized = await getImageFn({ src: m, ...IMAGE_OPTIMIZE_OPTIONS });
                        optimizedMedia.push(optimized.src);
                    } catch {
                        console.warn(`⚠️ Failed to optimize media item "${m}" for popover "${key}"`);
                        optimizedMedia.push(m);
                    }
                }
            }
            popovers[key] = { ...popovers[key], media: optimizedMedia };
        }
    }

    return popovers;
}
