// ── Scroll Annotation Engine ──────────────────────────────────────────────────
// Manages margin annotations that appear on wide displays (≥BREAKPOINT_WIDE).
// Uses IntersectionObserver to reveal annotations as their paired hotspot
// scrolls into view. Resolves vertical overlaps between adjacent annotations.
// Below the wide tier, no margin annotations are shown.

import type { PopoverData, PopoverMap } from "../types/content.ts";
import { buildContentNode, onMediaReady } from "./dom.ts";
import {
  ANNOTATION_MIN_GAP,
  EXPANDED_VIEWPORT_MARGIN,
  ANNOTATION_ROOT_MARGIN,
  INTRO_TOP,
  INTRO_REVEAL_MS,
  INTRO_DISMISS_MS,
  RESIZE_DEBOUNCE_MS,
  SEL_HOTSPOT,
  SEL_DOC_PAGE,
  CLS_ACTIVE,
  CLS_REVEALED,
  CLS_SCROLL_REVEALED,
  CLS_ANNOTATION_SUPPRESSED,
  CLS_EXPANDED,
} from "./constants.ts";
import { isWideScreen } from "../utils/viewport.ts";

// ── Engine state ───────────────────────────────────────────────────────────────

interface AnnotationEntry {
  el: HTMLElement;
  hotspot: HTMLElement;
  side: "left" | "right";
  naturalTop: number;
}

let annotationEls: Record<string, AnnotationEntry> = {};
let annotationsBuilt = false;
let marginObserver: IntersectionObserver | null = null;
let resizeAbortController: AbortController | null = null;
let introAnnotationEl: HTMLElement | null = null;

// Kept so a note can be re-rendered at full length when it expands.
let popoverData: PopoverMap = {};
// At most one note is ever expanded — two open notes in a 220px column would
// push each other halfway down the page.
let expandedKey: string | null = null;

// ── Annotation build ──────────────────────────────────────────────────────────

function buildAllAnnotations(popovers: PopoverMap): void {
  if (annotationsBuilt) return;
  popoverData = popovers;

  const docPage = document.querySelector<HTMLElement>(SEL_DOC_PAGE);
  if (!docPage) return;

  const docPageRect = docPage.getBoundingClientRect();

  // Pass 1: create all annotations at natural hotspot positions
  let nextSide: "left" | "right" = "right";
  document
    .querySelectorAll<HTMLElement>(`${SEL_HOTSPOT}[data-popover]`)
    .forEach((hotspot) => {
      const key = hotspot.dataset.popover;
      if (!key) return;

      const data = popovers[key];
      if (!data) {
        console.warn(
          `[AnnotationEngine] Missing data for popover key "${key}". Cannot build annotation.`,
        );
        return;
      }

      const side = nextSide;
      nextSide = nextSide === "right" ? "left" : "right";

      const el = document.createElement("div");
      el.className = `scroll-annotation side-${side}`;
      el.dataset.annotationKey = key; // used by popover-engine to suppress on open

      // The margin note is a visual convenience that restates, in shortened
      // form, content already reachable from the marked term. Exposing it to
      // assistive tech would read every note twice — once in the margin, once
      // in the popover. The marked term is the accessible control.
      el.setAttribute("aria-hidden", "true");

      renderAnnotation(el, data, hotspot, false);

      // Clicking the note toggles it, exactly like clicking its term.
      el.addEventListener("click", (e) => {
        // Let links inside an expanded note behave as links.
        if ((e.target as HTMLElement).closest("a")) return;
        toggleAnnotation(key);
      });

      const hotspotRect = hotspot.getBoundingClientRect();
      const naturalTop = hotspotRect.top - docPageRect.top;
      el.style.top = naturalTop + "px";
      docPage.appendChild(el);

      // Edge case: popover may already be open for this key (narrow→wide resize
      // while the popover was open). Suppress immediately — no flash.
      if (hotspot.classList.contains(CLS_ACTIVE)) {
        el.classList.add(CLS_ANNOTATION_SUPPRESSED);
      }

      annotationEls[key] = { el, hotspot, side, naturalTop };
    });

  // Pass 2: resolve vertical overlaps per side so annotations don't stack.
  // Re-resolve whenever a media element settles, since loading can shift heights.
  resolveAllOverlaps();

  docPage
    .querySelectorAll(".sa-img, .sa-vid")
    .forEach((media) => onMediaReady(media, resolveAllOverlaps));

  // Final safety pass once everything is definitely in place
  window.addEventListener("load", resolveAllOverlaps);

  annotationsBuilt = true;
}

