// ── Scroll Annotation Engine ──────────────────────────────────────────────────
// Manages margin annotations that appear on wide displays (≥1400px).
// Uses IntersectionObserver to reveal annotations as their paired hotspot
// scrolls into view. Resolves vertical overlaps between adjacent annotations.
//
// On near-wide displays (1024–1399px): nudges a "widen hint" UI element
// instead of revealing annotations, encouraging users to widen the browser.

import type { PopoverMap } from '../types/content.ts';
import { requireEl, buildContentNode } from './dom.ts';
import {
    BREAKPOINT_WIDE, BREAKPOINT_NEAR, BREAKPOINT_MOBILE,
    ANNOTATION_MIN_GAP, ANNOTATION_ROOT_MARGIN, ANNOTATION_TEXT_SENTENCES,
    NUDGE_DURATION_MS,
    ID_WIDEN_HINT,
    SEL_HOTSPOT, SEL_DOC_PAGE,
    CLS_REVEALED, CLS_SCROLL_REVEALED, CLS_VISIBLE, CLS_NUDGE,
    RIBBON_PROGRESS_START, RIBBON_PROGRESS_END,
    RIBBON_LEFT_START_OFFSET, RIBBON_LEFT_DELTA,
    RIBBON_RIGHT_START_OFFSET, RIBBON_RIGHT_DELTA,
} from './constants.ts';
import { isWideScreen, isNearWideScreen } from '../utils/viewport.ts';


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
let resizeAbortController: AbortController | null = null;
let introAnnotationEl: HTMLElement | null = null;

// ── Annotation build ──────────────────────────────────────────────────────────

