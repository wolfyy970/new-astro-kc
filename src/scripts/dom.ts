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

// ── Window global access ───────────────────────────────────────────────────────

/**
 * Reads a window global set by a <script define:vars> block.
 * Throws a diagnostic error if the global is absent, rather than silently
 * casting undefined through the type system.
 *
 * @param key     Property name on window (e.g. '__POPOVERS__')
 * @param context Name of the calling module
 */
export function requireGlobal<T>(key: string, context = 'Unknown'): T {
    const value = (window as unknown as Record<string, unknown>)[key];
    if (value === undefined) {
        throw new Error(
            `[${context}] window.${key} is not set. ` +
            `Check that <script define:vars> in index.astro runs before this module.`,
        );
    }
    return value as T;
}

// ── HTML builder ───────────────────────────────────────────────────────────────

/**
 * Builds an HTML string for a popover card or margin annotation from PopoverData.
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
export function buildContentHTML(
    data: PopoverData,
    prefix: string,
    options: { truncateText?: boolean; wrapBody?: boolean; prependRule?: boolean } = {},
): string {
    const { truncateText = false, wrapBody = false, prependRule = false } = options;

    const text = truncateText
        ? data.text.split('. ').slice(0, 2).join('. ') + '.'
        : data.text;

    let html = prependRule ? '<div class="' + prefix + '-rule"></div>' : '';

    if (data.img) {
        html += '<img class="' + prefix + '-img" src="' + data.img + '" alt="' + data.label + '">';
    }

    const fields =
        '<div class="' + prefix + '-label">' + data.label + '</div>' +
        (data.stat ? '<div class="' + prefix + '-stat">' + data.stat + '</div>' : '') +
        '<div class="' + prefix + '-text">' + text + '</div>' +
        (data.quote ? '<div class="' + prefix + '-quote">' + data.quote + '</div>' : '') +
        (data.link && data.linkText
            ? '<a class="' + prefix + '-link" href="' + data.link + '">' + data.linkText + '</a>'
            : '');

    html += wrapBody
        ? '<div class="' + prefix + '-body">' + fields + '</div>'
        : fields;

    return html;
}
