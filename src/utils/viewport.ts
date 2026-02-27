import { BREAKPOINT_WIDE, BREAKPOINT_MOBILE } from '../scripts/constants';

/**
 * Shared viewport state helpers to ensure consistent behavior across engines.
 */

export function isWideScreen(): boolean {
    return typeof window !== 'undefined' && window.innerWidth >= BREAKPOINT_WIDE;
}

export function isNearWideScreen(): boolean {
    if (typeof window === 'undefined') return false;
    const w = window.innerWidth;
    return w >= BREAKPOINT_MOBILE && w < BREAKPOINT_WIDE;
}

export function isMobileScreen(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= BREAKPOINT_MOBILE;
}
