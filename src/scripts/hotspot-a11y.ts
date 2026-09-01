import { ID_INSET, ID_POPOVER, SEL_HOTSPOT } from "./constants.ts";
import { isMobileScreen, isWideScreen } from "../utils/viewport.ts";

/** Stable id for a margin annotation root — matches aria-controls on wide tier. */
export function annotationId(key: string): string {
  return `annotation-${key}`;
}

/** Default aria-controls for a hotspot at the current viewport tier. */
export function defaultHotspotControls(key: string): string {
  if (isWideScreen()) return annotationId(key);
  if (!isMobileScreen()) return ID_INSET;
  return ID_POPOVER;
}

export function syncHotspotDefaultControls(hotspot: HTMLElement): void {
  const key = hotspot.dataset.popover;
  if (!key) return;
  hotspot.setAttribute("aria-controls", defaultHotspotControls(key));
}

export function syncAllHotspotDefaultControls(): void {
  document
    .querySelectorAll<HTMLElement>(`${SEL_HOTSPOT}[data-popover]`)
    .forEach(syncHotspotDefaultControls);
}

/** Collapsed margin notes are hidden from AT and inert so focus cannot enter. */
export function setAnnotationInert(el: HTMLElement, hidden: boolean): void {
  el.setAttribute("aria-hidden", hidden ? "true" : "false");
  el.inert = hidden;
}
