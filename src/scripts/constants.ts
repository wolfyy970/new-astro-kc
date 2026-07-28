// ── Shared constants ──────────────────────────────────────────────────────────
// Single source of truth for all magic values used across client-side scripts.
// Breakpoints here must stay in sync with CSS media queries in global.css.

// ── Breakpoints (must match global.css) ──
//
// BREAKPOINT_WIDE is derived, not chosen. The margins can exist as soon as the
// viewport can hold the measure plus a column and a gutter on each side:
//
//   880 (--doc-max-width) + 2 × (42 --margin-col-gutter + 220 --margin-col-width)
//   = 1404
//
// Those three live in global.css only; nothing here reads them, so changing any
// of them means recomputing this number by hand.
// 1420 gives that 16px of breathing room, and still clears the 1440px logical
// width of a 13" MacBook Air — the original 1460 sat just above it, so the one
// feature the whole reading experience is built around was unreachable on a
// very common laptop no matter how the window was sized.
export const BREAKPOINT_WIDE = 1420; // px — wide desktop, marginalia visible
export const BREAKPOINT_MOBILE = 600; // px — mobile, bottom-sheet popover

// ── Popover layout ──
export const POPOVER_MAX_WIDTH = 560; // px — fallback for the fluid CSS width when the panel cannot be measured
export const POPOVER_MARGIN_MIN = 16; // px — min distance from viewport edge
export const POPOVER_OFFSET_Y = 10; // px — vertical gap below hotspot
export const POPOVER_MAX_HEIGHT_VH = 0.78; // fraction — must match `max-height: 78vh` in .popover CSS rule
export const DRAG_MIN_VISIBLE = 48; // px — minimum panel area that must stay on-screen
export const SWIPE_DISMISS_THRESHOLD = 80; // px — downward swipe distance to dismiss mobile sheet
export const SWIPE_DISMISS_VELOCITY = 0.4; // px/ms — flick velocity that also triggers dismiss
export const SWIPE_RESISTANCE = 0.65; // fraction — rubber-band drag follow ratio during swipe
export const SHEET_DISMISS_OFFSET = "100vh"; // off-screen translate applied when dismissing the sheet
export const SHEET_DISMISS_ANIM_MS = 300; // ms — dismiss slide-out before closePopover (match CSS transition)
export const SHEET_SNAPBACK_MS = 350; // ms — snap-back settle before clearing the drag offset

// ── Annotation layout ──
export const ANNOTATION_MIN_GAP = 80; // px — minimum vertical gap between annotations
export const ANNOTATION_ROOT_MARGIN = "-15% 0px -40% 0px"; // IntersectionObserver rootMargin
// The margin note is the glance, not the article. One sentence is what makes
// the annotation worth following: at three, the margin was reprinting almost the
// whole popover, so opening it bought the reader a single extra sentence in
// exchange for covering the page they were reading.
export const ANNOTATION_TEXT_SENTENCES = 1; // max sentences shown in a margin note
export const EXPANDED_VIEWPORT_MARGIN = 16; // px — min gap from the viewport edge for an expanded margin note
export const INTRO_TOP = "60px"; // resting top offset of the cold-start intro annotation
export const INTRO_REVEAL_MS = 300; // ms — delay before the intro annotation reveals
export const INTRO_DISMISS_MS = 700; // ms — delay before the intro annotation is removed from the DOM

// ── Media ──
// Every popover image is pre-optimised to exactly these dimensions by
// src/utils/images.ts, so the intrinsic aspect ratio is known and constant.
// The client sets them as width/height attributes on each image, which reserves
// layout before the resource resolves. Without them a note's figures contribute
// zero height until they decode, the panel grows after it has been positioned,
// and the viewport clamp has to chase it.
export const POPOVER_IMAGE_WIDTH = 600;
export const POPOVER_IMAGE_HEIGHT = 400;

export const VIDEO_EXTENSIONS = [".mp4", ".webm"] as const; // recognised video file extensions

// ── Timing ──
export const RESIZE_DEBOUNCE_MS = 250; // ms — debounce for resize handler
// IntersectionObserver threshold for .reveal elements. Must be 0, not a ratio:
// the only .reveal element is the document sheet, which is ~6,800px tall, so a
// 5% threshold required ~340px of it on screen before it would fade in. At load
// the masthead pushes it just below that line and the entire résumé stayed at
// opacity 0 until the reader scrolled. Any ratio is a trap for an element
// taller than the viewport; 0 means "as soon as it enters".
export const REVEAL_THRESHOLD = 0;

// ── DOM element IDs ──
export const ID_OVERLAY = "popover-overlay";
export const ID_POPOVER = "popover";

// ── CSS selectors ──
export const SEL_HOTSPOT = ".hotspot";
export const SEL_REVEAL = ".reveal";
export const SEL_DOC_PAGE = ".doc-page";

// ── CSS classes ──
export const CLS_HOVERED = "hovered";
export const CLS_ACTIVE = "active";
export const CLS_VISIBLE = "visible";
export const CLS_OPEN = "open";
export const CLS_REVEALED = "revealed";
export const CLS_SCROLL_REVEALED = "scroll-revealed";
export const CLS_POPOVER_OPEN = "popover-open";
export const CLS_ANNOTATION_SUPPRESSED = "annotation-suppressed"; // popover open for this key
export const CLS_IS_DRAGGING = "is-dragging";
export const CLS_EXPANDED = "is-expanded"; // margin note showing its full contents
