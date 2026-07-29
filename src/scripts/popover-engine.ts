// ── Note Engine ───────────────────────────────────────────────────────────────
// Routes a marked term's click to the tier-appropriate note surface and owns
// the one surface that still floats: the mobile bottom sheet.
//
//   ≥1420px   the note CONTINUES in the margin (annotation-engine unfolds it)
//   601–1419  the note sets INTO the document flow (inset-note binds it in)
//   ≤600px    the note rises as a bottom sheet (this module)
//
// The floating desktop popover — positioned, clamped, draggable — is gone.
// Nothing on a desktop viewport is laid over the document any more; the
// document makes room instead. What remains here is the sheet's lifecycle
// (open/close, swipe-to-dismiss, focus trap — the sheet IS modal) and the
// shared hotspot wiring for all three tiers.
//
// Accessibility (sheet):
//   - Opens with focus on the × close button (first interactive child)
//   - Tab/Shift+Tab trapped inside the dialog while open
//   - Escape closes and returns focus to the triggering hotspot
//   - aria-label updates to the entry's label on each open
//   - Handle strip has aria-hidden (purely presentational)

import type { PopoverMap } from "../types/content.ts";
import { requireEl } from "./dom.ts";
import { buildContentNode } from "./note-content.ts";
import { toggleAnnotation, collapseAnnotation } from "./annotation-engine.ts";
import {
  toggleInset,
  closeInset,
  cleanupInset,
  isInsetTarget,
  activeInsetTerm,
} from "./inset-note.ts";
import {
  SWIPE_DISMISS_THRESHOLD,
  SWIPE_DISMISS_VELOCITY,
  SWIPE_RESISTANCE,
  SHEET_DISMISS_OFFSET,
  SHEET_DISMISS_ANIM_MS,
  SHEET_SNAPBACK_MS,
  RESIZE_DEBOUNCE_MS,
  ID_OVERLAY,
  ID_POPOVER,
  CLS_ACTIVE,
  CLS_VISIBLE,
  CLS_OPEN,
  CLS_POPOVER_OPEN,
  CLS_HOVERED,
  CLS_ANNOTATION_SUPPRESSED,
  CLS_IS_DRAGGING,
  SEL_HOTSPOT,
} from "./constants.ts";
import { isMobileScreen, isWideScreen } from "../utils/viewport.ts";

// CSS custom property used to animate the bottom-sheet during swipe-to-dismiss.
// The mobile transform rules reference this variable so JS can drive the offset
// without fighting the `!important` declarations directly.
const CSS_PROP_SHEET_OFFSET = "--sheet-drag-offset";
// Canonical Tabler "X" geometry. The sheet chrome is built client-side, so it
// cannot render the Astro icon component used by server-rendered controls.
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>';

// ── Annotation dissolve ───────────────────────────────────────────────────────

function suppressAnnotation(key: string): void {
  document
    .querySelector<HTMLElement>(`[data-annotation-key="${key}"]`)
    ?.classList.add(CLS_ANNOTATION_SUPPRESSED);
}

function restoreAnnotation(key: string): void {
  document
    .querySelector<HTMLElement>(`[data-annotation-key="${key}"]`)
    ?.classList.remove(CLS_ANNOTATION_SUPPRESSED);
}

// ── Focus trap ────────────────────────────────────────────────────────────────

const FOCUSABLE_SEL = [
  "button:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
].join(", ");

function getFocusableEls(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SEL));
}

let trapHandler: ((e: KeyboardEvent) => void) | null = null;

function enableFocusTrap(container: HTMLElement): void {
  trapHandler = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const els = getFocusableEls(container);
    if (els.length === 0) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  container.addEventListener("keydown", trapHandler);
}

function disableFocusTrap(container: HTMLElement): void {
  if (trapHandler) {
    container.removeEventListener("keydown", trapHandler);
    trapHandler = null;
  }
}

