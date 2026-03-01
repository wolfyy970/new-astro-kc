// ── Shared DOM Utilities ──────────────────────────────────────────────────────
// Single-definition helpers used across all three interactive engines.
// Centralises DOM access patterns, window global validation, and HTML assembly.

import type { PopoverData } from '../types/content.ts';
import { ANNOTATION_TEXT_SENTENCES, VIDEO_EXTENSIONS } from './constants.ts';

// ── Element access ─────────────────────────────────────────────────────────────

/**
 * Gets an element by ID and throws a descriptive error if not found.
 * Use instead of getElementById for any element the engine requires to exist.
 *
 * @param id      DOM element ID (without '#')
 * @param context Name of the calling module, included in the error message
 */
export function requireEl(id: string, context = 'Unknown'): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`[${context}] Required element #${id} not found in DOM`);
    return el;
}

declare global {
    interface Window {
        __POPOVERS__?: import('../types/content.ts').PopoverMap;
    }
}

/**
 * Reads a window global set by a <script define:vars> block.
 * Throws a diagnostic error if the global is absent, rather than silently
 * casting undefined through the type system.
 *
 * @param key     Property name on window (e.g. '__POPOVERS__')
 * @param context Name of the calling module
 */
export function requireGlobal<K extends keyof Window>(key: K, context = 'Unknown'): NonNullable<Window[K]> {
    const value = window[key];
    if (value === undefined) {
        throw new Error(
            `[${context}] window.${key} is not set. ` +
            `Check that <script define:vars> in index.astro runs before this module.`,
        );
    }
    return value as NonNullable<Window[K]>;
}

// ── HTML builder ───────────────────────────────────────────────────────────────

/**
 * Builds a DocumentFragment containing DOM elements for a popover card or margin annotation.
 * Both surfaces use the same data shape but differ in class prefix, text length,
 * structural wrapper, and leading rule element.
 *
 * @param data         The popover entry (from popovers.json)
 * @param prefix       CSS class prefix: 'popover' | 'sa'
 * @param options
 *   truncateText  — clip body text to ANNOTATION_TEXT_SENTENCES sentences (for annotations)
 *   wrapBody      — wrap content fields in <div class="{prefix}-body"> (for popovers)
 *   prependRule   — prepend <div class="{prefix}-rule"></div> (for annotations)
 */