/**
 * Renders a note's contents at one of its two lengths.
 *
 *   glance   folio, label, headline figure, one sentence, a "more" glyph.
 *   expanded the whole thing — full narrative, every figure as a carousel,
 *            the quote, and the case-study link where one exists.
 *
 * The expanded form is what makes the wide layout self-sufficient. Only 6 of the
 * 18 notes have a case study behind them, so "click through to the detail page"
 * cannot be the wide-screen answer on its own — the other 12 (the Emmy, the two
 * patents, the Magic Wall, mobile AR before the iPhone, the dissertation) would
 * have nowhere to go, and the margin would be their permanent one-sentence
 * ceiling.
 */
function renderAnnotation(
  el: HTMLElement,
  data: PopoverData,
  hotspot: HTMLElement,
  expanded: boolean,
): void {
  el.replaceChildren(
    buildContentNode(data, "sa", {
      prependRule: true,
      truncateText: !expanded,
      mediaMode: expanded ? "full" : "thumb",
      folio: Number(hotspot.dataset.folio) || undefined,
      // Both states. Reaching a project used to require expanding the note
      // first and then finding a line of 11px type at the bottom of a column
      // that hangs below the fold — where a sticky footer cannot help, because
      // a note shorter than its own max-height never scrolls and so never
      // sticks. A visible, underlined link in the collapsed note removes the
      // step entirely.
      includeLink: true,
    }),
  );
  el.classList.toggle(CLS_EXPANDED, expanded);
  // Collapsed notes restate content reachable from the term, so they are hidden
  // from assistive tech. An expanded note IS the content, so it is exposed.
  el.setAttribute("aria-hidden", String(!expanded));
}

/** Collapses whichever note is open, if any. */
export function collapseAnnotation(): void {
  if (!expandedKey) return;
  const entry = annotationEls[expandedKey];
  const key = expandedKey;
  expandedKey = null;
  if (entry) {
    const data = popoverData[key];
    if (data) renderAnnotation(entry.el, data, entry.hotspot, false);
    entry.hotspot.classList.remove(CLS_ACTIVE);
    entry.hotspot.setAttribute("aria-expanded", "false");
  }
  resolveAllOverlaps();
}

/**
 * Expands one note in the margin, collapsing any other. Returns false when the
 * note cannot be shown there (no margins at this width, or no note built), so
 * the caller can fall back to the popover. Internal — callers use
 * toggleAnnotation().
 */
function expandAnnotation(key: string): boolean {
  if (!isWideScreen() || !annotationsBuilt) return false;
  const entry = annotationEls[key];
  const data = popoverData[key];
  if (!entry || !data) return false;

  if (expandedKey && expandedKey !== key) collapseAnnotation();

  expandedKey = key;
  renderAnnotation(entry.el, data, entry.hotspot, true);
  entry.el.classList.add(CLS_REVEALED);
  entry.hotspot.classList.add(CLS_ACTIVE);
  entry.hotspot.setAttribute("aria-expanded", "true");

  resolveAllOverlaps();
  clampExpandedIntoView(entry);

  // Figures arrive late and change the note's height, which moves every note
  // below it — the same reason the popover has to re-clamp.
  entry.el.querySelectorAll(".sa-img, .sa-vid").forEach((media) =>
    onMediaReady(media, () => {
      resolveAllOverlaps();
      if (expandedKey === key) clampExpandedIntoView(entry);
    }),
  );

  return true;
}

