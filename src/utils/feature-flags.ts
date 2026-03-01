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
 *   CASE_STUDY_LINKS=true|false|<comma-separated slugs>
 *
 * Three modes:
 *   true   — all case study links are shown, regardless of slug names
 *   false  — all case study links are hidden (same as omitting the variable)
 *   <list> — only the named slugs are shown (path segment after the leading slash)
 *
 * Matching is case-insensitive and trims surrounding whitespace, so both
 * "Truist" and " truist " match the /truist page.
 *
 * ── Examples ─────────────────────────────────────────────────────────────────
 *
 *   # All links hidden (default when variable is absent or empty)
 *   CASE_STUDY_LINKS=
 *
 *   # All links shown — useful in local dev
 *   CASE_STUDY_LINKS=true
 *
 *   # Only Truist is ready
 *   CASE_STUDY_LINKS=truist
 *
 *   # Explicit named set
 *   CASE_STUDY_LINKS=truist,sparks-grove,upwave,two-way-tv
 */

// null signals "all enabled" (CASE_STUDY_LINKS=true); an empty Set means "none".
function parseEnabledSlugs(): Set<string> | null {
    const raw =
        (import.meta.env.CASE_STUDY_LINKS as string | undefined) ??
        process.env.CASE_STUDY_LINKS ??
        '';
    if (raw.trim().toLowerCase() === 'true') return null;
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
    if (enabled === null) return true; // CASE_STUDY_LINKS=true — all enabled
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