export function buildContentNode(
    data: PopoverData,
    prefix: string,
    options: { truncateText?: boolean; wrapBody?: boolean; prependRule?: boolean } = {},
): DocumentFragment {
    const { truncateText = false, wrapBody = false, prependRule = false } = options;
    const fragment = document.createDocumentFragment();

    let text = data.text;
    if (truncateText) {
        // Split on sentence boundaries only: period NOT preceded by an uppercase letter
        // (avoids splitting on abbreviations like U.S., No., Inc.) and followed by a
        // capital letter (the start of a new sentence).
        const sentences = data.text.split(/(?<![A-Z])\.\s+(?=[A-Z])/);
        if (sentences.length > ANNOTATION_TEXT_SENTENCES) {
            text = sentences.slice(0, ANNOTATION_TEXT_SENTENCES).join('. ');
            if (!text.endsWith('.')) {
                text += '.';
            }
        }
    }

    if (prependRule) {
        const rule = document.createElement('div');
        rule.className = `${prefix}-rule`;
        fragment.appendChild(rule);
    }

    const createMediaElement = (src: string, isCarouselItem = false, autoPlay = true) => {
        const isVideo = VIDEO_EXTENSIONS.some(ext => src.toLowerCase().endsWith(ext));
        const mediaEl = document.createElement(isVideo ? 'video' : 'img');
        const baseClass = isVideo ? `${prefix}-vid` : `${prefix}-img`;
        mediaEl.className = isCarouselItem ? `${baseClass} ${prefix}-carousel-item` : baseClass;

        if (isVideo) {
            const vid = mediaEl as HTMLVideoElement;
            vid.src = src;
            vid.autoplay = autoPlay;
            vid.loop = true;
            vid.muted = true;
            vid.playsInline = true;
            vid.setAttribute('aria-label', data.label);
            vid.setAttribute('title', data.label);
            vid.setAttribute('role', 'img');

            if (!autoPlay) {
                const wrap = document.createElement('div');
                wrap.className = `${prefix}-vid-wrap`;
                if (isCarouselItem) {
                    wrap.classList.add(`${prefix}-carousel-item`);
                    vid.classList.remove(`${prefix}-carousel-item`);
                }

                const playBtn = document.createElement('button');
                playBtn.type = 'button';
                playBtn.className = `${prefix}-play-btn`;
                playBtn.setAttribute('aria-label', 'Play video');
                playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';

                const togglePlay = () => {
                    if (vid.paused) { vid.play(); } else { vid.pause(); }
                };
                vid.addEventListener('click', togglePlay);
                vid.style.cursor = 'pointer';
                playBtn.addEventListener('click', togglePlay);

                vid.addEventListener('play', () => playBtn.classList.add('playing'));
                vid.addEventListener('pause', () => playBtn.classList.remove('playing'));

                wrap.appendChild(vid);
                wrap.appendChild(playBtn);
                return wrap;
            }
        } else {
            const imgEl = mediaEl as HTMLImageElement;
            imgEl.src = src;
            imgEl.alt = data.label;
        }
        return mediaEl;
    };

    const mediaList = data.media && data.media.length > 0 ? data.media : (data.img ? [data.img] : []);

    if (mediaList.length === 1) {
        fragment.appendChild(createMediaElement(mediaList[0], false, false));
    } else if (mediaList.length > 1) {
        const wrap = document.createElement('div');
        wrap.className = `${prefix}-carousel-wrap`;

        const inner = document.createElement('div');
        inner.className = `${prefix}-carousel-inner`;
        wrap.appendChild(inner);

        const carousel = document.createElement('div');
        carousel.className = `${prefix}-carousel`;
        inner.appendChild(carousel);

        mediaList.forEach((src, i) => {
            const slide = document.createElement('div');
            slide.className = `${prefix}-carousel-slide`;
            slide.appendChild(createMediaElement(src, true, i !== 0));
            carousel.appendChild(slide);
        });

        // Track current index explicitly — avoids depending on offsetWidth at build time
        let currentIdx = 0;

        const goToSlide = (idx: number) => {
            const clamped = Math.max(0, Math.min(mediaList.length - 1, idx));
            const targetSlide = carousel.children[clamped] as HTMLElement;
            if (targetSlide) {
                carousel.scrollTo({ left: targetSlide.offsetLeft, behavior: 'smooth' });
            }
            currentIdx = clamped;
            syncNavState();
        };

        const syncNavState = () => {
            btnPrev.style.opacity = currentIdx === 0 ? '0' : '1';
            btnPrev.style.pointerEvents = currentIdx === 0 ? 'none' : 'auto';
            btnNext.style.opacity = currentIdx === mediaList.length - 1 ? '0' : '1';
            btnNext.style.pointerEvents = currentIdx === mediaList.length - 1 ? 'none' : 'auto';
            const dotsArray = dotsList.children;
            for (let j = 0; j < dotsArray.length; j++) {
                if (j === currentIdx) dotsArray[j].classList.add('active');
                else dotsArray[j].classList.remove('active');
            }
        };

        // Add chevrons
        const createNavButton = (dir: 'prev' | 'next') => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `${prefix}-carousel-nav ${dir}`;
            btn.setAttribute('aria-label', dir === 'prev' ? 'Previous slide' : 'Next slide');
            btn.innerHTML = dir === 'prev'
                ? '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>'
                : '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
            btn.addEventListener('click', () => {
                goToSlide(dir === 'prev' ? currentIdx - 1 : currentIdx + 1);
            });
            return btn;
        };

        const btnPrev = createNavButton('prev');
        const btnNext = createNavButton('next');
        inner.appendChild(btnPrev);
        inner.appendChild(btnNext);

        // Add elegant pagination dots
        const dotsList = document.createElement('div');
        dotsList.className = `${prefix}-carousel-dots`;
        mediaList.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `${prefix}-carousel-dot` + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => goToSlide(i));
            dotsList.appendChild(dot);
        });
        wrap.appendChild(dotsList);

        // Scroll spy — re-syncs state after native swipe/scroll
        const updateNav = () => {
            if (carousel.offsetWidth) {
                currentIdx = Math.round(carousel.scrollLeft / carousel.offsetWidth);
            }
            syncNavState();
        };

        carousel.addEventListener('scroll', updateNav, { passive: true });

        // Set initial state synchronously — carousel starts at index 0,
        // so prev is always hidden and next is always visible on build.
        syncNavState();

        fragment.appendChild(wrap);
    }

    const bodyContainer = wrapBody ? document.createElement('div') : fragment;
    if (wrapBody) {
        (bodyContainer as HTMLElement).className = `${prefix}-body`;
    }

    const appendField = (tag: string, className: string, content: string, href?: string) => {
        const el = document.createElement(tag);
        el.className = className;
        el.textContent = content; // Safely escapes HTML
        if (href && tag === 'a') {
            (el as HTMLAnchorElement).href = href;
        }
        bodyContainer.appendChild(el);
    };

    appendField('div', `${prefix}-label`, data.label);
    if (data.stat) appendField('div', `${prefix}-stat`, data.stat);
    appendField('div', `${prefix}-text`, text);
    if (data.quote) appendField('div', `${prefix}-quote`, data.quote);
    if (data.link && data.linkText) {
        appendField('a', `${prefix}-link`, data.linkText, data.link);
    }

    if (wrapBody) {
        fragment.appendChild(bodyContainer as HTMLElement);
    }

    return fragment;
}
