import { describe, it, expect } from 'vitest';
import { buildContentHTML } from './dom';
import type { PopoverData } from '../types/content';

describe('buildContentHTML', () => {
    const mockData: PopoverData = {
        label: 'Test Label',
        text: 'This is sentence one. This is sentence two. This is sentence three.',
        img: 'test.jpg',
        stat: '99%',
        quote: 'A test quote.',
        link: 'https://example.com',
        linkText: 'Learn More'
    };

    it('should build full HTML for popover (wrapBody: true)', () => {
        const html = buildContentHTML(mockData, 'popover', { wrapBody: true });
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

    it('should build truncated HTML for annotation (truncateText: true, prependRule: true)', () => {
        const html = buildContentHTML(mockData, 'sa', { truncateText: true, prependRule: true });
        expect(html).toContain('class="sa-rule"');
        expect(html).toContain('This is sentence two.');
        expect(html).not.toContain('This is sentence three.'); // Truncated
    });

    it('should handle missing optional fields', () => {
        const minimalData: PopoverData = {
            label: 'Minimal',
            text: 'Only text.'
        };
        const html = buildContentHTML(minimalData, 'popover');
        expect(html).not.toContain('img');
        expect(html).not.toContain('stat');
        expect(html).not.toContain('quote');
        expect(html).not.toContain('link');
        expect(html).toContain('Minimal');
        expect(html).toContain('Only text.');
    });
});
