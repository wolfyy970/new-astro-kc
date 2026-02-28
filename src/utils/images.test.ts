import { describe, it, expect, vi } from 'vitest';
import { optimizePopoverImages } from './images';
import type { PopoverData } from '../types/content';

describe('optimizePopoverImages', () => {
    it('should pre-optimize images in the popover dictionary', async () => {
        const raw: Record<string, PopoverData> = {
            item1: { label: 'Item 1', text: 'Text 1', img: '/img1.jpg' },
            item2: { label: 'Item 2', text: 'Text 2' } // No image
        };

        const mockGetImage = vi.fn().mockImplementation(async ({ src }) => {
            return { src: `/optimized${src}` };
        });

        const optimized = await optimizePopoverImages(raw, mockGetImage);

        expect(mockGetImage).toHaveBeenCalledTimes(1);
        expect(mockGetImage).toHaveBeenCalledWith(expect.objectContaining({ src: '/img1.jpg' }));
        expect(optimized.item1.img).toBe('/optimized/img1.jpg');
        expect(optimized.item2.img).toBeUndefined();
    });

    it('should skip optimization for uppercase video extensions (.MP4, .WEBM) in img and media', async () => {
        const raw: Record<string, PopoverData> = {
            item1: { label: 'Video', text: 'Text', img: '/clip.MP4' },
            item2: { label: 'Media', text: 'Text', media: ['/promo.WEBM', '/thumb.jpg'] },
        };
        const mockGetImage = vi.fn().mockImplementation(async ({ src }) => ({ src: `/optimized${src}` }));

        const optimized = await optimizePopoverImages(raw, mockGetImage);

        // .MP4 in img should be left as-is (not passed to getImage)
        expect(optimized.item1.img).toBe('/clip.MP4');
        // .WEBM in media should be left as-is, .jpg should be optimized
        expect(optimized.item2.media).toContain('/promo.WEBM');
        expect(mockGetImage).toHaveBeenCalledWith(expect.objectContaining({ src: '/thumb.jpg' }));
    });

    it('should handle optimization failures gracefully', async () => {
        const raw: Record<string, PopoverData> = {
            item1: { label: 'Item 1', text: 'Text 1', img: '/fail.jpg' }
        };

        const mockGetImage = vi.fn().mockRejectedValue(new Error('Optimization failed'));
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        const optimized = await optimizePopoverImages(raw, mockGetImage);

        expect(optimized.item1.img).toBe('/fail.jpg'); // Remains unchanged
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to optimize image for popover "item1"'));

        consoleSpy.mockRestore();
    });
});
