// ── Shared constants ──────────────────────────────────────────────────────────
// Single source of truth for all magic values used across client-side scripts.
// Breakpoints here must stay in sync with CSS media queries in global.css.

// ── Breakpoints (must match global.css) ──
export const BREAKPOINT_WIDE = 1460;   // px — wide desktop, marginalia visible
export const BREAKPOINT_NEAR = 1024;   // px — near-wide, show widen hint
export const BREAKPOINT_MOBILE = 600;   // px — mobile, bottom-sheet popover

// ── Popover layout ──
export const POPOVER_WIDTH = 380;           // px — desktop popover width (must match --popover-width in global.css)
export const POPOVER_MARGIN_MIN = 16;       // px — min distance from viewport edge
export const POPOVER_OFFSET_Y = 10;        // px — vertical gap below hotspot
export const POPOVER_MAX_HEIGHT_VH = 0.80; // fraction — must match `max-height: 80vh` in .popover CSS rule
export const DRAG_MIN_VISIBLE = 48;        // px — minimum panel area that must stay on-screen

// ── Annotation layout ──
export const ANNOTATION_MIN_GAP = 80;      // px — minimum vertical gap between annotations
export const ANNOTATION_ROOT_MARGIN = '-15% 0px -40% 0px'; // IntersectionObserver rootMargin
export const ANNOTATION_TEXT_SENTENCES = 3; // max sentences shown in annotation cards (truncation threshold)

// ── Media ──
export const VIDEO_EXTENSIONS = ['.mp4', '.webm'] as const; // recognised video file extensions

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

// ── Ribbon Animation (Sticker Peel) ──
// These constants define the SVG textPath tracking math in annotation-engine.ts
export const RIBBON_PROGRESS_START = 1024; // px
export const RIBBON_PROGRESS_END = 1460;   // px
export const RIBBON_LEFT_START_OFFSET = 211;
export const RIBBON_LEFT_DELTA = 141;
export const RIBBON_RIGHT_START_OFFSET = 255;
export const RIBBON_RIGHT_DELTA = 156;
