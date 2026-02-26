// ── Popover Engine ────────────────────────────────────────────────────────────
// Manages open/close lifecycle and dragging for the detail popover panel.
// On desktop: absolutely positioned near the clicked hotspot; draggable.
// On mobile:  fixed bottom-sheet (CSS handles this via @media); not draggable.
//
// Drag implementation:
//   - Drag handle strip at top of panel (above content, grip dots indicator)
//   - setPointerCapture so drag tracks outside the panel boundary
//   - Viewport-constrained: at least 48px of the panel must stay on-screen
//   - Position resets to hotspot each time a popover opens (no stale drag state)
//
// Accessibility:
//   - Opens with focus on the × close button (first interactive child)
//   - Tab/Shift+Tab trapped inside the dialog while open
//   - Escape closes and returns focus to the triggering hotspot
//   - aria-label updates to the entry's label on each open
//   - Drag handle has aria-hidden (purely presentational)

import type { PopoverMap } from '../types/content.ts';
import { requireEl, buildContentNode } from './dom.ts';
import {
    BREAKPOINT_MOBILE,
    POPOVER_WIDTH, POPOVER_MARGIN_MIN, POPOVER_OFFSET_Y,
    POPOVER_EST_HEIGHT_WITH_IMG, POPOVER_EST_HEIGHT_WITHOUT_IMG, DRAG_MIN_VISIBLE,
    ID_OVERLAY, ID_POPOVER,
    CLS_ACTIVE, CLS_VISIBLE, CLS_OPEN, CLS_POPOVER_OPEN, CLS_HOVERED,
    CLS_ANNOTATION_SUPPRESSED, CLS_IS_DRAGGING,
    SEL_HOTSPOT,
} from './constants.ts';

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
    'button:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
].join(', ');

function getFocusableEls(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SEL));
}

let trapHandler: ((e: KeyboardEvent) => void) | null = null;

function enableFocusTrap(container: HTMLElement): void {
    trapHandler = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const els = getFocusableEls(container);
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    };
    container.addEventListener('keydown', trapHandler);
}

function disableFocusTrap(container: HTMLElement): void {
    if (trapHandler) {
        container.removeEventListener('keydown', trapHandler);
        trapHandler = null;
    }
}

// ── Drag ──────────────────────────────────────────────────────────────────────

function makeDraggable(popoverEl: HTMLElement): void {
    let isDragging = false;
    let startPtrX = 0;
    let startPtrY = 0;
    let startElLeft = 0;
    let startElTop = 0;

    popoverEl.addEventListener('pointerdown', (e: PointerEvent) => {
        const target = e.target as HTMLElement;
        // Only drag from the handle strip — not from the close button inside it
        // (close button is a child of .popover-handle so closest() would match it)
        if (!target.closest('.popover-handle')) return;
        if (target.closest('button')) return;
        // Bottom-sheet mode on mobile — no drag
        if (window.innerWidth <= BREAKPOINT_MOBILE) return;

        isDragging = true;
        startPtrX = e.clientX;
        startPtrY = e.clientY;
        startElLeft = parseFloat(popoverEl.style.left) || 0;
        startElTop = parseFloat(popoverEl.style.top) || 0;

        popoverEl.classList.add(CLS_IS_DRAGGING);
        popoverEl.setPointerCapture(e.pointerId);
        e.preventDefault(); // prevent text selection during drag
    });

    popoverEl.addEventListener('pointermove', (e: PointerEvent) => {
        if (!isDragging) return;

        const dx = e.clientX - startPtrX;
        const dy = e.clientY - startPtrY;

        let newLeft = startElLeft + dx;
        let newTop = startElTop + dy;

        // Constrain to viewport (document coordinates; page is vertical-only scroll)
        const W = popoverEl.offsetWidth;
        const H = popoverEl.offsetHeight;

        newLeft = Math.max(
            POPOVER_MARGIN_MIN,
            Math.min(newLeft, window.innerWidth - DRAG_MIN_VISIBLE),
        );
        newTop = Math.max(
            window.scrollY + POPOVER_MARGIN_MIN,
            Math.min(newTop, window.scrollY + window.innerHeight - DRAG_MIN_VISIBLE),
        );
        // Also prevent dragging too far right (panel body must stay visible)
        if (newLeft + DRAG_MIN_VISIBLE > window.innerWidth) {
            newLeft = window.innerWidth - DRAG_MIN_VISIBLE;
        }

        popoverEl.style.left = newLeft + 'px';
        popoverEl.style.top = newTop + 'px';
    });

    const stopDrag = (e: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        popoverEl.classList.remove(CLS_IS_DRAGGING);
        popoverEl.releasePointerCapture(e.pointerId);
    };

    popoverEl.addEventListener('pointerup', stopDrag);
    popoverEl.addEventListener('pointercancel', stopDrag);
}

let activeHotspot: HTMLElement | null = null;
let popovers: PopoverMap = {};

// ── Helpers ────────────────────────────────────────────────────────────────────

