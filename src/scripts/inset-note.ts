// ── Bound-In Note (middle tier, 601–1419px) ──────────────────────────────────
// Between the mobile sheet and the wide margin, a note does not float over the
// document and it does not hang beside it — it sets INTO it. Clicking a marked
// term opens the note in the document's own flow, directly after the term's
// paragraph or bullet: a hairline above, a hairline below, the mono label, the
// media plate, and the narrative in columns, like a note bound into the page.
// The prose below simply makes room. Nothing is covered, nothing is dimmed,
// nothing needs dragging out of the way, and the reader's scroll is the only
// scroll — the note has no inner scrollbox.
//
// Semantics: this is a disclosure, not a dialog. The trigger keeps
// aria-expanded; aria-controls is repointed at the note while it is open; no
// focus trap is installed because nothing modal is happening. Escape and the
// note's fold control close it, as does clicking anywhere else — the same
// contract the expanded margin note honours.

import type { PopoverMap } from "../types/content.ts";
import { buildContentNode } from "./note-content.ts";
import {
  ID_INSET,
  ID_POPOVER,
  INSET_COLLAPSE_MS,
  ASSIST_BOTTOM_GAP,
  ASSIST_NOTE_TOP,
  SCROLL_EXIT_THRESHOLD,
  CLS_ACTIVE,
  CLS_OPEN,
} from "./constants.ts";
import { prefersReducedMotion } from "../utils/viewport.ts";
import { assistNoteIntoView } from "./note-geometry.ts";

// Canonical Tabler "X", matching the sheet's close control.
const ICON_FOLD =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>';

let activeTerm: HTMLElement | null = null;
let activeNote: HTMLElement | null = null;
let exitAbortController: AbortController | null = null;
const collapseTimers = new Set<number>();

/**
 * The block the note binds in after. A term inside a bullet keeps its note
 * inside that bullet (an <aside> is valid flow content in an <li>, and the
 * indent correctly reads as "a note on this line"). A term in a paragraph
 * cannot contain an <aside>, so the note follows the paragraph.
 */
function bindingPoint(term: HTMLElement): {
  host: HTMLElement;
  mode: "append" | "after";
} | null {
  const li = term.closest<HTMLElement>("li");
  if (li) return { host: li, mode: "append" };
  const block = term.closest<HTMLElement>(
    ".doc-summary, .doc-exp-desc, .focus, .doc-awards-line",
  );
  if (block) return { host: block, mode: "after" };
  return null;
}

/**
 * The note unfolds DOWNWARD from a zero-height row, so at open time its rect
 * says nothing about where it will END. Same answer as the margin assist:
 * measure the final extent (the inner wrapper's scrollHeight while the row is
 * still collapsed) and drift the page until that end has ASSIST_BOTTOM_GAP of
 * air above the fold — never carrying the note's top past ASSIST_NOTE_TOP,
 * and never moving the clicked term off-screen. A note taller than the
 * viewport pins near the top and the reader follows it down the page.
 */
function assistIntoView(note: HTMLElement, term: HTMLElement): void {
  assistNoteIntoView(note, term, ".inset-inner");
}

// ── Scroll-as-exit ────────────────────────────────────────────────────────────
// The same contract the margin note honours: the reader's own scroll is the
// way out, listening to wheel/touch INPUT rather than the scroll event so the
// assist's smooth scrollBy can never close the note it just opened. One
// difference matters here: the bound-in note occupies document FLOW, so
// folding it while it sits above the viewport would pull the page up under
// the departing reader. An off-screen close is therefore instant, with the
// scroll position compensated in the same frame — nothing visible moves.

let scrollExitAcc = 0;

/** Instant close that keeps everything currently on screen exactly still. */
function closeNoteScrolledPast(note: HTMLElement): void {
  const height = note.offsetHeight;
  closeInset({ instant: true });
  if (height > 0) {
    // Must be explicit: the document sets scroll-behavior: smooth, which
    // would turn this same-frame compensation into a visible animated
    // scroll — and anything measured during it would be measured mid-flight.
    window.scrollBy({ top: -height, behavior: "instant" });
  }
}

function onReaderScrollIntent(delta: number): void {
  const note = activeNote;
  if (!note) return;

  const rect = note.getBoundingClientRect();

  // A note taller than the viewport is READ by scrolling; it folds only once
  // the reader has genuinely left its extent, in either direction.
  if (rect.height > window.innerHeight - ASSIST_NOTE_TOP) {
    const leftBelow = rect.bottom < ASSIST_NOTE_TOP;
    const leftAbove = rect.top > window.innerHeight - ASSIST_BOTTOM_GAP;
    if (leftBelow) closeNoteScrolledPast(note);
    else if (leftAbove) closeInset();
    return;
  }

  scrollExitAcc += Math.abs(delta);
  if (scrollExitAcc >= SCROLL_EXIT_THRESHOLD) {
    // Fully above the viewport: fold without moving the reader's view.
    // Otherwise the fold is visible below/around them and animates closed.
    if (rect.bottom < 0) closeNoteScrolledPast(note);
    else closeInset();
  }
}