/**
 * Pulls an expanded note into the viewport.
 *
 * A collapsed note sits at its term's own height, which is right — it is an
 * annotation *of that line*. An expanded one is 600px+ tall, so anchoring it to
 * the same line drops most of it below the fold. Same problem the popover has,
 * same answer: clamp into [top margin, bottom margin], and pin to the top when
 * it is taller than the viewport (it scrolls internally).
 */
function clampExpandedIntoView(entry: AnnotationEntry): void {
  const docPage = document.querySelector<HTMLElement>(SEL_DOC_PAGE);
  if (!docPage) return;

  const docTopDoc = docPage.getBoundingClientRect().top + window.scrollY;
  const height = entry.el.offsetHeight;
  const minTop = window.scrollY + EXPANDED_VIEWPORT_MARGIN;
  const maxTop =
    window.scrollY + window.innerHeight - EXPANDED_VIEWPORT_MARGIN - height;
  const currentTop = docTopDoc + (parseFloat(entry.el.style.top) || 0);

  const clamped = Math.max(
    minTop,
    Math.min(currentTop, Math.max(minTop, maxTop)),
  );
  entry.el.style.top = clamped - docTopDoc + "px";
}

/** Toggles a note: expand it, or collapse it if it is already open. */
export function toggleAnnotation(key: string): boolean {
  if (expandedKey === key) {
    collapseAnnotation();
    return true;
  }
  return expandAnnotation(key);
}

/** Resolves overlaps on both margins. */
function resolveAllOverlaps(): void {
  resolveOverlaps("left");
  resolveOverlaps("right");
}

function resolveOverlaps(side: "left" | "right"): void {
  const items = Object.values(annotationEls).filter(
    (entry) => entry.side === side,
  );

  items.sort((a, b) => a.naturalTop - b.naturalTop);

  let prevBottom = -Infinity;
  for (const item of items) {
    let top = item.naturalTop;
    if (top < prevBottom + ANNOTATION_MIN_GAP) {
      top = prevBottom + ANNOTATION_MIN_GAP;
    }
    item.el.style.top = top + "px";
    prevBottom = top + item.el.offsetHeight;
  }
}

// ── Intro annotation ─────────────────────────────────────────────────────────
// Shown on cold wide-screen loads where all hotspots are below the fold,
// so the margin isn't empty and the interactive feature isn't invisible.
// Dismissed (animated) the moment the first real annotation scrolls into view.

function showIntroAnnotation(): void {
  if (introAnnotationEl) return;
  const docPage = document.querySelector<HTMLElement>(SEL_DOC_PAGE);
  if (!docPage) return;

  const el = document.createElement("div");
  el.className = `scroll-annotation side-left`;
  el.dataset.intro = "true";
  el.style.top = INTRO_TOP;

  const rule = document.createElement("div");
  rule.className = "sa-rule";

  const label = document.createElement("div");
  label.className = "sa-label";
  label.textContent = "Interactive";

  const text = document.createElement("div");
  text.className = "sa-text";
  text.textContent =
    "Scroll to reveal. As you read, highlighted terms surface detail, data, and media here in the margin.";

  el.appendChild(rule);
  el.appendChild(label);
  el.appendChild(text);
  docPage.appendChild(el);
  introAnnotationEl = el;

  // Brief delay so the element is in the DOM before the transition fires
  setTimeout(() => el.classList.add(CLS_REVEALED), INTRO_REVEAL_MS);
}

function dismissIntroAnnotation(): void {
  if (!introAnnotationEl) return;
  const el = introAnnotationEl;
  introAnnotationEl = null;
  el.classList.remove(CLS_REVEALED);
  setTimeout(() => el.remove(), INTRO_DISMISS_MS);
}

