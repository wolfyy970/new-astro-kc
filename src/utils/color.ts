// ── Color Utilities ───────────────────────────────────────────────────────────
// Server-side helpers for working with CSS hex colors.
// Used by CaseStudyLayout to derive CSS custom properties from a brand accent.

const HEX6_RE = /^#[0-9a-fA-F]{6}$/;

/** Fallback when a page supplies no valid brand accent.
 *
 *  Ink, not a colour. There is no "portfolio accent" — the résumé is
 *  achromatic and `--accent` only ever means "the colour of the company this
 *  page is about." A page that names no company has nothing to identify, so
 *  the token resolves to the ink and disappears, exactly as it does on the
 *  résumé. This was `#70541C`, an amber left over from the warm palette. */
export const DEFAULT_ACCENT = "#000000";

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
 * @param fallback Returned when `hex` is missing or invalid. Defaults to
 *                 `DEFAULT_ACCENT` (the ink).
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

/** WCAG relative luminance for an `[r, g, b]` triplet (0-255). */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast ratio between two `[r, g, b]` triplets. */
function contrastRatio(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: [number, number, number] = [255, 255, 255];

/**
 * Returns the brand color darkened just far enough to carry text on light
 * stock, preserving its hue.
 *
 * A case study is its client's environment, so labels and outcome numerals are
 * set in that client's color. But a brand hex is chosen for logos and fields,
 * not for 11px type: Upwave's orange lands at 2.98:1 on a light section and
 * Felix's cyan at 2.05:1, both well under AA. `--accent-contrast` already
 * solves the mirror case (a dark brand on dark stock); this solves the one
 * that was missing.
 *
 * Mixes toward black in 4% steps and stops at the first value that clears the
 * target, so a brand already dark enough — Truist, Delta, Two Way TV — is
 * returned untouched and only the light brands move.
 *
 * @param hex     A valid `#rrggbb` brand color.
 * @param target  Minimum contrast against white. Defaults to 4.9 rather than
 *                AA's 4.5: the surface this ink actually lands on is a 5% tint
 *                of the brand, not pure white, and the headroom covers that
 *                difference for every brand in the set.
 */
export function accentInk(hex: string, target = 4.9): string {
  const base = hex6ToRgb(hex.slice(1));
  for (let keep = 1; keep >= 0; keep -= 0.04) {
    const mixed = base.map((v) => Math.round(v * keep)) as [
      number,
      number,
      number,
    ];
    if (contrastRatio(mixed, WHITE) >= target) {
      return `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    }
  }
  return "#000000";
}

/**
 * Returns the CSS custom property declarations needed for a brand accent:
 * `--accent`, `--accent-rgb`, `--accent-contrast`, and `--accent-ink`.
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
  const ink = accentInk(color);

  return `--accent: ${color}; --accent-rgb: ${rgb}; --accent-contrast: ${contrast}; --accent-ink: ${ink};`;
}
