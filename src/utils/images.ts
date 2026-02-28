import type { PopoverData } from '../types/content';

/**
 * Pre-optimizes all images in the popover inventory.
 * 
 * @param popoversRaw The raw popover digital object from JSON.
 * @param getImageFn The Astro getImage function.
 * @returns A promise that resolves to a record of optimized popover data.
 */
export async function optimizePopoverImages(
    popoversRaw: Record<string, PopoverData>,
    getImageFn: (options: any) => Promise<{ src: string }>
): Promise<Record<string, PopoverData>> {
    const popovers: Record<string, PopoverData> = { ...popoversRaw };

    const entries = Object.entries(popovers);

    for (const [key, item] of entries) {
        if (item.img) {
            try {
                const optimized = await getImageFn({
                    src: item.img,
                    width: 600,
                    height: 400,
                    fit: "cover",
                    format: "webp",
                    quality: "mid",
                });
                popovers[key] = {
                    ...popovers[key],
                    img: optimized.src
                };
            } catch (e) {
                console.warn(`⚠️ Failed to optimize image for popover "${key}": ${item.img}`);
            }
        }

        if (item.media && item.media.length > 0) {
            const optimizedMedia: string[] = [];
            for (const m of item.media) {
                if (m.endsWith('.mp4') || m.endsWith('.webm')) {
                    optimizedMedia.push(m);
                } else {
                    try {
                        const optimized = await getImageFn({
                            src: m,
                            width: 600,
                            height: 400,
                            fit: "cover",
                            format: "webp",
                            quality: "mid",
                        });
                        optimizedMedia.push(optimized.src);
                    } catch (e) {
                        console.warn(`⚠️ Failed to optimize media item "${m}" for popover "${key}"`);
                        optimizedMedia.push(m);
                    }
                }
            }
            popovers[key] = {
                ...popovers[key],
                media: optimizedMedia
            };
        }
    }

    return popovers;
}
