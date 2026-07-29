// ── Scroll Annotation Engine ──────────────────────────────────────────────────
// Manages margin annotations that appear on wide displays (≥BREAKPOINT_WIDE).
// Uses IntersectionObserver to reveal annotations as their paired hotspot
// scrolls into view. Resolves vertical overlaps between adjacent annotations.
// Below the wide tier, no margin annotations are shown.

import type { PopoverData, PopoverMap } from "../types/content.ts";
import { buildContentNode, onMediaReady } from "./dom.ts";
import { renderCaseStudyMarker } from "../utils/render.ts";
import { attachIntroPayoff } from "./intro-payoff.ts";
import {
  ANNOTATION_MIN_GAP,
  ANNOTATION_ROOT_MARGIN,
  UNFOLD_REFLOW_MS,
  ASSIST_BOTTOM_GAP,
  ASSIST_NOTE_TOP,
  ASSIST_TERM_MIN,
  SCROLL_EXIT_THRESHOLD,
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
  CLS_MARGIN_FOCUS,
  CLS_INTRO_GATEWAY,
  CLS_INTRO_DONE,
} from "./constants.ts";
import { isWideScreen, prefersReducedMotion } from "../utils/viewport.ts";

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
      // The pen family, carried onto the note: when this note opens, its
      // stretched rule takes the same highlighter ink as its marked term —
      // yellow for marginalia, green for a project note.
      if (data.link) el.classList.add("sa-project");
      el.dataset.annotationKey = key; // used by popover-engine to suppress on open

      // The margin note is a visual convenience that restates, in shortened
      // form, content already reachable from the marked term. Exposing it to
      // assistive tech would read every note twice — once in the margin, once
      // in the popover. The marked term is the accessible control.
      el.setAttribute("aria-hidden", "true");

      renderAnnotation(el, data);

      // Clicking a glance opens it, exactly like clicking its term. An OPEN
      // note is a reading surface: clicks inside it must never collapse it —
      // selecting a phrase or missing a chevron by 4px is not a request to
      // close. Collapse belongs to the term, Escape, and clicks elsewhere.
      el.addEventListener("click", (e) => {
        if (el.classList.contains(CLS_EXPANDED)) return;
        const target = e.target;
        if (!(target instanceof Element)) return;

        // Media controls own their clicks. Letting a chevron, dot, or video
        // bubble into the note toggle rebuilds the carousel around the event
        // target and resets it to slide one.
        if (target.closest("a, button, video, .sa-carousel")) return;
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
 * Renders a note's contents once, at build time, carrying both of its lengths:
 *
 *   glance        label, every figure as a carousel, one sentence.
 *   continuation  the remaining narrative and the quote, waiting inside a
 *                 collapsed `.sa-more` wrapper in the same DOM.
 *
 * Expansion never re-renders — it is a class toggle that lets the note
 * CONTINUE in place, the way a printed note simply keeps going. The full form
 * makes the wide layout self-sufficient: not every note has a case study
 * behind it, so "click through to the detail page" cannot be the wide-screen
 * answer on its own; marginalia-only entries still need the full narrative to
 * be available in place.
 */
function renderAnnotation(el: HTMLElement, data: PopoverData): void {
  el.replaceChildren(
    buildContentNode(data, "sa", {
      prependRule: true,
      splitGlance: true,
      // Marginalia is the wide-screen media experience, not a teaser for one.
      // Keep every image and video available in both states; expansion adds
      // the full narrative without changing or replacing the media controls.
      mediaMode: "full",
      // Both states. The shared renderer places the gateway directly after the
      // media, or after the label/stat when no media exists, so wide marginalia
      // follows the same CTA hierarchy as the overlay.
      includeLink: true,
    }),
  );
}

/**
 * Re-runs overlap resolution every frame for the duration of the unfold, so
 * the notes below an opening (or closing) note ride its changing height
 * instead of jumping once to a precomputed position. The margin re-typesets
 * itself continuously — no teleports, no two-step settling.
 */
let reflowUntil = 0;
function animateReflow(): void {
  const now = performance.now();
  const alreadyRunning = reflowUntil > now;
  reflowUntil = now + UNFOLD_REFLOW_MS;
  if (alreadyRunning || prefersReducedMotion()) {
    // Reduced motion: the .sa-more transition is disabled in CSS, so a single
    // synchronous pass lands everything in its final position.
    resolveAllOverlaps();
    return;
  }
  const tick = (t: number) => {
    resolveAllOverlaps();
    if (t < reflowUntil) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * The continuation unfolds DOWNWARD, so a note whose top sits comfortably on
 * screen can still do all of its unfolding below the fold — the reader clicks
 * and sees nothing but the rule stretch. The assist therefore aims at the
 * note's FINAL extent: it measures where the note will end once .sa-more has
 * unfolded (the wrapper's scrollHeight is its final height, measurable while
 * still collapsed) and drifts the page so that end is on screen — bounded so
 * the note's own top never rises past ASSIST_NOTE_TOP, and the clicked term
 * never leaves the viewport. A note taller than the screen pins near the top
 * and the reader follows it down the margin, as with any long sidenote.
 */
function assistIntoView(entry: AnnotationEntry): void {
  const noteRect = entry.el.getBoundingClientRect();
  const termTop = entry.hotspot.getBoundingClientRect().top;
  // The grid-rows mechanism sizes .sa-more-inner to 0 while collapsed; its
  // scrollHeight is the height its content will occupy once unfolded.
  const inner = entry.el.querySelector<HTMLElement>(".sa-more-inner");
  const growth = inner ? inner.scrollHeight - inner.offsetHeight : 0;
  const finalBottom = noteRect.top + entry.el.offsetHeight + growth;

  const wanted = finalBottom - (window.innerHeight - ASSIST_BOTTOM_GAP);
  const delta = Math.min(
    wanted,
    noteRect.top - ASSIST_NOTE_TOP,
    termTop - ASSIST_TERM_MIN,
  );
  if (delta > 0) {
    window.scrollBy({
      top: delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }
}

// ── Scroll-as-exit ────────────────────────────────────────────────────────────
// The reader's own scroll is the way out of an open note: move on, and the
// note folds behind you. Listening to wheel/touch INPUT rather than the
// scroll event is what makes this safe — the assist's smooth scrollBy fires
// scroll events but no input events, so the note never closes itself.

let scrollExitAcc = 0;

function onReaderScrollIntent(delta: number): void {
  if (!expandedKey) return;
  const entry = annotationEls[expandedKey];
  if (!entry) return;

  // A note taller than the viewport is READ by scrolling; it folds only once
  // the reader has genuinely left its extent, in either direction.
  const rect = entry.el.getBoundingClientRect();
  if (rect.height > window.innerHeight - ASSIST_NOTE_TOP) {
    const leftBelow = rect.bottom < ASSIST_NOTE_TOP;
    const leftAbove = rect.top > window.innerHeight - ASSIST_BOTTOM_GAP;
    if (leftBelow || leftAbove) collapseAnnotation();
    return;
  }

  scrollExitAcc += Math.abs(delta);
  if (scrollExitAcc >= SCROLL_EXIT_THRESHOLD) collapseAnnotation();
}

/** Collapses whichever note is open, if any. */
export function collapseAnnotation(): void {
  if (!expandedKey) return;
  const entry = annotationEls[expandedKey];
  expandedKey = null;
  if (entry) {
    entry.el.classList.remove(CLS_EXPANDED);
    entry.el.setAttribute("aria-hidden", "true");
    entry.hotspot.classList.remove(CLS_ACTIVE);
    entry.hotspot.setAttribute("aria-expanded", "false");
  }
  document
    .querySelector<HTMLElement>(SEL_DOC_PAGE)
    ?.classList.remove(CLS_MARGIN_FOCUS);
  animateReflow();
}

/**
 * Expands one note in the margin, collapsing any other. Returns false when the
 * note cannot be shown there (no margins at this width, or no note built), so
 * the caller can fall back to the in-flow note. Internal — callers use
 * toggleAnnotation().
 */
function expandAnnotation(key: string): boolean {
  if (!isWideScreen() || !annotationsBuilt) return false;
  const entry = annotationEls[key];
  const data = popoverData[key];
  if (!entry || !data) return false;

  if (expandedKey && expandedKey !== key) collapseAnnotation();

  expandedKey = key;
  scrollExitAcc = 0;
  entry.el.classList.add(CLS_EXPANDED, CLS_REVEALED);
  // Collapsed notes restate content reachable from the term, so they are
  // hidden from assistive tech. An expanded note IS the content.
  entry.el.setAttribute("aria-hidden", "false");
  entry.hotspot.classList.add(CLS_ACTIVE);
  entry.hotspot.setAttribute("aria-expanded", "true");

  // The rest of the margin recedes a step while one note is being read —
  // the eye is answered, not shouted at. The document itself never dims.
  document
    .querySelector<HTMLElement>(SEL_DOC_PAGE)
    ?.classList.add(CLS_MARGIN_FOCUS);

  animateReflow();
  assistIntoView(entry);

  return true;
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

/**
 * A specimen of the reader's pen for the intro note — the real stroke
 * apparatus (.hs-stroke + a variant geometry), never a lookalike. A span,
 * not a control: the intro is an aria-hidden visual convenience, so nothing
 * inside it may take focus. The green specimen carries the genuine
 * superscript marker from render.ts.
 */
function buildIntroSpecimen(text: string, project: boolean): HTMLElement {
  const term = document.createElement("span");
  term.className = project
    ? "intro-term intro-term--project hs-mark-6"
    : "intro-term hs-mark-3";
  const stroke = document.createElement("span");
  stroke.className = "hs-stroke";
  stroke.textContent = text;
  term.appendChild(stroke);
  if (project) term.insertAdjacentHTML("beforeend", renderCaseStudyMarker());
  return term;
}

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

  // The introduction is a working scale model of the system it introduces.
  // The glance marks its own key phrase with the actual yellow stroke…
  const text = document.createElement("div");
  text.className = "sa-text";
  text.append(
    "Scroll to reveal. As you read, ",
    buildIntroSpecimen("highlighted terms", false),
    " surface detail, data, and media here in the margin.",
  );

  // …and clicking it does exactly what clicking any mark does at this tier:
  // the note continues in place. The continuation reveals the system's
  // second rung — the two pens — with the green pen a genuine, CLICKABLE
  // specimen: the ladder demonstrates its own third rung.
  const more = document.createElement("div");
  more.className = "sa-more";
  const moreInner = document.createElement("div");
  moreInner.className = "sa-more-inner";
  const moreText = document.createElement("div");
  moreText.className = "sa-text";
  const greenSpecimen = buildIntroSpecimen("green mark", true);
  moreText.append(
    "A yellow mark holds a note like this one; a ",
    greenSpecimen,
    " leads onward to a complete project.",
  );
  moreInner.appendChild(moreText);

  // Rung three, staged: the green specimen reveals an example of the real
  // project gateway (the same .sa-link control every project note carries)…
  const gateway = document.createElement("div");
  gateway.className = "intro-reveal intro-reveal--gateway";
  const gatewayInner = document.createElement("div");
  gatewayInner.className = "intro-reveal-inner";
  const demoLink = document.createElement("span");
  demoLink.className = "sa-link intro-demo-link";
  const demoLabel = document.createElement("span");
  demoLabel.className = "sa-link-label";
  demoLabel.textContent = "View project";
  demoLink.appendChild(demoLabel);
  gatewayInner.appendChild(demoLink);
  gateway.appendChild(gatewayInner);
  moreInner.appendChild(gateway);

  // …and the gateway, being a demonstration, pays off honestly instead of
  // navigating: the apparatus itself congratulates the reader and hands the
  // document back.
  const done = document.createElement("div");
  done.className = "intro-reveal intro-reveal--done";
  const doneInner = document.createElement("div");
  doneInner.className = "intro-reveal-inner";
  const doneLine = document.createElement("div");
  doneLine.className = "intro-done";
  doneLine.textContent = "You got it! Scroll away.";
  doneInner.appendChild(doneLine);
  done.appendChild(doneInner);
  moreInner.appendChild(done);

  greenSpecimen.addEventListener("click", () =>
    el.classList.add(CLS_INTRO_GATEWAY),
  );
  // First click unfolds the authored payoff; every click after that is the
  // payoff module's conversation, ending in the choreographed exit.
  attachIntroPayoff({
    root: el,
    link: demoLink,
    line: doneLine,
    doneClass: CLS_INTRO_DONE,
    onRemoved: () => {
      if (introAnnotationEl === el) introAnnotationEl = null;
    },
  });

  more.appendChild(moreInner);

  el.appendChild(rule);
  el.appendChild(label);
  el.appendChild(text);
  el.appendChild(more);

  // Same contract as a real note: a click on the glance opens it; clicks on
  // an open note are inert (it is a reading surface). It closes the way the
  // whole intro closes — by scrolling on, which dissolves it entirely the
  // moment the first real annotation reveals.
  el.addEventListener("click", () => el.classList.add(CLS_EXPANDED));

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
  document
    .querySelector<HTMLElement>(SEL_DOC_PAGE)
    ?.classList.remove(CLS_MARGIN_FOCUS);
  annotationEls = {};
  annotationsBuilt = false;
  expandedKey = null;
  reflowUntil = 0;
  scrollExitAcc = 0;
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

  // Scroll-as-exit listens to INPUT (wheel/touch), never the scroll event —
  // see onReaderScrollIntent. Passive: the reader's scroll must never jank.
  document.addEventListener(
    "wheel",
    (e: WheelEvent) => onReaderScrollIntent(e.deltaY),
    { passive: true, signal: resizeAbortController.signal },
  );
  document.addEventListener(
    "touchmove",
    // A touch drag has no per-event delta worth trusting; a real swipe fires
    // dozens of these, so a fixed step reaches the threshold immediately
    // while a resting finger's jitter does not. A drag that STARTS inside the
    // open note is reading — swiping its carousel — not leaving.
    (e: TouchEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest(".scroll-annotation.is-expanded")
      ) {
        return;
      }
      onReaderScrollIntent(SCROLL_EXIT_THRESHOLD / 2);
    },
    { passive: true, signal: resizeAbortController.signal },
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