// ── Mobile swipe-to-dismiss ───────────────────────────────────────────────────
// Attach once on the sheet element. Engages only when isMobileScreen() is
// true and the user drags downward from the top of the sheet's scroll region.
// The touchmove listener is intentionally non-passive so it can call
// preventDefault() to stop the page beneath from scrolling during a dismiss.

function makeMobileSwipeable(
  popoverEl: HTMLElement,
  signal: AbortSignal,
): void {
  let touchStartY = 0;
  let touchCurrentY = 0;
  let touchStartTime = 0;
  let isSwiping = false;

  popoverEl.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      if (!isMobileScreen()) return;
      touchStartY = e.touches[0].clientY;
      touchCurrentY = touchStartY;
      touchStartTime = Date.now();
      isSwiping = false;
    },
    { passive: true, signal },
  );

  // NOT passive — we must call preventDefault() to stop page scroll when a
  // valid dismiss swipe is in progress. The call is scoped tightly: only when
  // delta > 0 (downward) AND scrollTop === 0 (at top of sheet content), so
  // normal in-sheet scrolling and all upward drags remain unaffected.
  popoverEl.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (!isMobileScreen()) return;
      touchCurrentY = e.touches[0].clientY;
      const delta = touchCurrentY - touchStartY;
      const scrollRegion =
        popoverEl.querySelector<HTMLElement>(".popover-scroll");
      const scrollTop = scrollRegion?.scrollTop ?? popoverEl.scrollTop;

      if (delta <= 0 || scrollTop > 0) {
        if (isSwiping) {
          // User scrolled back up mid-gesture — cancel
          isSwiping = false;
          popoverEl.classList.remove(CLS_IS_DRAGGING);
          popoverEl.style.removeProperty(CSS_PROP_SHEET_OFFSET);
        }
        return;
      }

      // Confirmed downward swipe from scroll-top: own the gesture so the page
      // beneath doesn't scroll simultaneously.
      e.preventDefault();

      isSwiping = true;
      popoverEl.classList.add(CLS_IS_DRAGGING); // disables CSS transition while dragging

      // Slight resistance gives a rubber-band feel and signals the pull direction
      const offset = delta * SWIPE_RESISTANCE;
      popoverEl.style.setProperty(CSS_PROP_SHEET_OFFSET, `${offset}px`);
    },
    { passive: false, signal },
  );

  const endSwipe = () => {
    if (!isMobileScreen() || !isSwiping) return;
    isSwiping = false;
    popoverEl.classList.remove(CLS_IS_DRAGGING); // re-enable CSS transitions

    const delta = touchCurrentY - touchStartY;
    const elapsed = Math.max(1, Date.now() - touchStartTime); // guard /0
    const velocity = delta / elapsed; // px/ms

    if (delta > SWIPE_DISMISS_THRESHOLD || velocity > SWIPE_DISMISS_VELOCITY) {
      // Animate the sheet down off-screen, then clean up
      popoverEl.style.setProperty(CSS_PROP_SHEET_OFFSET, SHEET_DISMISS_OFFSET);
      scheduleSheetTimer(() => closePopover(), SHEET_DISMISS_ANIM_MS);
    } else {
      // Not far/fast enough — snap back to resting position
      popoverEl.style.setProperty(CSS_PROP_SHEET_OFFSET, "0px");
      scheduleSheetTimer(
        () => popoverEl.style.removeProperty(CSS_PROP_SHEET_OFFSET),
        SHEET_SNAPBACK_MS,
      );
    }
  };

  popoverEl.addEventListener("touchend", endSwipe, { passive: true, signal });
  popoverEl.addEventListener("touchcancel", endSwipe, {
    passive: true,
    signal,
  });
}

let activeHotspot: HTMLElement | null = null;
let popovers: PopoverMap = {};
let engineAbortController: AbortController | null = null;
let sheetOpenFrame = 0;
let sheetGeneration = 0;
let resizeTimer = 0;
const sheetTimers = new Set<number>();

