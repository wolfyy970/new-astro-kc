// ── Color Utilities ───────────────────────────────────────────────────────────
// Server-side helpers for working with CSS hex colors.
// Used by CaseStudyLayout to derive CSS custom properties from a brand accent.

const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

/** The portfolio's global accent, used as the fallback when no valid brand
 *  accent is supplied. */
export const DEFAULT_ACCENT = "#70541C";

/** Parses six hex digits (no leading `#`) into an `[r, g, b]` triplet. */
function hex6ToRgb(hex6: string): [number, number, number] {
  return [
    parseInt(hex6.slice(0, 2), 16),
    parseInt(hex6.slice(2, 4), 16),
    parseInt(hex6.slice(4, 6), 16),
  ];
}

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
  fallback = DEFAULT_ACCENT,
): string {
  if (hex && HEX6_RE.test(hex)) return hex;
  // Warn-and-degrade: a malformed accent is a content error worth surfacing at
  // build time (a missing accent is legitimate and stays silent). Matches the
  // render-time degrade policy in images.ts.
  if (hex !== undefined && hex !== null) {
    console.warn(
      `[color] Invalid accent color "${hex}" — falling back to "${fallback}".`,
    );
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
  const [r, g, b] = hex6ToRgb(hex.slice(1));
  return `${r}, ${g}, ${b}`;
}

/**
 * Determines whether a color is "dark" based on the standard luminance formula.
 *
 * @param color      Candidate color string (hex or gradient)
 * @param threshold  Luminance threshold (0-255). Defaults to 128.
 */
export function isHexColorDark(
  color: string | null | undefined,
  threshold = 128,
): boolean {
  if (!color) return false;
  const clean = color.trim().toLowerCase();

  // Gradients are treated as dark by default
  if (clean.includes("gradient")) {
    return true;
  }

  if (clean.startsWith("#")) {
    const hex = clean.slice(1);
    // Expand shorthand (#rgb → #rrggbb) so both forms share one parse path.
    const hex6 =
      hex.length === 3
        ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
        : hex.length === 6
          ? hex
          : null;
    if (hex6) {
      const [r, g, b] = hex6ToRgb(hex6);
      const luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return luminance < threshold;
    }
  }

  return false;
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

  // Check if the accent color has low contrast on dark backgrounds (luminance < 130)
  const isDark = isHexColorDark(color, 130);
  const contrast = isDark ? "#FFFFFF" : color;

  return `--accent: ${color}; --accent-rgb: ${rgb}; --accent-border: rgba(${rgb}, 0.2); --accent-contrast: ${contrast};`;
}
