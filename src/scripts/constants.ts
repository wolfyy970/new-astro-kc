// ── Shared constants ──────────────────────────────────────────────────────────
// Single source of truth for all magic values used across client-side scripts.
// Breakpoints here must stay in sync with CSS media queries in global.css.

// ── Breakpoints (must match global.css) ──
export const BREAKPOINT_WIDE = 1400;   // px — wide desktop, marginalia visible
export const BREAKPOINT_NEAR = 1024;   // px — near-wide, show widen hint
export const BREAKPOINT_MOBILE = 600;   // px — mobile, bottom-sheet popover

// ── Accent color (must match --accent: #70541C in global.css) ──
export const ACCENT_R = 112;
export const ACCENT_G = 84;
export const ACCENT_B = 28;

// ── Highlight opacity levels ──
export const TINT_ALPHA = 0.14;   // resting highlight
export const HOVER_ALPHA = 0.34;   // hovered / active — must be visibly distinct from TINT
export const ACTIVE_SHADOW_ALPHA = 0.12;   // drop-shadow alpha for active state

// ── Highlight gradient stops ──
export const FADE_SOLID_STOP = 70;  // % — solid color runs until this stop
export const FADE_BLEND_STOP = 30;  // % — gradient begins to blend from this stop

// ── Fragment geometry adjustments (px) ──
export const FRAG_PAD_H = 4;  // extra horizontal padding (left/right)
export const FRAG_PAD_V = 2;  // extra vertical padding (top/bottom)

// ── Popover layout ──
export const POPOVER_WIDTH = 380;   // px — desktop popover width
export const POPOVER_MARGIN_MIN = 16;   // px — min distance from viewport edge
export const POPOVER_OFFSET_Y = 10;   // px — vertical gap below hotspot
export const POPOVER_EST_HEIGHT_WITH_IMG = 360; // px — estimated height with image
export const POPOVER_EST_HEIGHT_WITHOUT_IMG = 220; // px — estimated height without image

// ── Annotation layout ──
export const ANNOTATION_MIN_GAP = 48;    // px — minimum vertical gap between annotations
export const ANNOTATION_ROOT_MARGIN = '-15% 0px -40% 0px'; // IntersectionObserver rootMargin
export const ANNOTATION_TEXT_SENTENCES = 2;     // number of sentences shown in annotation cards

// ── Timing ──
export const RESIZE_DEBOUNCE_MS = 250;   // ms — debounce for resize handler
export const NUDGE_DURATION_MS = 600;   // ms — widen-hint nudge animation duration
export const REVEAL_THRESHOLD = 0.05;  // IntersectionObserver threshold for .reveal elements

// ── DOM element IDs ──
export const ID_OVERLAY = 'popover-overlay';
export const ID_POPOVER = 'popover';
export const ID_WIDEN_HINT = 'widen-hint';

// ── CSS selectors ──
export const SEL_HOTSPOT = '.hotspot';
export const SEL_FRAGMENT = '.hs-fragment';
export const SEL_REVEAL = '.reveal';
export const SEL_DOC_PAGE = '.doc-page';

// ── CSS classes ──
export const CLS_HOVERED = 'hovered';
export const CLS_ACTIVE = 'active';
export const CLS_VISIBLE = 'visible';
export const CLS_OPEN = 'open';
export const CLS_REVEALED = 'revealed';
export const CLS_SCROLL_REVEALED = 'scroll-revealed';
export const CLS_POPOVER_OPEN = 'popover-open';
export const CLS_NUDGE = 'nudge';
export const CLS_ANNOTATION_SUPPRESSED = 'annotation-suppressed'; // popover open for this key
export const CLS_IS_DRAGGING = 'is-dragging';