function buildAllAnnotations(popovers: PopoverMap): void {
    if (annotationsBuilt) return;

    const docPage = document.querySelector<HTMLElement>(SEL_DOC_PAGE);
    if (!docPage) return;

    const docPageRect = docPage.getBoundingClientRect();

    // Pass 1: create all annotations at natural hotspot positions
    let nextSide: 'left' | 'right' = 'right';
    document.querySelectorAll<HTMLElement>(`.hotspot[data-popover]`).forEach(hotspot => {
        const key = hotspot.dataset.popover;
        if (!key) return;

        if (!hotspot) {
            console.warn(`[AnnotationEngine] Missing \`<hotspot data-popover="${key}">\` anchor in DOM. Cannot build annotation.`);
            return;
        }
        const data = popovers[key];
        if (!data) {
            console.warn(`[AnnotationEngine] Missing data for popover key "${key}". Cannot build annotation.`);
            return;
        }

        const side = nextSide;
        nextSide = nextSide === 'right' ? 'left' : 'right';

        const el = document.createElement('div');
        el.className = `scroll-annotation side-${side}`;
        el.dataset.annotationKey = key; // used by popover-engine to suppress on open
        el.appendChild(buildContentNode(data, 'sa', {
            prependRule: true,
            truncateText: true,
        }));

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

    // Pass 2: resolve vertical overlaps per side so annotations don't stack.
    // Also attach load listeners to any images so we re-resolve if they shift heights.
    resolveOverlaps('left');
    resolveOverlaps('right');

    docPage.querySelectorAll('.sa-img, .sa-vid').forEach(media => {
        if (media.tagName.toLowerCase() === 'img') {
            const image = media as HTMLImageElement;
            if (image.complete) {
                resolveOverlaps('left');
                resolveOverlaps('right');
            } else {
                image.addEventListener('load', () => {
                    resolveOverlaps('left');
                    resolveOverlaps('right');
                });
            }
        } else if (media.tagName.toLowerCase() === 'video') {
            const video = media as HTMLVideoElement;
            if (video.readyState >= 1) { // HAVE_METADATA
                resolveOverlaps('left');
                resolveOverlaps('right');
            } else {
                video.addEventListener('loadeddata', () => {
                    resolveOverlaps('left');
                    resolveOverlaps('right');
                });
            }
        }
    });

    // Final safety pass once everything is definitely in place
    window.addEventListener('load', () => {
        resolveOverlaps('left');
        resolveOverlaps('right');
    });

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

// ── Intro annotation ─────────────────────────────────────────────────────────
// Shown on cold wide-screen loads where all hotspots are below the fold,
// so the margin isn't empty and the interactive feature isn't invisible.
// Dismissed (animated) the moment the first real annotation scrolls into view.

function showIntroAnnotation(): void {
    if (introAnnotationEl) return;
    const docPage = document.querySelector<HTMLElement>(SEL_DOC_PAGE);
    if (!docPage) return;

    const el = document.createElement('div');
    el.className = `scroll-annotation side-left`;
    el.dataset.intro = 'true';
    el.style.top = '60px';

    const rule = document.createElement('div');
    rule.className = 'sa-rule';

    const label = document.createElement('div');
    label.className = 'sa-label';
    label.textContent = 'Interactive';

    const text = document.createElement('div');
    text.className = 'sa-text';
    text.textContent = 'Scroll to reveal — as you read, highlighted terms surface detail, data, and media here in the margin.';

    el.appendChild(rule);
    el.appendChild(label);
    el.appendChild(text);
    docPage.appendChild(el);
    introAnnotationEl = el;

    // Brief delay so the element is in the DOM before the transition fires
    setTimeout(() => el.classList.add(CLS_REVEALED), 300);
}

function dismissIntroAnnotation(): void {
    if (!introAnnotationEl) return;
    const el = introAnnotationEl;
    introAnnotationEl = null;
    el.classList.remove(CLS_REVEALED);
    setTimeout(() => el.remove(), 700);
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

export function initAnnotationEngine(
    popovers: PopoverMap,
): void {
    // Reset state for this instance (handles View Transitions/page changes)
    cleanupAnnotations();

    const annotationKeys = new Set<string>();
    document.querySelectorAll<HTMLElement>('.hotspot[data-popover]').forEach(el => {
        if (el.dataset.popover) annotationKeys.add(el.dataset.popover);
    });
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
            buildAllAnnotations(popovers);
        }

        if (isNearWideScreen()) {
            hint.classList.add(CLS_VISIBLE);
        } else {
            hint.classList.remove(CLS_VISIBLE);
        }

        // Disconnect and re-observe to force an immediate visibility check on the current scroll position
        marginObserver?.disconnect();

        const hotspots = document.querySelectorAll<HTMLElement>(SEL_HOTSPOT);
        hotspots.forEach(el => {
            const key = el.dataset.popover;
            if (key && annotationKeys.has(key)) {
                marginObserver!.observe(el);

                // If we're wide, also do an immediate physical viewport check so 
                // annotations "pop in" immediately on widen without waiting for 
                // the IntersectionObserver rootMargin band.
                if (isWideScreen()) {
                    const rect = el.getBoundingClientRect();
                    const inPhysicalView = rect.top < window.innerHeight && rect.bottom > 0;
                    if (inPhysicalView) {
                        revealAnnotation(key);
                    }
                }
            }
        });

        // Cold-start: wide screen but nothing yet visible (all hotspots below the fold).
        // Show an intro annotation to set the expectation before the user scrolls.
        if (isWideScreen() && annotationsBuilt) {
            const anyRevealed = Object.values(annotationEls).some(
                entry => entry.el.classList.contains(CLS_REVEALED),
            );
            if (!anyRevealed) {
                showIntroAnnotation();
            }
        }
    }

    // Track fluid resizing progress (0 = 1024px, 1 = 1460px)
    function updateWidenProgress(): void {
        const progress = Math.max(0, Math.min(1,
            (window.innerWidth - RIBBON_PROGRESS_START) / (RIBBON_PROGRESS_END - RIBBON_PROGRESS_START)
        ));
        document.documentElement.style.setProperty('--widen-progress', progress.toString());

        // Update SVG textPath startOffsets for the sliding ribbon effect
        const textPathLeft = document.getElementById('widen-textpath-left') as SVGTextPathElement | null;
        const textPathRight = document.getElementById('widen-textpath-right') as SVGTextPathElement | null;

        if (textPathLeft && textPathRight) {
            // Left track: M0,400 L180,400 Q200,400 200,380 L200,0
            // Vert: starts around 211 (on L200,400->200,0 segment).
            // Horiz: starts around 70 (on M0->180 segment).
            const leftOffset = RIBBON_LEFT_START_OFFSET - (RIBBON_LEFT_DELTA * progress);
            textPathLeft.setAttribute('startOffset', `${leftOffset}`);

            // Right track: M0,0 L0,380 Q0,400 20,400 L200,400
            // Vert: starts around 255 (on M0->380 segment).
            // Horiz: starts around 411 (on 20->200 segment).
            const rightOffset = RIBBON_RIGHT_START_OFFSET + (RIBBON_RIGHT_DELTA * progress);
            textPathRight.setAttribute('startOffset', `${rightOffset}`);
        }
    }

    // Call once on load
    requestAnimationFrame(updateWidenProgress);

    // Handle resize — AbortController ensures this listener is removed on cleanup
    resizeAbortController = new AbortController();
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        requestAnimationFrame(updateWidenProgress);

        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            const isWide = isWideScreen();
            const isNear = isNearWideScreen();

            if (isWide && !annotationsBuilt) {
                init();
            } else if (isWide && annotationsBuilt) {
                hint.classList.remove(CLS_VISIBLE);
            } else if (isNear) {
                hint.classList.add(CLS_VISIBLE);
                if (annotationsBuilt) resetAnnotationState();
                init();
            } else {
                hint.classList.remove(CLS_VISIBLE);
                if (annotationsBuilt) resetAnnotationState();
            }
        }, 0);
    }, { signal: resizeAbortController.signal });

    init();
}
