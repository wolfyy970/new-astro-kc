/**
 * Helper: convert <hotspot key="x">text</hotspot> in JSON strings to real HTML spans
 */
export function renderHotspots(text: string): string {
  return text.replace(
    /<hotspot key="([^"]+)">([^<]+)<\/hotspot>/g,
    '<span class="hotspot" data-popover="$1" tabindex="0" role="button" aria-expanded="false" aria-controls="popover">$2</span>'
  );
}