function bindExitListeners(): void {
  if (exitAbortController) return;
  exitAbortController = new AbortController();
  const { signal } = exitAbortController;
  document.addEventListener(
    "wheel",
    (e: WheelEvent) => onReaderScrollIntent(e.deltaY),
    { passive: true, signal },
  );
  document.addEventListener(
    "touchmove",
    // A drag that STARTS inside the note is reading — swiping its carousel —
    // not leaving. A real departure swipe fires dozens of these, so a fixed
    // step reaches the threshold immediately while jitter does not.
    (e: TouchEvent) => {
      if (e.target instanceof Element && e.target.closest(".inset-note")) {
        return;
      }
      onReaderScrollIntent(SCROLL_EXIT_THRESHOLD / 2);
    },
    { passive: true, signal },
  );
}

function buildInset(key: string, popovers: PopoverMap): HTMLElement | null {
  const data = popovers[key];
  if (!data) return null;

  const note = document.createElement("aside");
  note.className = "inset-note";
  note.id = ID_INSET;
  note.dataset.popoverKey = key;
  note.setAttribute("aria-label", data.label);

  const inner = document.createElement("div");
  inner.className = "inset-inner";

  const body = document.createElement("div");
  body.className = "inset-body";
  body.appendChild(
    // The popover flavour reuses the global note styles — label, stat, media,
    // carousel, quote, gateway — and .inset-note re-sets only what the flow
    // position changes: measure, columns, and plate size.
    buildContentNode(data, "popover", {
      mediaMode: "full",
      includeLink: true,
    }),
  );

  // The fold control sits in the label row: a quiet way back, for readers who
  // arrived by pointer. Escape and the term itself do the same job.
  const fold = document.createElement("button");
  fold.type = "button";
  fold.className = "inset-fold";
  fold.setAttribute("aria-label", "Close note");
  fold.innerHTML = ICON_FOLD;
  fold.addEventListener("click", () => closeInset());
  body.querySelector(".popover-head")?.appendChild(fold);

  inner.appendChild(body);
  note.appendChild(inner);
  return note;
}

/** Whether a click landed inside the open bound-in note. */
export function isInsetTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".inset-note") !== null;
}

/**
 * Closes the open note, if any. The fold animation runs on a detached-in-place
 * copy of the state: the element keeps its DOM position while its row
 * collapses, then leaves. `instant` skips the animation (tier changes,
 * teardown).
 */
export function closeInset(options: { instant?: boolean } = {}): void {
  const note = activeNote;
  const term = activeTerm;
  activeNote = null;
  activeTerm = null;

  if (term) {
    term.classList.remove(CLS_ACTIVE);
    term.setAttribute("aria-expanded", "false");
    term.setAttribute("aria-controls", ID_POPOVER);
  }
  if (!note) return;

  // The id moves with the state, never with the corpse: a swap builds the next
  // note while this one folds away, and two elements must not share it.
  note.removeAttribute("id");

  const focusWasInside = note.contains(document.activeElement);
  if (focusWasInside && term) term.focus();

  if (options.instant || prefersReducedMotion()) {
    note.remove();
    return;
  }

  note.classList.remove(CLS_OPEN);
  const timer = window.setTimeout(() => {
    collapseTimers.delete(timer);
    note.remove();
  }, INSET_COLLAPSE_MS);
  collapseTimers.add(timer);
}

/** Opens the note for a term, closing any other. */
function openInset(term: HTMLElement, popovers: PopoverMap): void {
  const key = term.dataset.popover;
  if (!key) return;

  // A different note may be open. One that sits BELOW the new term folds in
  // place harmlessly — the reader is above it. One that sits ABOVE must
  // leave instantly with the scroll compensated: its animated fold would
  // remove height from the flow above the reader, dragging the page and the
  // incoming note upward mid-assist.
  if (activeNote) {
    const oldAbove =
      activeNote.getBoundingClientRect().top < term.getBoundingClientRect().top;
    if (oldAbove) closeNoteScrolledPast(activeNote);
    else closeInset();
  }

  const point = bindingPoint(term);
  const note = buildInset(key, popovers);
  if (!point || !note) return;

  if (point.mode === "append") point.host.appendChild(note);
  else point.host.insertAdjacentElement("afterend", note);

  bindExitListeners();
  scrollExitAcc = 0;
  activeTerm = term;
  activeNote = note;
  term.classList.add(CLS_ACTIVE);
  term.setAttribute("aria-expanded", "true");
  term.setAttribute("aria-controls", ID_INSET);

  if (prefersReducedMotion()) {
    note.classList.add(CLS_OPEN);
  } else {
    // Two frames: the row must exist at 0fr before the transition to 1fr can
    // unfold it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => note.classList.add(CLS_OPEN)),
    );
  }

  assistIntoView(note, term);
}

/** Toggles the note for a term. */
export function toggleInset(term: HTMLElement, popovers: PopoverMap): void {
  if (activeTerm === term) closeInset();
  else openInset(term, popovers);
}

/** The term whose note is open, if any — used by restore and tier changes. */
export function activeInsetTerm(): HTMLElement | null {
  return activeTerm;
}

/** Fully disposes the inset surface and its document-level listeners. */
export function cleanupInset(): void {
  exitAbortController?.abort();
  exitAbortController = null;
  collapseTimers.forEach((timer) => window.clearTimeout(timer));
  collapseTimers.clear();
  closeInset({ instant: true });
  document.querySelectorAll(".inset-note").forEach((note) => note.remove());
}