function revealAnnotation(key: string): void {
  dismissIntroAnnotation();
  const entry = annotationEls[key];
  if (!entry || entry.el.classList.contains(CLS_REVEALED)) return;
  entry.el.classList.add(CLS_REVEALED);
  entry.hotspot.classList.add(CLS_SCROLL_REVEALED);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

// Resets annotation DOM and state without touching the resize listener.
// Used internally by the resize handler so it can clean up and re-init
// without aborting the AbortController that's keeping the listener alive.
function resetAnnotationState(): void {
  if (introAnnotationEl) {
    introAnnotationEl.remove();
    introAnnotationEl = null;
  }
  Object.values(annotationEls).forEach(({ el, hotspot }) => {
    el.remove();
    hotspot.classList.remove(CLS_SCROLL_REVEALED);
  });
  annotationEls = {};
  annotationsBuilt = false;
  expandedKey = null;
  marginObserver?.disconnect();
}

// Full teardown — removes the resize listener too. Called on page transitions.
export function cleanupAnnotations(): void {
  resizeAbortController?.abort();
  resizeAbortController = null;
  resetAnnotationState();
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initAnnotationEngine(popovers: PopoverMap): void {
  // Reset state for this instance (handles View Transitions/page changes)
  cleanupAnnotations();
  popoverData = popovers;

  const annotationKeys = new Set<string>();
  document
    .querySelectorAll<HTMLElement>(`${SEL_HOTSPOT}[data-popover]`)
    .forEach((el) => {
      if (el.dataset.popover) annotationKeys.add(el.dataset.popover);
    });

  // Reveal annotations as hotspots enter view on wide screens. Narrower tiers
  // show no margin annotations, so the observer is a no-op there.
  marginObserver = new IntersectionObserver(
    (entries) => {
      if (!isWideScreen()) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const key = (entry.target as HTMLElement).dataset.popover;
          if (key && annotationKeys.has(key)) revealAnnotation(key);
        }
      });
    },
    { rootMargin: ANNOTATION_ROOT_MARGIN, threshold: 0 },
  );

  function init(): void {
    if (isWideScreen()) {
      buildAllAnnotations(popovers);
    }

    // Disconnect and re-observe to force an immediate visibility check on the current scroll position
    marginObserver?.disconnect();

    const hotspots = document.querySelectorAll<HTMLElement>(SEL_HOTSPOT);
    hotspots.forEach((el) => {
      const key = el.dataset.popover;
      if (key && annotationKeys.has(key)) {
        marginObserver!.observe(el);

        // If we're wide, also do an immediate physical viewport check so
        // annotations "pop in" immediately on widen without waiting for
        // the IntersectionObserver rootMargin band.
        if (isWideScreen()) {
          const rect = el.getBoundingClientRect();
          const inPhysicalView =
            rect.top < window.innerHeight && rect.bottom > 0;
          if (inPhysicalView) {
            revealAnnotation(key);
          }
        }
      }
    });

    // Cold-start: wide screen but nothing yet visible (all hotspots below the fold).
    // Show an intro annotation to set the expectation before the user scrolls.
    if (isWideScreen() && annotationsBuilt) {
      const anyRevealed = Object.values(annotationEls).some((entry) =>
        entry.el.classList.contains(CLS_REVEALED),
      );
      if (!anyRevealed) {
        showIntroAnnotation();
      }
    }
  }

  // Handle resize — AbortController ensures this listener is removed on cleanup
  resizeAbortController = new AbortController();
  let resizeTimer = 0;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(applyResponsiveState, RESIZE_DEBOUNCE_MS);
    },
    { signal: resizeAbortController.signal },
  );

  // Reconcile annotations to the current viewport tier: build on entering the
  // wide tier, tear down on leaving it.
  function applyResponsiveState(): void {
    const isWide = isWideScreen();
    if (!isWide && annotationsBuilt) resetAnnotationState();
    if (isWide && !annotationsBuilt) init();
  }

  init();
}
