// ── The Masthead Portrait ─────────────────────────────────────────────────────
// A hand-drawn line portrait sits at the head of the document, opposite the
// name — a title page's engraving. The first time the reader reaches it
// (pointer over it, or a tap on touch) it smiles, once, and the smile stays
// for the rest of the visit. A greeting, not a loop: warmth is a moment, and
// repeating it would turn the author into an animation.
//
// The smile itself is pure CSS — three expression plates crossfading in
// sequence (see "The author's portrait" in global.css). This module only
// marks the moment of greeting by adding one class. Under reduced motion the
// CSS shows the settled smile from the start, so the class is a harmless
// no-op there.

import { CLS_SMILED } from "./constants.ts";

/** Wires the one-time greeting onto the portrait's figure element. */
export function attachSmilePortrait(root: HTMLElement | null): void {
  if (!root) return;

  // One greeting per portrait — a duplicate bind (dev hot reload) must not
  // re-listen.
  if (root.dataset.smileBound === "true") return;
  root.dataset.smileBound = "true";

  const smile = () => root.classList.add(CLS_SMILED);

  // pointerenter covers the mouse; click covers a tap, where hover never
  // happens. Both are once-only — the class is idempotent if both fire.
  root.addEventListener("pointerenter", smile, { once: true });
  root.addEventListener("click", smile, { once: true });
}
