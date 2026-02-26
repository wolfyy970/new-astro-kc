// ── Scroll Annotation Engine ──────────────────────────────────────────────────
// Manages margin annotations that appear on wide displays (≥1400px).
// Uses IntersectionObserver to reveal annotations as their paired hotspot
// scrolls into view. Resolves vertical overlaps between adjacent annotations.
//
// On near-wide displays (1024–1399px): nudges a "widen hint" UI element
// instead of revealing annotations, encouraging users to widen the browser.

import type { PopoverMap, ScrollAnnotation } from '../types/content.ts';
import { requireEl, buildContentHTML } from './dom.ts';
import {
    BREAKPOINT_WIDE, BREAKPOINT_NEAR,
    ANNOTATION_MIN_GAP, ANNOTATION_ROOT_MARGIN, ANNOTATION_TEXT_SENTENCES,
    NUDGE_DURATION_MS,
    ID_WIDEN_HINT,
    SEL_HOTSPOT, SEL_DOC_PAGE,
    CLS_REVEALED, CLS_SCROLL_REVEALED, CLS_VISIBLE, CLS_NUDGE,
} from './constants.ts';

// ── Screen helpers ─────────────────────────────────────────────────────────────

export function isWideScreen(): boolean {
    return window.innerWidth >= BREAKPOINT_WIDE;
}

export function isNearWideScreen(): boolean {
    const w = window.innerWidth;
    return w >= BREAKPOINT_NEAR && w < BREAKPOINT_WIDE;
}

// ── Widen hint ────────────────────────────────────────────────────────────────

function nudgeWidenHint(): void {
    if (!isNearWideScreen()) return;
    const hint = requireEl(ID_WIDEN_HINT, 'AnnotationEngine');
    hint.classList.add(CLS_NUDGE);
    setTimeout(() => hint.classList.remove(CLS_NUDGE), NUDGE_DURATION_MS);
}

// ── Engine state ───────────────────────────────────────────────────────────────

interface AnnotationEntry {
    el: HTMLElement;
    hotspot: HTMLElement;
    side: 'left' | 'right';
    naturalTop: number;
}

let annotationEls: Record<string, AnnotationEntry> = {};
let annotationsBuilt = false;
let marginObserver: IntersectionObserver | null = null;

// ── Annotation build ──────────────────────────────────────────────────────────

function buildAllAnnotations(annotationList: ScrollAnnotation[], popovers: PopoverMap): void {
    if (annotationsBuilt) return;

    const docPage = document.querySelector<HTMLElement>(SEL_DOC_PAGE);
    if (!docPage) return;

    const docPageRect = docPage.getBoundingClientRect();

    // Pass 1: create all annotations at natural hotspot positions
    annotationList.forEach(({ key, side }) => {
        const hotspot = document.querySelector<HTMLElement>(`.hotspot[data-popover="${key}"]`);
        if (!hotspot) return;
        const data = popovers[key];
        if (!data) return;

        const el = document.createElement('div');
        el.className = `scroll-annotation side-${side}`;
        el.dataset.annotationKey = key; // used by popover-engine to suppress on open
        el.innerHTML = buildContentHTML(data, 'sa', {
            prependRule: true,
            truncateText: true,
        });

        const hotspotRect = hotspot.getBoundingClientRect();
        const naturalTop = hotspotRect.top - docPageRect.top;
        el.style.top = naturalTop + 'px';
        docPage.appendChild(el);

        // Edge case: popover may already be open for this key (narrow→wide resize
        // while the popover was open). Suppress immediately — no flash.
        if (hotspot.classList.contains('active')) {
            el.classList.add('annotation-suppressed');
        }

        annotationEls[key] = { el, hotspot, side, naturalTop };
    });

    // Pass 2: resolve vertical overlaps per side so annotations don't stack
    resolveOverlaps('left');
    resolveOverlaps('right');

    annotationsBuilt = true;
}

function resolveOverlaps(side: 'left' | 'right'): void {
    const items = Object.values(annotationEls)
        .filter(entry => entry.side === side);

    items.sort((a, b) => a.naturalTop - b.naturalTop);

    let prevBottom = -Infinity;
    for (const item of items) {
        let top = item.naturalTop;
        if (top < prevBottom + ANNOTATION_MIN_GAP) {
            top = prevBottom + ANNOTATION_MIN_GAP;
        }
        item.el.style.top = top + 'px';
        prevBottom = top + item.el.offsetHeight;
    }
}

function revealAnnotation(key: string): void {
    const entry = annotationEls[key];
    if (!entry || entry.el.classList.contains(CLS_REVEALED)) return;
    entry.el.classList.add(CLS_REVEALED);
    entry.hotspot.classList.add(CLS_SCROLL_REVEALED);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

function cleanupAnnotations(): void {
    Object.values(annotationEls).forEach(({ el, hotspot }) => {
        el.remove();
        hotspot.classList.remove(CLS_SCROLL_REVEALED);
    });
    annotationEls = {};
    annotationsBuilt = false;
    marginObserver?.disconnect();
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function initAnnotationEngine(
    annotationList: ScrollAnnotation[],
    popovers: PopoverMap,
): void {
    const annotationKeys = new Set(annotationList.map(a => a.key));
    const hint = requireEl(ID_WIDEN_HINT, 'AnnotationEngine');

    // Set up the IntersectionObserver
    marginObserver = new IntersectionObserver(
        (entries) => {
            if (isWideScreen()) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const key = (entry.target as HTMLElement).dataset.popover;
                        if (key && annotationKeys.has(key)) revealAnnotation(key);
                    }
                });
            } else if (isNearWideScreen()) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const key = (entry.target as HTMLElement).dataset.popover;
                        if (key && annotationKeys.has(key)) nudgeWidenHint();
                    }
                });
            }
        },
        { rootMargin: ANNOTATION_ROOT_MARGIN, threshold: 0 },
    );

    function init(): void {
        if (isWideScreen()) {
            buildAllAnnotations(annotationList, popovers);
        }

        if (isNearWideScreen()) {
            hint.classList.add(CLS_VISIBLE);
        } else {
            hint.classList.remove(CLS_VISIBLE);
        }

        document.querySelectorAll<HTMLElement>(SEL_HOTSPOT).forEach(el => {
            const key = el.dataset.popover;
            if (key && annotationKeys.has(key)) marginObserver!.observe(el);
        });
    }

    // Handle resize
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            if (isWideScreen() && !annotationsBuilt) {
                init();
            } else if (isWideScreen() && annotationsBuilt) {
                hint.classList.remove(CLS_VISIBLE);
            } else if (isNearWideScreen()) {
                hint.classList.add(CLS_VISIBLE);
                if (annotationsBuilt) cleanupAnnotations();
                init();
            } else {
                hint.classList.remove(CLS_VISIBLE);
                if (annotationsBuilt) cleanupAnnotations();
            }
        }, 0); // annotation resize runs after highlight engine redraw (see main.ts)
    });

    init();
}
