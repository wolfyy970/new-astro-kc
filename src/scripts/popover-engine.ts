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
    POPOVER_WIDTH, POPOVER_MARGIN_MIN, POPOVER_OFFSET_Y, POPOVER_MAX_HEIGHT_VH, DRAG_MIN_VISIBLE,
    SWIPE_DISMISS_THRESHOLD, SWIPE_DISMISS_VELOCITY,
    ID_OVERLAY, ID_POPOVER,
    CLS_ACTIVE, CLS_VISIBLE, CLS_OPEN, CLS_POPOVER_OPEN, CLS_HOVERED,
    CLS_ANNOTATION_SUPPRESSED, CLS_IS_DRAGGING,
    SEL_HOTSPOT,
} from './constants.ts';

// CSS custom property used to animate the bottom-sheet during swipe-to-dismiss.
// The mobile transform rules reference this variable so JS can drive the offset
// without fighting the `!important` declarations directly.
const CSS_PROP_SHEET_OFFSET = '--sheet-drag-offset';
import { isMobileScreen } from '../utils/viewport.ts';

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
        if (isMobileScreen()) return;

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

// ── Mobile swipe-to-dismiss ───────────────────────────────────────────────────
// Attach once on the popover element. Engages only when isMobileScreen() is
// true and the user drags downward from the top of the sheet (respects content
// scroll — only fires when scrollTop === 0 so normal scrolling isn't captured).

function makeMobileSwipeable(popoverEl: HTMLElement): void {
    let touchStartY = 0;
    let touchCurrentY = 0;
    let touchStartTime = 0;
    let isSwiping = false;

    popoverEl.addEventListener('touchstart', (e: TouchEvent) => {
        if (!isMobileScreen()) return;
        touchStartY = e.touches[0].clientY;
        touchCurrentY = touchStartY;
        touchStartTime = Date.now();
        isSwiping = false;
    }, { passive: true });

    popoverEl.addEventListener('touchmove', (e: TouchEvent) => {
        if (!isMobileScreen()) return;
        touchCurrentY = e.touches[0].clientY;
        const delta = touchCurrentY - touchStartY;

        // Only initiate dismiss gesture when dragging downward from the scroll top.
        // This ensures normal content scrolling inside the sheet is never hijacked.
        if (delta <= 0 || popoverEl.scrollTop > 0) {
            if (isSwiping) {
                // User scrolled back up mid-gesture — cancel
                isSwiping = false;
                popoverEl.classList.remove(CLS_IS_DRAGGING);
                popoverEl.style.removeProperty(CSS_PROP_SHEET_OFFSET);
            }
            return;
        }

        isSwiping = true;
        popoverEl.classList.add(CLS_IS_DRAGGING); // disables CSS transition while dragging

        // Slight resistance gives a rubber-band feel and signals the pull direction
        const offset = delta * 0.65;
        popoverEl.style.setProperty(CSS_PROP_SHEET_OFFSET, `${offset}px`);
    }, { passive: true });

    const endSwipe = () => {
        if (!isMobileScreen() || !isSwiping) return;
        isSwiping = false;
        popoverEl.classList.remove(CLS_IS_DRAGGING); // re-enable CSS transitions

        const delta = touchCurrentY - touchStartY;
        const elapsed = Math.max(1, Date.now() - touchStartTime); // guard /0
        const velocity = delta / elapsed; // px/ms

        if (delta > SWIPE_DISMISS_THRESHOLD || velocity > SWIPE_DISMISS_VELOCITY) {
            // Animate the sheet down off-screen, then clean up
            popoverEl.style.setProperty(CSS_PROP_SHEET_OFFSET, '100vh');
            setTimeout(() => closePopover(), 300);
        } else {
            // Not far/fast enough — snap back to resting position
            popoverEl.style.setProperty(CSS_PROP_SHEET_OFFSET, '0px');
            setTimeout(() => popoverEl.style.removeProperty(CSS_PROP_SHEET_OFFSET), 350);
        }
    };

    popoverEl.addEventListener('touchend', endSwipe, { passive: true });
    popoverEl.addEventListener('touchcancel', endSwipe, { passive: true });
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

function calculatePopoverPosition(hotspot: HTMLElement): { top: string; left: string } {
    if (isMobileScreen()) return { top: '', left: '' };

    const rect = hotspot.getBoundingClientRect();
    const scrollY = window.scrollY;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: centred on the hotspot, clamped to viewport edges
    let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(POPOVER_MARGIN_MIN, Math.min(left, vw - POPOVER_WIDTH - POPOVER_MARGIN_MIN));

    // Vertical: the CSS guarantees max-height of POPOVER_MAX_HEIGHT_VH, so use that as the
    // worst-case height for the flip decision rather than fragile hardcoded estimates.
    const worstCaseHeight = vh * POPOVER_MAX_HEIGHT_VH;
    const spaceBelow = vh - rect.bottom - POPOVER_OFFSET_Y;

    let top: number;
    if (spaceBelow >= worstCaseHeight) {
        top = rect.bottom + scrollY + POPOVER_OFFSET_Y;
    } else {
        const topIfAbove = rect.top + scrollY - worstCaseHeight - POPOVER_OFFSET_Y;
        if (topIfAbove >= scrollY + POPOVER_MARGIN_MIN) {
            top = topIfAbove;
        } else {
            // Neither side has full room — default below; post-render clamp handles the rest
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

    const pos = calculatePopoverPosition(hotspot);
    popoverEl.style.top = pos.top;
    popoverEl.style.left = pos.left;

    overlay.classList.add(CLS_OPEN);
    if (isMobileScreen()) {
        document.body.classList.add(CLS_POPOVER_OPEN);
    }

    requestAnimationFrame(() => {
        // Post-render clamp: measure the actual rendered height and ensure the bottom
        // of the popover stays within the viewport. This catches cases where the initial
        // position estimate placed it too low (e.g. tall carousels).
        if (!isMobileScreen()) {
            const actualHeight = popoverEl.offsetHeight;
            const popoverTop = parseFloat(popoverEl.style.top);
            const viewportBottom = window.scrollY + window.innerHeight - POPOVER_MARGIN_MIN;

            if (popoverTop + actualHeight > viewportBottom) {
                const hotspotRect = hotspot.getBoundingClientRect();
                const topIfAbove = hotspotRect.top + window.scrollY - actualHeight - POPOVER_OFFSET_Y;

                if (topIfAbove >= window.scrollY + POPOVER_MARGIN_MIN) {
                    popoverEl.style.top = topIfAbove + 'px';
                } else {
                    // Neither side fits fully — align the bottom to the viewport bottom
                    popoverEl.style.top = Math.max(
                        window.scrollY + POPOVER_MARGIN_MIN,
                        viewportBottom - actualHeight,
                    ) + 'px';
                }
            }
        }

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
    popoverEl.style.removeProperty(CSS_PROP_SHEET_OFFSET); // clean up any swipe-dismiss offset
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

    // Wire up interactions — once, persistent across open/close cycles
    makeDraggable(popoverEl);
    makeMobileSwipeable(popoverEl);

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
