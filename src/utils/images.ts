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
                    inferSize: true,
                    format: "webp",
                    quality: "mid",
                });
                popovers[key] = {
                    ...item,
                    img: optimized.src
                };
            } catch (e) {
                console.warn(`⚠️ Failed to optimize image for popover "${key}": ${item.img}`, e);
            }
        }
    }

    return popovers;
}
