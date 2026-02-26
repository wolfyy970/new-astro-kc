// ── Main client entry point ───────────────────────────────────────────────────
// Reads page data from window globals set by the <script define:vars> block in
// index.astro. Initialises all three interactive systems and coordinates the
// highlight engine resize handler.

import type { PopoverMap, ScrollAnnotation } from '../types/content.ts';
import { requireGlobal } from './dom.ts';
import { drawFragments } from './highlight-engine.ts';
import { initPopoverEngine } from './popover-engine.ts';
import { initAnnotationEngine } from './annotation-engine.ts';
import {
    SEL_REVEAL, SEL_FRAGMENT,
    CLS_VISIBLE,
    RESIZE_DEBOUNCE_MS,
    REVEAL_THRESHOLD,
} from './constants.ts';

// ── Read page data ────────────────────────────────────────────────────────────
// Globals are set by the <script define:vars> block in index.astro.
// requireGlobal() throws a clear diagnostic error if a global is missing,
// rather than silently passing undefined through the type system.

const popovers = requireGlobal<PopoverMap>('__POPOVERS__', 'main');
const scrollAnnotations = requireGlobal<ScrollAnnotation[]>('__ANNOTATIONS__', 'main');

// ── Scroll reveal (.reveal elements) ─────────────────────────────────────────

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add(CLS_VISIBLE);
        });
    },
    { threshold: REVEAL_THRESHOLD },
);
document.querySelectorAll(SEL_REVEAL).forEach(el => revealObserver.observe(el));

// ── Resize handler ────────────────────────────────────────────────────────────
// Clears fragments immediately on drag, then redraws after debounce.
// annotation-engine handles its own resize logic via a separate listener.

let resizeTimer = 0;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    document.querySelectorAll(SEL_FRAGMENT).forEach(el => el.remove());

    resizeTimer = window.setTimeout(() => {
        drawFragments();
    }, RESIZE_DEBOUNCE_MS);
});

// ── Boot sequence ─────────────────────────────────────────────────────────────
// Double rAF ensures layout is fully stable before measuring ClientRects.

requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        initPopoverEngine(popovers);
        initAnnotationEngine(scrollAnnotations, popovers);
        drawFragments();

        // Re-draw after fonts load — Cormorant Garamond shifts bounding rects
        document.fonts.ready.then(() => {
            drawFragments();
        });
    });
});
