import { SEL_HOTSPOT, ID_POPOVER } from "../scripts/constants.ts";
import notesSvg from "@tabler/icons/outline/notes.svg?raw";

// SEL_HOTSPOT is '.hotspot' — strip the leading dot for the class attribute value.
const HOTSPOT_CLASS = SEL_HOTSPOT.replace(/^\./, "");

const HOTSPOT_TAG = /<hotspot key="([^"]+)">([^<]+)<\/hotspot>/g;

type HotspotDestinations = Record<
  string,
  { link?: string | undefined } | undefined
>;

const iconBody = (svg: string): string =>
  svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();

const CASE_STUDY_ICON = iconBody(notesSvg);

// ── Marker variance ──────────────────────────────────────────────────────────
// Every marked term carries one of six hand-tuned stroke shapes (tilt, corner
// geometry, ink pooling — see the ANNOTATED TERMS block in global.css). A real
// pen never draws the same stroke twice, but a document must not redraw itself
// between visits: the variant is a pure hash of the popover key, so each term's
// mark is unique against its neighbours yet stable across renders.
export const MARK_VARIANT_COUNT = 6;

export function markVariant(key: string): number {
  // djb2-xor — tiny, deterministic, good spread on short keys.
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = (h * 33) ^ key.charCodeAt(i);
  }
  return ((h >>> 0) % MARK_VARIANT_COUNT) + 1;
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Exported for the margin engine's intro specimen: the cold-start note
// demonstrates the green pen with the real apparatus, not a lookalike.
export function renderCaseStudyMarker(): string {
  return (
    `<sup class="hotspot-ref" data-hint="Case study" aria-hidden="true">` +
    `<svg class="hotspot-ref-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"` +
    ` stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">` +
    `${CASE_STUDY_ICON}</svg></sup>`
  );
}

/**
 * Creates a renderer that converts `<hotspot key="x">text</hotspot>` in JSON
 * strings to interactive HTML spans.
 *
 * Every annotated term has a quiet underline, which is enough to signal that
 * marginalia exists. A superscript Tabler Notes icon appears only when it adds
 * new information: a deeper case study is available. Its meaning is repeated
 * in the hover/focus hint and in the control's accessible name.
 *
 * Call once per page render with the feature-flagged popover map so the icon
 * reflects the destinations actually available in that environment.
 */
export function createHotspotRenderer(
  destinations: HotspotDestinations = {},
): (text: string) => string {
  return function render(text: string): string {
    return text.replace(HOTSPOT_TAG, (_match, key: string, label: string) => {
      const hasProject = Boolean(destinations[key]?.link);
      const interaction = hasProject ? "Case study available" : "Marginalia";
      const accessibleLabel = escapeAttribute(`${label}. ${interaction}.`);

      // Ink family (yellow note / green project) + stroke shape variant.
      // Colour is decorative here — the same distinction reaches assistive
      // tech through the aria-label above.
      const classes = [
        HOTSPOT_CLASS,
        `hs-mark-${markVariant(key)}`,
        ...(hasProject ? ["hs-project"] : []),
      ].join(" ");

      // The stroke lives on an inner span so the ink covers the letters only —
      // a real marker stops at the words; the superscript icon stays clean.
      return (
        `<span class="${classes}" data-popover="${key}"` +
        ` tabindex="0" role="button" aria-label="${accessibleLabel}"` +
        ` aria-expanded="false" aria-controls="${ID_POPOVER}">` +
        `<span class="hs-stroke">${label}</span>` +
        `${hasProject ? renderCaseStudyMarker() : ""}</span>`
      );
    });
  };
}
