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

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderCaseStudyMarker(): string {
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

      return (
        `<span class="${HOTSPOT_CLASS}" data-popover="${key}"` +
        ` tabindex="0" role="button" aria-label="${accessibleLabel}"` +
        ` aria-expanded="false" aria-controls="${ID_POPOVER}">` +
        `${label}${hasProject ? renderCaseStudyMarker() : ""}</span>`
      );
    });
  };
}

/**
 * Single-shot convenience wrapper. Pass destinations when project-aware
 * markers are needed; otherwise every hotspot is treated as marginalia-only.
 */
export function renderHotspots(
  text: string,
  destinations: HotspotDestinations = {},
): string {
  return createHotspotRenderer(destinations)(text);
}
