// ── Highlight Fragment Engine ─────────────────────────────────────────────────
// Draws absolutely-positioned highlight fragments behind each .hotspot element.
//
// Strategy: use getClientRects() to get one DOMRect per visual line of wrapped
// text. For multi-line hotspots, apply directional gradient fades:
//   - Line 0 (first):  fade OUT on the right margin → looks like it wraps off
//   - Line n (middle): fade both sides → fully internal continuation lines
//   - Line N (last):   fade IN on the left margin  → looks like it fades back in
// Single-line hotspots get a solid uniform fill.
//
// Structural properties (position, z-index, pointer-events, transition) are
// owned entirely by the .hs-fragment CSS class in global.css.
// Only computed properties (background, borderRadius, top/left/width/height)
// are set as inline styles here.

import {
    ACCENT_R, ACCENT_G, ACCENT_B,
    TINT_ALPHA, HOVER_ALPHA, ACTIVE_SHADOW_ALPHA,
    FADE_SOLID_STOP, FADE_BLEND_STOP,
    FRAG_PAD_H, FRAG_PAD_V,
    SEL_HOTSPOT, SEL_FRAGMENT, SEL_DOC_PAGE,
    CLS_HOVERED, CLS_ACTIVE,
} from './constants.ts';

// ── Color helpers ──────────────────────────────────────────────────────────────

function rgba(alpha: number): string {
    return `rgba(${ACCENT_R}, ${ACCENT_G}, ${ACCENT_B}, ${alpha})`;
}

type FadeType = 'none' | 'right' | 'left' | 'both';

function backgroundFor(fadeType: FadeType, alpha: number): string {
    const c = rgba(alpha);
    switch (fadeType) {
        case 'right':
            return 'linear-gradient(to right, ' + c + ' ' + FADE_SOLID_STOP + '%, transparent 100%)';
        case 'left':
            return 'linear-gradient(to left, ' + c + ' ' + FADE_SOLID_STOP + '%, transparent 100%)';
        case 'both':
            return 'linear-gradient(to right, transparent 0%, ' + c + ' ' + FADE_BLEND_STOP + '%, ' + c + ' ' + FADE_SOLID_STOP + '%, transparent 100%)';
        default:
            return c;
    }
}

function borderRadiusFor(fadeType: FadeType): string {
    switch (fadeType) {
        case 'right': return '3px 0 0 3px';
        case 'left': return '0 3px 3px 0';
        case 'both': return '0';
        default: return '3px';
    }
}

// ── State tracking ─────────────────────────────────────────────────────────────

interface FragmentEntry {
    el: HTMLElement;
    fadeType: FadeType;
}

const fragmentMap = new Map<Element, FragmentEntry[]>();

// ── Core drawing ───────────────────────────────────────────────────────────────

export function drawFragments(): void {
    document.querySelectorAll(SEL_FRAGMENT).forEach(el => el.remove());
    fragmentMap.clear();

    // Fragments must be children of .doc-page so that z-index:-1 positions them
    // above doc-page's white background but below its text content.
    // Appending to body puts z-index:-1 behind body's background = invisible.
    const docPage = document.querySelector<HTMLElement>(SEL_DOC_PAGE);
    if (!docPage) return;
    const docPageRect = docPage.getBoundingClientRect();

    document.querySelectorAll<HTMLElement>(SEL_HOTSPOT).forEach(hotspot => {
        const rects = hotspot.getClientRects();
        if (rects.length === 0) return;

        const entries: FragmentEntry[] = [];

        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            const frag = document.createElement('div');
            frag.className = SEL_FRAGMENT.slice(1);
            frag.dataset.for = hotspot.dataset.popover;
            frag.setAttribute('aria-hidden', 'true');

            let fadeType: FadeType = 'none';
            if (rects.length > 1) {
                if (i === 0) fadeType = 'right';
                else if (i === rects.length - 1) fadeType = 'left';
                else fadeType = 'both';
            }
            frag.dataset.fade = fadeType;

            // Position relative to .doc-page (both rects are in viewport coords,
            // so the difference is the correct absolute offset inside doc-page)
            frag.style.top = (rect.top - docPageRect.top - FRAG_PAD_V) + 'px';
            frag.style.left = (rect.left - docPageRect.left - FRAG_PAD_H) + 'px';
            frag.style.width = (rect.width + FRAG_PAD_H * 2) + 'px';
            frag.style.height = (rect.height + FRAG_PAD_V * 2) + 'px';

            frag.style.background = backgroundFor(fadeType, TINT_ALPHA);
            frag.style.borderRadius = borderRadiusFor(fadeType);

            docPage.appendChild(frag);
            entries.push({ el: frag, fadeType });
        }
        fragmentMap.set(hotspot, entries);
    });

    syncFragmentStates();
}

// ── State sync ─────────────────────────────────────────────────────────────────

export function syncFragmentStates(): void {
    fragmentMap.forEach((entries, hotspot) => {
        const isHovered = hotspot.classList.contains(CLS_HOVERED) || hotspot === document.activeElement;
        const isActive = hotspot.classList.contains(CLS_ACTIVE);
        const alpha = (isHovered || isActive) ? HOVER_ALPHA : TINT_ALPHA;

        entries.forEach(({ el, fadeType }) => {
            el.style.background = backgroundFor(fadeType, alpha);
            el.style.filter = isActive
                ? 'drop-shadow(0 2px 4px ' + rgba(ACTIVE_SHADOW_ALPHA) + ')'
                : 'none';
        });
    });
}