function scheduleSheetTimer(callback: () => void, delay: number): void {
  const timer = window.setTimeout(() => {
    sheetTimers.delete(timer);
    callback();
  }, delay);
  sheetTimers.add(timer);
}

function clearSheetTimers(): void {
  sheetTimers.forEach((timer) => window.clearTimeout(timer));
  sheetTimers.clear();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function injectSheetChrome(
  popoverEl: HTMLElement,
  label: string,
): HTMLButtonElement {
  popoverEl.setAttribute("aria-label", label);

  const handle = document.createElement("div");
  handle.className = "popover-handle";
  handle.setAttribute("aria-hidden", "true");

  const closeBtn = document.createElement("button");
  closeBtn.className = "popover-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = ICON_CLOSE;
  closeBtn.addEventListener("click", () => closePopover());

  popoverEl.prepend(closeBtn);
  popoverEl.prepend(handle);
  return closeBtn;
}

function toggleHotspotState(el: HTMLElement, isHovered: boolean): void {
  el.classList.toggle(CLS_HOVERED, isHovered);
}

// ── Sheet open/close ──────────────────────────────────────────────────────────

function openPopover(hotspot: HTMLElement): void {
  const overlay = requireEl(ID_OVERLAY, "PopoverEngine");
  const popoverEl = requireEl(ID_POPOVER, "PopoverEngine");

  const key = hotspot.dataset.popover;
  if (!key || !popovers[key]) return;
  const data = popovers[key];

  closePopover({ returnFocus: false });
  const generation = ++sheetGeneration;

  activeHotspot = hotspot;
  popoverEl.dataset.popoverKey = key;
  hotspot.classList.add(CLS_ACTIVE);
  hotspot.setAttribute("aria-expanded", "true");
  suppressAnnotation(key);

  const content = buildContentNode(data, "popover", {
    wrapBody: true,
    // The dig: full narrative, every figure, and the case-study link.
    mediaMode: "full",
    includeLink: true,
  });

  const scrollRegion = document.createElement("div");
  scrollRegion.className = "popover-scroll";
  scrollRegion.appendChild(content);

  popoverEl.replaceChildren(scrollRegion);
  const closeBtn = injectSheetChrome(popoverEl, data.label);

  overlay.classList.add(CLS_OPEN);
  document.body.classList.add(CLS_POPOVER_OPEN);

  sheetOpenFrame = requestAnimationFrame(() => {
    if (generation !== sheetGeneration || activeHotspot !== hotspot) return;
    popoverEl.classList.add(CLS_VISIBLE);
    closeBtn.focus();
    enableFocusTrap(popoverEl);
  });
}

interface CloseOptions {
  returnFocus?: boolean;
}

export function closePopover(options: CloseOptions = {}): void {
  const { returnFocus = true } = options;

  const overlay = requireEl(ID_OVERLAY, "PopoverEngine");
  const popoverEl = requireEl(ID_POPOVER, "PopoverEngine");

  sheetGeneration += 1;
  cancelAnimationFrame(sheetOpenFrame);
  sheetOpenFrame = 0;
  clearSheetTimers();
  disableFocusTrap(popoverEl);
  popoverEl.classList.remove(CLS_VISIBLE);
  popoverEl.classList.remove(CLS_IS_DRAGGING);
  delete popoverEl.dataset.popoverKey;
  popoverEl.style.removeProperty(CSS_PROP_SHEET_OFFSET); // clean up any swipe-dismiss offset
  overlay.classList.remove(CLS_OPEN);
  document.body.classList.remove(CLS_POPOVER_OPEN);

  if (activeHotspot) {
    activeHotspot.classList.remove(CLS_ACTIVE);
    activeHotspot.setAttribute("aria-expanded", "false");
    const returnEl = activeHotspot;
    const returnKey = activeHotspot.dataset.popover ?? "";
    activeHotspot = null;
    restoreAnnotation(returnKey);
    if (returnFocus) {
      requestAnimationFrame(() => returnEl.focus());
    }
  }
}

// ── Event binding ─────────────────────────────────────────────────────────────

export function initPopoverEngine(popoverData: PopoverMap): () => void {
  cleanupPopoverEngine();
  popovers = popoverData;

  const overlay = requireEl(ID_OVERLAY, "PopoverEngine");
  const popoverEl = requireEl(ID_POPOVER, "PopoverEngine");
  engineAbortController = new AbortController();
  const { signal } = engineAbortController;

  // Wire up interactions — once, persistent across open/close cycles
  makeMobileSwipeable(popoverEl, signal);

  document.querySelectorAll<HTMLElement>(SEL_HOTSPOT).forEach((el) => {
    el.addEventListener("pointerenter", () => toggleHotspotState(el, true), {
      signal,
    });
    el.addEventListener("pointerleave", () => toggleHotspotState(el, false), {
      signal,
    });
    el.addEventListener("focus", () => toggleHotspotState(el, true), {
      signal,
    });
    el.addEventListener("blur", () => toggleHotspotState(el, false), {
      signal,
    });

    const trigger = (e: Event) => {
      e.stopPropagation();

      // Wide enough for margins: the note belongs in the margin, full stop.
      // toggleAnnotation returns false only when the margin cannot take it
      // (narrow tier, or notes not built yet), and then we fall through.
      const key = el.dataset.popover;
      if (isWideScreen()) {
        closePopover({ returnFocus: false });
        closeInset({ instant: true });
        if (key) toggleAnnotation(key);
        return;
      }

      // Middle tier: the note sets into the document flow after the term's
      // own block. Nothing floats, nothing is covered.
      if (!isMobileScreen()) {
        closePopover({ returnFocus: false });
        collapseAnnotation();
        toggleInset(el, popovers);
        return;
      }

      // Mobile: the bottom sheet.
      closeInset({ instant: true });
      collapseAnnotation();
      if (activeHotspot === el) closePopover();
      else openPopover(el);
    };

    el.addEventListener("click", trigger, { signal });
    el.addEventListener(
      "keydown",
      (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          trigger(e);
        }
      },
      { signal },
    );
  });

  overlay.addEventListener("click", () => closePopover(), { signal });

  document.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closePopover();
      closeInset();
      collapseAnnotation();
    },
    { signal },
  );

  // A click anywhere else in the document closes an open note — margin or
  // bound-in — the same way the overlay closes the sheet. Clicks INSIDE an
  // open note never close it: it is a reading surface.
  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      const insideAnnotation = e
        .composedPath()
        .some(
          (node) =>
            node instanceof HTMLElement &&
            node.classList.contains("scroll-annotation"),
        );
      if (!insideAnnotation && !isInsetTarget(e.target)) {
        collapseAnnotation();
        closeInset();
      }
    },
    { signal },
  );

  // Crossing a tier boundary with a bound-in note open: the surface no longer
  // belongs to the layout, so it leaves without ceremony. The wide margin and
  // the sheet handle their own tiers.
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (isMobileScreen()) {
          collapseAnnotation();
          if (activeInsetTerm()) closeInset({ instant: true });
        } else if (isWideScreen()) {
          closePopover({ returnFocus: false });
          if (activeInsetTerm()) closeInset({ instant: true });
        } else {
          closePopover({ returnFocus: false });
          collapseAnnotation();
        }
      }, RESIZE_DEBOUNCE_MS);
    },
    { signal },
  );

  return cleanupPopoverEngine;
}

/** Disposes all listeners and transient state owned by the note router. */
export function cleanupPopoverEngine(): void {
  engineAbortController?.abort();
  engineAbortController = null;
  window.clearTimeout(resizeTimer);
  resizeTimer = 0;
  cleanupInset();

  if (
    document.getElementById(ID_OVERLAY) &&
    document.getElementById(ID_POPOVER)
  ) {
    closePopover({ returnFocus: false });
  } else {
    activeHotspot = null;
    clearSheetTimers();
  }
}
