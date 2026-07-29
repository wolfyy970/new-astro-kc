import { BREAKPOINT_WIDE, BREAKPOINT_MOBILE } from "../scripts/constants";

/**
 * Shared viewport state helpers to ensure consistent behavior across engines.
 */

export function isWideScreen(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= BREAKPOINT_WIDE;
}

export function isMobileScreen(): boolean {
  return (
    typeof window !== "undefined" && window.innerWidth <= BREAKPOINT_MOBILE
  );
}

/**
 * Whether the reader has asked for reduced motion. Engines consult this before
 * driving JS-timed animation (the margin re-flow loop, smooth scroll assists);
 * CSS transitions are switched off separately in the reduced-motion block.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
