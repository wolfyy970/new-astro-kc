import type { PopoverData, PopoverMap } from '../types/content';

/**
 * Feature Flags
 *
 * Controls which case study pages are linked from popovers and margin
 * annotations. Filtering happens server-side before data is serialised to
 * window.__POPOVERS__, so the client never receives disabled links.
 *
 * ── Environment variable ──────────────────────────────────────────────────────
 *
 *   CASE_STUDY_LINKS=truist,sparks-grove,upwave,two-way-tv
 *
 * Comma-separated list of case study slugs (the path segment after the leading
 * slash) whose popover link buttons should be visible. Omit the variable or
 * leave it empty to hide all case study links — useful while pages are still
 * being authored.
 *
 * Matching is case-insensitive and trims surrounding whitespace, so both
 * "Truist" and " truist " match the /truist page.
 *
 * ── Examples ─────────────────────────────────────────────────────────────────
 *
 *   # All links hidden (default when variable is absent)
 *   CASE_STUDY_LINKS=
 *
 *   # Only Truist is ready
 *   CASE_STUDY_LINKS=truist
 *
 *   # All current case studies enabled
 *   CASE_STUDY_LINKS=truist,sparks-grove,upwave,two-way-tv
 */

function parseEnabledSlugs(): Set<string> {
    const raw =
        (import.meta.env.CASE_STUDY_LINKS as string | undefined) ??
        process.env.CASE_STUDY_LINKS ??
        '';
    return new Set(
        raw
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
    );
}

/**
 * Returns true if the given popover link path points to an enabled case study.
 * Accepts absolute paths ("/truist") or bare slugs ("truist").
 */
export function isCaseStudyLinkEnabled(linkPath: string): boolean {
    const enabled = parseEnabledSlugs();
    if (enabled.size === 0) return false;
    const slug = linkPath.replace(/^\//, '').toLowerCase();
    return enabled.has(slug);
}

/**
 * Strips link/linkText from any popover entry whose case study page is not
 * in the CASE_STUDY_LINKS list. Returns a new map — never mutates the input.
 */
export function applyFeatureFlags(popovers: PopoverMap): PopoverMap {
    const result: PopoverMap = {};
    for (const [key, data] of Object.entries(popovers)) {
        if (data.link && !isCaseStudyLinkEnabled(data.link)) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { link, linkText, ...rest } = data;
            result[key] = rest as PopoverData;
        } else {
            result[key] = data;
        }
    }
    return result;
}
