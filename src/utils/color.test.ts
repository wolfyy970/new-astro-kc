import { describe, it, expect } from 'vitest';
import { resolveHexColor, hexToRgbString, buildAccentStyle } from './color';

describe('resolveHexColor', () => {
    it('returns a valid 6-digit hex unchanged', () => {
        expect(resolveHexColor('#3b1a5a')).toBe('#3b1a5a');
        expect(resolveHexColor('#F26522')).toBe('#F26522');
        expect(resolveHexColor('#00c2e0')).toBe('#00c2e0');
    });

    it('returns the fallback when value is undefined', () => {
        expect(resolveHexColor(undefined)).toBe('#70541C');
    });

    it('returns the fallback when value is null', () => {
        expect(resolveHexColor(null)).toBe('#70541C');
    });

    it('returns the fallback for a shorthand hex (#rgb)', () => {
        expect(resolveHexColor('#3b1')).toBe('#70541C');
    });

    it('returns the fallback for a hex missing the leading #', () => {
        expect(resolveHexColor('3b1a5a')).toBe('#70541C');
    });

    it('returns the fallback for an empty string', () => {
        expect(resolveHexColor('')).toBe('#70541C');
    });

    it('returns the fallback for a non-hex color name', () => {
        expect(resolveHexColor('purple')).toBe('#70541C');
    });

    it('respects a custom fallback argument', () => {
        expect(resolveHexColor(undefined, '#000000')).toBe('#000000');
        expect(resolveHexColor('bad', '#ffffff')).toBe('#ffffff');
    });
});

describe('hexToRgbString', () => {
    it('converts black correctly', () => {
        expect(hexToRgbString('#000000')).toBe('0, 0, 0');
    });

    it('converts white correctly', () => {
        expect(hexToRgbString('#ffffff')).toBe('255, 255, 255');
    });

    it('converts Truist purple correctly', () => {
        expect(hexToRgbString('#3b1a5a')).toBe('59, 26, 90');
    });

    it('converts Upwave orange correctly', () => {
        expect(hexToRgbString('#f26522')).toBe('242, 101, 34');
    });

    it('is case-insensitive', () => {
        expect(hexToRgbString('#F26522')).toBe('242, 101, 34');
        expect(hexToRgbString('#f26522')).toBe('242, 101, 34');
    });
});

describe('buildAccentStyle', () => {
    it('builds all three CSS custom properties from a valid hex', () => {
        const style = buildAccentStyle('#3b1a5a');
        expect(style).toContain('--accent: #3b1a5a');
        expect(style).toContain('--accent-rgb: 59, 26, 90');
        expect(style).toContain('--accent-border: rgba(59, 26, 90, 0.2)');
    });

    it('falls back to the portfolio default when given undefined', () => {
        const style = buildAccentStyle(undefined);
        expect(style).toContain('--accent: #70541C');
        expect(style).toContain('--accent-rgb: 112, 84, 28');
    });

    it('falls back to the portfolio default for an invalid color', () => {
        const style = buildAccentStyle('#bad');
        expect(style).toContain('--accent: #70541C');
    });

    it('produces a string suitable for use as an HTML style attribute', () => {
        const style = buildAccentStyle('#c8102e');
        // Should be a semicolon-separated list, no trailing issues
        expect(style.split(';').filter(Boolean).length).toBe(3);
    });
});
