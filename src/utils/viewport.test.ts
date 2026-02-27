import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isWideScreen, isNearWideScreen, isMobileScreen } from './viewport';
import { BREAKPOINT_WIDE, BREAKPOINT_MOBILE } from '../scripts/constants';

describe('Viewport Utilities', () => {
    beforeEach(() => {
        vi.stubGlobal('window', { innerWidth: 1024 });
    });

    it('isWideScreen returns true when width >= BREAKPOINT_WIDE', () => {
        window.innerWidth = BREAKPOINT_WIDE;
        expect(isWideScreen()).toBe(true);
        window.innerWidth = BREAKPOINT_WIDE + 100;
        expect(isWideScreen()).toBe(true);
    });

    it('isWideScreen returns false when width < BREAKPOINT_WIDE', () => {
        window.innerWidth = BREAKPOINT_WIDE - 1;
        expect(isWideScreen()).toBe(false);
    });

    it('isNearWideScreen returns true when BREAKPOINT_MOBILE <= width < BREAKPOINT_WIDE', () => {
        window.innerWidth = BREAKPOINT_MOBILE;
        expect(isNearWideScreen()).toBe(true);
        window.innerWidth = 1024;
        expect(isNearWideScreen()).toBe(true);
        window.innerWidth = BREAKPOINT_WIDE - 1;
        expect(isNearWideScreen()).toBe(true);
    });

    it('isNearWideScreen returns false when width < BREAKPOINT_MOBILE', () => {
        window.innerWidth = BREAKPOINT_MOBILE - 1;
        expect(isNearWideScreen()).toBe(false);
    });

    it('isNearWideScreen returns false when width >= BREAKPOINT_WIDE', () => {
        window.innerWidth = BREAKPOINT_WIDE;
        expect(isNearWideScreen()).toBe(false);
    });

    it('isMobileScreen returns true when width <= BREAKPOINT_MOBILE', () => {
        window.innerWidth = BREAKPOINT_MOBILE;
        expect(isMobileScreen()).toBe(true);
        window.innerWidth = BREAKPOINT_MOBILE - 50;
        expect(isMobileScreen()).toBe(true);
    });

    it('isMobileScreen returns false when width > BREAKPOINT_MOBILE', () => {
        window.innerWidth = BREAKPOINT_MOBILE + 1;
        expect(isMobileScreen()).toBe(false);
    });
});
