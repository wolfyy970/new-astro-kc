// ── Scroll Annotation Engine ──────────────────────────────────────────────────
// Manages margin annotations that appear on wide displays (≥1460px).
// Uses IntersectionObserver to reveal annotations as their paired hotspot
// scrolls into view. Resolves vertical overlaps between adjacent annotations.
// Below the wide tier, no margin annotations are shown.
//
// (The "widen hint" ribbon shown on narrower screens was extracted to the
// parked, self-contained src/components/WidenHint.astro and is not wired here.)

import type { PopoverMap } from "../types/content.ts";
import { buildContentNode } from "./dom.ts";
import {
  ANNOTATION_MIN_GAP,
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

// ── Annotation build ──────────────────────────────────────────────────────────

function buildAllAnnotations(popovers: PopoverMap): void {
  if (annotationsBuilt) return;

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
      el.appendChild(
        buildContentNode(data, "sa", {
          prependRule: true,
          truncateText: true,
        }),
      );

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

/** Resolves overlaps on both margins. */
function resolveAllOverlaps(): void {
  resolveOverlaps("left");
  resolveOverlaps("right");
}

/**
 * Invokes `cb` once the media element has its intrinsic dimensions — immediately
 * if already loaded, otherwise on the relevant load event.
 */
function onMediaReady(media: Element, cb: () => void): void {
  const tag = media.tagName.toLowerCase();
  if (tag === "img") {
    const image = media as HTMLImageElement;
    if (image.complete) cb();
    else image.addEventListener("load", cb);
  } else if (tag === "video") {
    const video = media as HTMLVideoElement;
    if (video.readyState >= 1) cb(); // HAVE_METADATA
    else video.addEventListener("loadeddata", cb);
  }
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
