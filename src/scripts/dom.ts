// ── Shared DOM contracts ──────────────────────────────────────────────────────
// Required-element/global access and media readiness are infrastructure
// concerns shared by the interaction engines. Note rendering and carousel
// behavior live in note-content.ts and note-media.ts.

export function requireEl(id: string, context = "Unknown"): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`[${context}] Required element #${id} not found in DOM`);
  }
  return element;
}

declare global {
  interface Window {
    __POPOVERS__?: import("../types/content.ts").PopoverMap;
  }
}

export function requireGlobal<Key extends keyof Window>(
  key: Key,
  context = "Unknown",
): NonNullable<Window[Key]> {
  const value = window[key];
  if (value === undefined) {
    throw new Error(
      `[${context}] window.${key} is not set. ` +
        "Check that <script define:vars> in index.astro runs before this module.",
    );
  }
  return value as NonNullable<Window[Key]>;
}

/** Runs a layout callback once an image or video has intrinsic dimensions. */
export function onMediaReady(media: Element, callback: () => void): void {
  if (media instanceof HTMLImageElement) {
    if (media.complete) callback();
    else media.addEventListener("load", callback, { once: true });
    return;
  }

  if (media instanceof HTMLVideoElement) {
    if (media.readyState >= HTMLMediaElement.HAVE_METADATA) callback();
    else media.addEventListener("loadedmetadata", callback, { once: true });
  }
}
