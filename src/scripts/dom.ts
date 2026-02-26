// ── Shared DOM Utilities ──────────────────────────────────────────────────────
// Single-definition helpers used across all three interactive engines.
// Centralises DOM access patterns, window global validation, and HTML assembly.

import type { PopoverData } from '../types/content.ts';

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
        __ANNOTATIONS__?: import('../types/content.ts').ScrollAnnotation[];
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
 *   truncateText  — clip body text to the first 2 sentences (for annotations)
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

    const text = truncateText
        ? data.text.split('. ').slice(0, 2).join('. ') + '.'
        : data.text;

    if (prependRule) {
        const rule = document.createElement('div');
        rule.className = `${prefix}-rule`;
        fragment.appendChild(rule);
    }

    if (data.img) {
        const img = document.createElement('img');
        img.className = `${prefix}-img`;
        img.src = data.img;
        img.alt = data.label;
        fragment.appendChild(img);
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
