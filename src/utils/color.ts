// ── Color Utilities ───────────────────────────────────────────────────────────
// Server-side helpers for working with CSS hex colors.
// Used by CaseStudyLayout to derive CSS custom properties from a brand accent.

const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Validates a 6-digit hex color string and returns it, or the fallback if
 * the value is absent or malformed.
 *
 * Accepts only the full `#rrggbb` form — no shorthand `#rgb` — so callers
 * always get a predictable string length for subsequent parsing.
 *
 * @param hex      Candidate color (e.g. `"#3b1a5a"`)
 * @param fallback Returned when `hex` is missing or invalid. Defaults to the
 *                 portfolio's global accent `#70541C`.
 */
export function resolveHexColor(
    hex: string | null | undefined,
    fallback = '#70541C',
): string {
    if (hex && HEX6_RE.test(hex)) return hex;
    if (import.meta.env?.DEV && hex !== undefined && hex !== null) {
        console.warn(`[color] Invalid accent color "${hex}" — falling back to "${fallback}".`);
    }
    return fallback;
}

/**
 * Converts a validated 6-digit hex color to a CSS `r, g, b` triplet string
 * suitable for use in `rgba()` or as the value of `--accent-rgb`.
 *
 * @param hex  A valid `#rrggbb` hex string (run through resolveHexColor first).
 */
export function hexToRgbString(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

/**
 * Returns all three CSS custom property declarations needed for a brand accent:
 * `--accent`, `--accent-rgb`, and `--accent-border`.
 *
 * Intended for use as an inline `style` attribute on a container element so
 * the values cascade to all descendants and cannot be overridden by any
 * stylesheet bundle.
 *
 * @param hex  Raw accent value from the page (may be invalid or undefined).
 */
export function buildAccentStyle(hex: string | null | undefined): string {
    const color = resolveHexColor(hex);
    const rgb = hexToRgbString(color);
    return `--accent: ${color}; --accent-rgb: ${rgb}; --accent-border: rgba(${rgb}, 0.2);`;
}
