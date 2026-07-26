import { SEL_HOTSPOT, ID_POPOVER } from "../scripts/constants.ts";

// SEL_HOTSPOT is '.hotspot' — strip the leading dot for the class attribute value.
const HOTSPOT_CLASS = SEL_HOTSPOT.replace(/^\./, "");

const HOTSPOT_TAG = /<hotspot key="([^"]+)">([^<]+)<\/hotspot>/g;

/**
 * Creates a renderer that converts `<hotspot key="x">text</hotspot>` in JSON
 * strings to real HTML spans, numbering each one in the order it is rendered.
 *
 * The number is the whole affordance. An annotated term reads as a footnote
 * reference — a hairline rule and a superscript folio — so a reader can see
 * which parts of the document have more behind them without being told that
 * anything is clickable, and without that signal depending on hover, on colour
 * alone, or on a viewport wide enough for margins.
 *
 * Numbering has to be per-render, not module-level: the site is server-rendered
 * (`output: 'server'`), so a module-scoped counter would keep incrementing
 * across requests and the second visitor would start at 19.
 *
 * Call once per page render and use the returned function for every string, in
 * document order:
 *
 *   const render = createHotspotRenderer();
 *   render(resume.summary);         // → folios 1…n
 *   render(bullet);                 // → continues the sequence
 *
 * The superscript is `aria-hidden`: it is a visual wayfinding device, and a
 * screen reader announcing "Bolt design system 4" would be noise. The span's
 * `role="button"` and `aria-expanded` already carry the interaction.
 */
export function createHotspotRenderer(): (text: string) => string {
  let folio = 0;

  return function render(text: string): string {
    return text.replace(HOTSPOT_TAG, (_match, key: string, label: string) => {
      folio += 1;
      return (
        `<span class="${HOTSPOT_CLASS}" data-popover="${key}" data-folio="${folio}"` +
        ` tabindex="0" role="button" aria-expanded="false" aria-controls="${ID_POPOVER}">` +
        `${label}<sup class="hotspot-ref" aria-hidden="true">${folio}</sup></span>`
      );
    });
  };
}

/**
 * Single-shot convenience wrapper: renders one string with a fresh folio
 * sequence starting at 1. Use `createHotspotRenderer()` when numbering must run
 * continuously across many strings on one page.
 */
export function renderHotspots(text: string): string {
  return createHotspotRenderer()(text);
}
