import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildContentNode, requireGlobal, requireEl } from './dom';
import type { PopoverData } from '../types/content';

describe('buildContentNode', () => {
    const mockData: PopoverData = {
        label: 'Test Label',
        text: 'This is sentence one. This is sentence two. This is sentence three.',
        img: 'test.jpg',
        stat: '99%',
        quote: 'A test quote.',
        link: 'https://example.com',
        linkText: 'Learn More'
    };

    function fragmentToHTML(frag: DocumentFragment): string {
        const div = document.createElement('div');
        div.appendChild(frag);
        return div.innerHTML;
    }

    it('should build full HTML/DOM for popover (wrapBody: true)', () => {
        const frag = buildContentNode(mockData, 'popover', { wrapBody: true });
        const html = fragmentToHTML(frag);
        expect(html).toContain('class="popover-body"');
        expect(html).toContain('class="popover-img"');
        expect(html).toContain('src="test.jpg"');
        expect(html).toContain('class="popover-label"');
        expect(html).toContain('Test Label');
        expect(html).toContain('99%');
        expect(html).toContain('A test quote.');
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('Learn More');
        expect(html).toContain('This is sentence three.'); // Full text
    });

    it('should build truncated HTML/DOM for annotation (truncateText: true, prependRule: true)', () => {
        const frag = buildContentNode(mockData, 'sa', { truncateText: true, prependRule: true });
        const html = fragmentToHTML(frag);
        expect(html).toContain('class="sa-rule"');
        expect(html).toContain('This is sentence two.');
        expect(html).not.toContain('This is sentence three.'); // Truncated
    });

    it('should handle missing optional fields', () => {
        const minimalData: PopoverData = {
            label: 'Minimal',
            text: 'Only text.'
        };
        const frag = buildContentNode(minimalData, 'popover');
        const html = fragmentToHTML(frag);
        expect(html).not.toContain('img');
        expect(html).not.toContain('stat');
        expect(html).not.toContain('quote');
        expect(html).not.toContain('link');
        expect(html).toContain('Minimal');
        expect(html).toContain('Only text.');
    });
    it('should handle lack of linkText for link', () => {
        const noLinkText: PopoverData = {
            label: 'No Link Text',
            text: 'Text',
            link: 'https://example.com'
        };
        const frag = buildContentNode(noLinkText, 'popover');
        const html = fragmentToHTML(frag);
        expect(html).not.toContain('href');
    });

    it('should correctly format truncated text with existing periods', () => {
        const punctuationData: PopoverData = {
            label: 'Text Fix',
            text: 'Short sentence one. Short sentence two'
        };
        // Should NOT append a period since it wasn't truncated down from 3+
        const frag = buildContentNode(punctuationData, 'popover', { truncateText: true });
        const html = fragmentToHTML(frag);
        expect(html).toContain('Short sentence one. Short sentence two');
        expect(html).not.toContain('Short sentence two.');
    });

    it('should render a video element properly with correct fallback and autoplay disable structure', () => {
        const videoData: PopoverData = {
            label: 'A Video',
            text: 'Video summary',
            media: ['/vid1.mp4']
        };
        const frag = buildContentNode(videoData, 'popover');
        const html = fragmentToHTML(frag);

        // Assert single video wraps in play button since play is disabled for single/first items
        expect(html).toContain('class="popover-vid-wrap"');
        expect(html).toContain('class="popover-play-btn"');
        expect(html).toContain('vid1.mp4');
    });

    it('should gracefully build the full carousel structure when multiple items are present', () => {
        const multiData: PopoverData = {
            label: 'Carousel',
            text: 'Carousel desc',
            media: ['/img1.js', '/vid1.mp4'] // Testing mixed format
        };
        const frag = buildContentNode(multiData, 'popover');
        const html = fragmentToHTML(frag);

        // Assert carousel wrapper presence
        expect(html).toContain('class="popover-carousel-wrap"');
        expect(html).toContain('class="popover-carousel-inner"');

        // Assert chevrons
        expect(html).toContain('class="popover-carousel-nav prev"');
        expect(html).toContain('class="popover-carousel-nav next"');

        // Assert dots
        expect(html).toContain('class="popover-carousel-dots"');
        expect(html).toContain('class="popover-carousel-dot active"');
    });

    it('should set type="button" on all dynamically created buttons (nav, dots, play)', () => {
        const multiData: PopoverData = {
            label: 'Carousel',
            text: 'Carousel desc',
            media: ['/img1.jpg', '/vid1.mp4']
        };
        const container = document.createElement('div');
        container.appendChild(buildContentNode(multiData, 'popover'));
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
        buttons.forEach(btn => {
            expect(btn.type).toBe('button');
        });
    });
});

describe('requireGlobal', () => {
    it('should return the value if present on window', () => {
        (window as any).__MOCK_GLOBAL__ = { test: 123 };
        const result = (requireGlobal as any)('__MOCK_GLOBAL__');
        expect(result.test).toBe(123);
        delete (window as any).__MOCK_GLOBAL__;
    });

    it('should throw if value is missing', () => {
        expect(() => (requireGlobal as any)('__NON_EXISTENT__')).toThrow('window.__NON_EXISTENT__ is not set');
    });
});

describe('requireEl', () => {
    it('should throw if element is missing', () => {
        expect(() => requireEl('ghost-id')).toThrow('Required element #ghost-id not found');
    });
});
