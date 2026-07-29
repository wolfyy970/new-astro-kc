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

// ── Mobile sheet ──
// The sheet is the only floating note surface left. On wider viewports the
// note either continues in the margin (wide tier) or sets into the document
// flow as a bound-in note (middle tier) — nothing is positioned, dragged, or
// clamped, so the old popover-positioning constants are gone with the panel.
export const SWIPE_DISMISS_THRESHOLD = 80; // px — downward swipe distance to dismiss mobile sheet
export const SWIPE_DISMISS_VELOCITY = 0.4; // px/ms — flick velocity that also triggers dismiss
export const SWIPE_RESISTANCE = 0.65; // fraction — rubber-band drag follow ratio during swipe
export const SHEET_DISMISS_OFFSET = "100vh"; // off-screen translate applied when dismissing the sheet
export const SHEET_DISMISS_ANIM_MS = 300; // ms — dismiss slide-out before closePopover (match CSS transition)
export const SHEET_SNAPBACK_MS = 350; // ms — snap-back settle before clearing the drag offset

// ── Bound-in note (middle tier) ──
export const INSET_COLLAPSE_MS = 400; // ms — fold-up before the note leaves the DOM (≥ CSS transition)

// ── Note scroll assist (margin and bound-in alike) ──
// The assist aims at the note's FINAL unfolded extent, not its current top:
// the continuation grows downward, so a note whose top is comfortably on
// screen can still do all of its unfolding below the fold.
export const ASSIST_BOTTOM_GAP = 104; // px — air between an assisted note's final bottom and the fold; "in view" is not "against the edge"
export const ASSIST_NOTE_TOP = 88; // px — highest the assist will carry an unfolding note's top
export const ASSIST_TERM_MIN = 32; // px — the clicked term never rises past this line

// ── Intro payoff (the demo gateway's conversation) ──
// The debounce makes a burst of clicks one utterance: the reply lands when
// the clicking stops. Typing is constant-speed and sub-second for the longest
// line (~38 chars × 22ms ≈ 0.84s). The finale holds long enough to be read
// before the introduction leaves.
export const PAYOFF_DEBOUNCE_MS = 450; // ms — trailing gap that ends a click burst
export const PAYOFF_CHAR_MS = 22; // ms — per character; same letters-per-second for every message
export const PAYOFF_SLOW_GAP_MS = 4000; // ms — a single click after this long reads as contemplative
export const PAYOFF_RAPID_CLICKS = 5; // clicks in one burst that read as drumming
export const PAYOFF_FINALE_HOLD_MS = 1600; // ms — the goodbye stays legible before the exit begins
export const PAYOFF_MAX_REPLIES = 5; // conversational replies before the goodbye — the egg must end

// ── Scroll-as-exit (margin and bound-in alike) ──
// Scrolling away is the elegant way out of an open note: no hunting for a
// close control, no Escape — the reader simply moves on and the note folds
// behind them. The threshold forgives trackpad jitter while still firing on
// the first deliberate motion. A note taller than the viewport is exempt
// until the reader scrolls PAST it, because scrolling is how such a note is
// read at all.
export const SCROLL_EXIT_THRESHOLD = 32; // px — accumulated wheel/touch delta that counts as leaving

// ── Annotation layout ──
export const ANNOTATION_MIN_GAP = 80; // px — minimum vertical gap between annotations
export const ANNOTATION_ROOT_MARGIN = "-15% 0px -40% 0px"; // IntersectionObserver rootMargin
// The margin note is the glance, not the article. One sentence is what makes
// the annotation worth following: at three, the margin was reprinting almost the
// whole popover, so opening it bought the reader a single extra sentence in
// exchange for covering the page they were reading.
export const ANNOTATION_TEXT_SENTENCES = 1; // max sentences shown in a margin note
// How long overlap resolution re-runs per animation frame while a note's
// continuation unfolds or folds. Slightly longer than the CSS grid-rows
// transition so the last frames land exactly.
export const UNFOLD_REFLOW_MS = 560;
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
export const ID_INSET = "inset-note"; // the in-flow bound-in note (one at a time)

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
export const CLS_MARGIN_FOCUS = "margin-focus"; // one note open — the rest of the margin recedes
export const CLS_INTRO_PENS = "intro-stage-pens"; // intro demo: the two-pens sentence revealed (edition note)
export const CLS_INTRO_GATEWAY = "intro-stage-gateway"; // intro demo: example project gateway revealed
export const CLS_INTRO_DONE = "intro-stage-done"; // intro demo: the reader clicked it — pay off
// The introduction's exit choreography, staged by the payoff module:
export const CLS_INTRO_LEAVING = "intro-leaving"; // content settles down to the rule
export const CLS_INTRO_GOING = "intro-going"; // the rule retracts toward its middle
export const CLS_INTRO_POPPED = "intro-popped"; // the pop, then removal
export const CLS_SMILED = "is-smiling"; // masthead portrait greeted — the smile happened, and stays
