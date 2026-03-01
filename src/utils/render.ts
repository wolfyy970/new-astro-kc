import { SEL_HOTSPOT, ID_POPOVER } from '../scripts/constants.ts';

// SEL_HOTSPOT is '.hotspot' — strip the leading dot for the class attribute value.
const HOTSPOT_CLASS = SEL_HOTSPOT.replace(/^\./, '');

/**
 * Helper: convert <hotspot key="x">text</hotspot> in JSON strings to real HTML spans.
 * The class name and aria-controls ID are derived from constants so a rename propagates
 * automatically.
 */
export function renderHotspots(text: string): string {
  return text.replace(
    /<hotspot key="([^"]+)">([^<]+)<\/hotspot>/g,
    `<span class="${HOTSPOT_CLASS}" data-popover="$1" tabindex="0" role="button" aria-expanded="false" aria-controls="${ID_POPOVER}">$2</span>`,
  );
}
