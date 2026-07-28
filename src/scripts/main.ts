// ── Main client entry point ───────────────────────────────────────────────────
// Reads page data from window globals set by the <script define:vars> block in
// index.astro. Initialises all three interactive systems and coordinates the
// highlight engine resize handler.

import { requireGlobal } from "./dom.ts";
import { initPopoverEngine } from "./popover-engine.ts";
import { initAnnotationEngine } from "./annotation-engine.ts";
import {
  initResumeReturnTracking,
  restoreResumeReturnView,
} from "./return-to-resume.ts";
import { SEL_REVEAL, CLS_VISIBLE, REVEAL_THRESHOLD } from "./constants.ts";

// ── Read page data ────────────────────────────────────────────────────────────
// Globals are set by the <script define:vars> block in index.astro.
// requireGlobal() throws a clear diagnostic error if a global is missing,
// rather than silently passing undefined through the type system.

const popovers = requireGlobal("__POPOVERS__", "main");

// Project links are generated after boot, so one delegated listener records
// that a case-study visit came from this exact résumé history entry. The case
// study can then use true Back navigation instead of creating a fresh `/`
// visit at the top of the document.
initResumeReturnTracking();

// ── Scroll reveal (.reveal elements) ─────────────────────────────────────────

// The hidden starting state is gated on this class, which only exists once the
// script has run. The résumé sheet is a .reveal element, so without the gate a
// failed or blocked bundle left the entire document at opacity 0 — server-
// rendered, present in the DOM, and invisible. The content is now visible by
// default and the fade is layered on top of it.
document.documentElement.classList.add("js-reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add(CLS_VISIBLE);
    });
  },
  { threshold: REVEAL_THRESHOLD },
);
document
  .querySelectorAll(SEL_REVEAL)
  .forEach((el) => revealObserver.observe(el));

// ── Boot sequence ─────────────────────────────────────────────────────────────
// Double rAF ensures layout is fully stable before measuring ClientRects.

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    initPopoverEngine(popovers);
    initAnnotationEngine(popovers);
    restoreResumeReturnView();
  });
});