function injectPopoverChrome(popoverEl: HTMLElement, label: string): HTMLButtonElement {
    popoverEl.setAttribute('aria-label', label);

    const handle = document.createElement('div');
    handle.className = 'popover-handle';
    handle.setAttribute('aria-hidden', 'true');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'popover-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => closePopover());

    popoverEl.prepend(closeBtn);
    popoverEl.prepend(handle);
    return closeBtn;
}

function calculatePopoverPosition(hotspot: HTMLElement, hasImg: boolean): { top: string; left: string } {
    if (window.innerWidth <= BREAKPOINT_MOBILE) return { top: '', left: '' };

    const rect = hotspot.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = rect.bottom + scrollY + POPOVER_OFFSET_Y;
    let left = rect.left + scrollX + rect.width / 2 - POPOVER_WIDTH / 2;

    if (left < POPOVER_MARGIN_MIN) left = POPOVER_MARGIN_MIN;
    if (left + POPOVER_WIDTH > window.innerWidth) {
        left = window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN_MIN;
    }

    const estimatedHeight = hasImg ? POPOVER_EST_HEIGHT_WITH_IMG : POPOVER_EST_HEIGHT_WITHOUT_IMG;
    if (rect.bottom + estimatedHeight > window.innerHeight) {
        top = rect.top + scrollY - estimatedHeight - POPOVER_OFFSET_Y;
        if (top < scrollY + POPOVER_MARGIN_MIN) {
            top = rect.bottom + scrollY + POPOVER_OFFSET_Y;
        }
    }

    return { top: top + 'px', left: left + 'px' };
}

function toggleHotspotState(el: HTMLElement, isHovered: boolean): void {
    if (isHovered) el.classList.add(CLS_HOVERED);
    else el.classList.remove(CLS_HOVERED);
}

// ── Core open/close ────────────────────────────────────────────────────────────

function openPopover(hotspot: HTMLElement): void {
    const overlay = requireEl(ID_OVERLAY, 'PopoverEngine');
    const popoverEl = requireEl(ID_POPOVER, 'PopoverEngine');

    const key = hotspot.dataset.popover;
    if (!key || !popovers[key]) return;
    const data = popovers[key];

    closePopover({ returnFocus: false });

    activeHotspot = hotspot;
    hotspot.classList.add(CLS_ACTIVE);
    hotspot.setAttribute('aria-expanded', 'true');
    suppressAnnotation(key);

    popoverEl.replaceChildren(buildContentNode(data, 'popover', { wrapBody: true }));
    const closeBtn = injectPopoverChrome(popoverEl, data.label);

    const pos = calculatePopoverPosition(hotspot, !!data.img);
    popoverEl.style.top = pos.top;
    popoverEl.style.left = pos.left;

    overlay.classList.add(CLS_OPEN);
    if (window.innerWidth <= BREAKPOINT_MOBILE) {
        document.body.classList.add(CLS_POPOVER_OPEN);
    }

    requestAnimationFrame(() => {
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

    const overlay = requireEl(ID_OVERLAY, 'PopoverEngine');
    const popoverEl = requireEl(ID_POPOVER, 'PopoverEngine');

    disableFocusTrap(popoverEl);
    popoverEl.classList.remove(CLS_VISIBLE);
    overlay.classList.remove(CLS_OPEN);
    document.body.classList.remove(CLS_POPOVER_OPEN);

    if (activeHotspot) {
        activeHotspot.classList.remove(CLS_ACTIVE);
        activeHotspot.setAttribute('aria-expanded', 'false');
        const returnEl = activeHotspot;
        const returnKey = activeHotspot.dataset.popover ?? '';
        activeHotspot = null;
        restoreAnnotation(returnKey);
        if (returnFocus) {
            requestAnimationFrame(() => returnEl.focus());
        }
    }
}

// ── Event binding ─────────────────────────────────────────────────────────────

export function initPopoverEngine(popoverData: PopoverMap): void {
    popovers = popoverData;

    const overlay = requireEl(ID_OVERLAY, 'PopoverEngine');
    const popoverEl = requireEl(ID_POPOVER, 'PopoverEngine');

    // Wire up drag — once, persistent across open/close cycles
    makeDraggable(popoverEl);

    document.querySelectorAll<HTMLElement>(SEL_HOTSPOT).forEach(el => {
        el.addEventListener('pointerenter', () => toggleHotspotState(el, true));
        el.addEventListener('pointerleave', () => toggleHotspotState(el, false));
        el.addEventListener('focus', () => toggleHotspotState(el, true));
        el.addEventListener('blur', () => toggleHotspotState(el, false));

        const trigger = (e: Event) => {
            e.stopPropagation();
            if (activeHotspot === el) closePopover();
            else openPopover(el);
        };

        el.addEventListener('click', trigger);
        el.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trigger(e);
            }
        });
    });

    overlay.addEventListener('click', () => closePopover());

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') closePopover();
    });
}
