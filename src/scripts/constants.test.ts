import { describe, it, expect } from 'vitest';
import * as constants from './constants';

describe('Constants', () => {
    it('should have valid accent color values', () => {
        expect(constants.ACCENT_R).toBeGreaterThanOrEqual(0);
        expect(constants.ACCENT_R).toBeLessThanOrEqual(255);
        expect(constants.ACCENT_G).toBeGreaterThanOrEqual(0);
        expect(constants.ACCENT_G).toBeLessThanOrEqual(255);
        expect(constants.ACCENT_B).toBeGreaterThanOrEqual(0);
        expect(constants.ACCENT_B).toBeLessThanOrEqual(255);
    });

    it('should have breakpoints in descending order', () => {
        expect(constants.BREAKPOINT_WIDE).toBeGreaterThan(constants.BREAKPOINT_NEAR);
        expect(constants.BREAKPOINT_NEAR).toBeGreaterThan(constants.BREAKPOINT_MOBILE);
    });

    it('should have reasonable timing values', () => {
        expect(constants.RESIZE_DEBOUNCE_MS).toBeGreaterThan(0);
        expect(constants.RESIZE_DEBOUNCE_MS).toBeLessThan(2000);
    });
});
