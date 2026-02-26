import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildContentHTML, requireGlobal, requireEl } from './dom';
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
    it('should handle lack of linkText for link', () => {
        const noLinkText: PopoverData = {
            label: 'No Link Text',
            text: 'Text',
            link: 'https://example.com'
        };
        const html = buildContentHTML(noLinkText, 'popover');
        expect(html).not.toContain('href');
    });
});

describe('requireGlobal', () => {
    it('should return the value if present on window', () => {
        (window as any).__MOCK_GLOBAL__ = { test: 123 };
        const result = requireGlobal<{ test: number }>('__MOCK_GLOBAL__');
        expect(result.test).toBe(123);
        delete (window as any).__MOCK_GLOBAL__;
    });

    it('should throw if value is missing', () => {
        expect(() => requireGlobal('__NON_EXISTENT__')).toThrow('window.__NON_EXISTENT__ is not set');
    });
});

describe('requireEl', () => {
    it('should throw if element is missing', () => {
        expect(() => requireEl('ghost-id')).toThrow('Required element #ghost-id not found');
    });
});
