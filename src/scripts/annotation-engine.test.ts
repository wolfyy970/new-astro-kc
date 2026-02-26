import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initAnnotationEngine, cleanupAnnotations } from './annotation-engine';
import { ID_WIDEN_HINT, SEL_DOC_PAGE, BREAKPOINT_WIDE } from './constants';
import type { PopoverMap } from '../types/content';

describe('Annotation Engine (DOM auto-mapping)', () => {
    let mockPopovers: PopoverMap;

    beforeEach(() => {
        // Set up wide screen to trigger annotation building
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: BREAKPOINT_WIDE });

        document.body.innerHTML = `
            <div id="${ID_WIDEN_HINT}"></div>
            <div class="${SEL_DOC_PAGE.replace('.', '')}">
                <span class="hotspot" data-popover="item1">Item 1</span>
                <span class="hotspot" data-popover="item2">Item 2</span>
                <span class="hotspot" data-popover="item3">Item 3</span>
            </div>
        `;

        mockPopovers = {
            item1: { label: 'Item 1', text: 'Text 1' },
            item2: { label: 'Item 2', text: 'Text 2' },
            item3: { label: 'Item 3', text: 'Text 3' }
        };

        // Mock bounding rects for pass 1 logic and overlap resolution
        window.HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100, bottom: 200, height: 100, left: 0, right: 0, width: 0 });

        // Mock IntersectionObserver
        class MockIntersectionObserver {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        }
        (window as any).IntersectionObserver = MockIntersectionObserver;
    });

    afterEach(() => {
        cleanupAnnotations();
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('manages side assignment alternating right -> left -> right based on DOM order', () => {
        initAnnotationEngine(mockPopovers);

        // Wait for dom updates if any, our init runs immediately for wide screens
        const annotations = document.querySelectorAll('.scroll-annotation');
        expect(annotations.length).toBe(3);

        // Check assigned sides
        // Item 1: nextSide starts 'right', so it should be assigned right.
        expect(annotations[0].classList.contains('side-right')).toBe(true);
        expect((annotations[0] as HTMLElement).dataset.annotationKey).toBe('item1');

        // Item 2: left
        expect(annotations[1].classList.contains('side-left')).toBe(true);
        expect((annotations[1] as HTMLElement).dataset.annotationKey).toBe('item2');

        // Item 3: right again
        expect(annotations[2].classList.contains('side-right')).toBe(true);
        expect((annotations[2] as HTMLElement).dataset.annotationKey).toBe('item3');
    });

    it('logs a warning and skips missing popover data', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        // Remove item2 from popover data but it exists in DOM
        delete mockPopovers.item2;

        initAnnotationEngine(mockPopovers);

        const annotations = document.querySelectorAll('.scroll-annotation');
        expect(annotations.length).toBe(2);

        // First is right, third becomes left (because second was skipped)
        expect(annotations[0].classList.contains('side-right')).toBe(true);
        expect((annotations[0] as HTMLElement).dataset.annotationKey).toBe('item1');

        expect(annotations[1].classList.contains('side-left')).toBe(true);
        expect((annotations[1] as HTMLElement).dataset.annotationKey).toBe('item3');

        expect(consoleSpy).toHaveBeenCalledWith('[AnnotationEngine] Missing data for popover key "item2". Cannot build annotation.');
        consoleSpy.mockRestore();
    });
});
