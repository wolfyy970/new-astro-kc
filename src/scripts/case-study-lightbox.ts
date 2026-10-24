/**
 * Accessible image viewer with a magnifying lens for case-study media.
 *
 * The inline page shows a lighter display variant; this dialog loads the
 * full-resolution original and lets readers inspect it with a rectangular
 * lens that follows the pointer (image-magnifier.ts holds the geometry). The
 * controls live in a header *outside* the image stage, so the lens — which is
 * clipped to the image — can never sit on top of Close. The native dialog
 * supplies modal focus containment and the trigger regains focus on close.
 *
 * Tall full-page captures fit the stage width and scroll instead of shrinking
 * to fit the viewport; the lens is computed from live bounding rects, so it
 * keeps working mid-scroll.
 */
import {
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  clampZoom,
  formatZoom,
  isTallImage,
  lensLayout,
  lensSizeFor,
  movePoint,
  scrollDeltaToReveal,
  stepZoom,
  zoomByWheel,
  type Point,
  type Rect,
} from "./image-magnifier";

type PointerKind = "mouse" | "pen" | "touch" | "keyboard";

/** Keep a floating lens this far inside the stage edge. */
const LENS_STAGE_MARGIN = 8;

const ARROW_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

function prefersFinePointer(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function cssUrl(src: string): string {
  return `url("${src.replace(/"/g, "%22")}")`;
}

export function initCaseStudyLightbox(root: ParentNode = document): () => void {
  const dialog = root.querySelector<HTMLDialogElement>(
    "[data-case-study-lightbox]",
  );
  const image = root.querySelector<HTMLImageElement>(
    "[data-case-study-lightbox-image]",
  );
  const caption = root.querySelector<HTMLElement>(
    "[data-case-study-lightbox-caption]",
  );
  const closeButton = root.querySelector<HTMLButtonElement>(
    "[data-case-study-image-close]",
  );

  if (!dialog || !image || !caption || !closeButton) return () => {};

  // The magnifier is an enhancement: without its elements the dialog is still
  // a plain accessible image viewer.
  const stage = dialog.querySelector<HTMLElement>("[data-case-study-stage]");
  const figure = dialog.querySelector<HTMLElement>("[data-case-study-figure]");
  const lens = dialog.querySelector<HTMLElement>("[data-case-study-lens]");
  const zoomOutButton = dialog.querySelector<HTMLButtonElement>(
    "[data-case-study-zoom-out]",
  );
  const zoomInButton = dialog.querySelector<HTMLButtonElement>(
    "[data-case-study-zoom-in]",
  );
  const zoomLevel = dialog.querySelector<HTMLElement>(
    "[data-case-study-zoom-level]",
  );
  const toggleButton = dialog.querySelector<HTMLButtonElement>(
    "[data-case-study-magnifier-toggle]",
  );
  const live = dialog.querySelector<HTMLElement>("[data-case-study-live]");

  let lastTrigger: HTMLButtonElement | null = null;
  let sessionCleanup: Array<() => void> = [];

  // Magnifier state — reset on every open; nothing is persisted.
  let zoom = ZOOM_DEFAULT;
  let lensEnabled = false;
  let imageReady = false;
  let tall = false;
  let pointerKind: PointerKind = "mouse";
  let point: Point | null = null; // image-relative, CSS px
  let lastClient: Point | null = null;
  let lensVisible = false;
  let pressed = false;

  const imageRect = (): Rect => {
    const box = image.getBoundingClientRect();
    return {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
    };
  };

  const announce = (message: string) => {
    if (!live) return;
    live.textContent = "";
    live.textContent = message;
  };

  const hideLens = () => {
    lensVisible = false;
    if (lens) lens.dataset.visible = "false";
  };

  const render = () => {
    if (!lens || !figure) return;
    const rect = imageRect();
    if (
      !lensEnabled ||
      !imageReady ||
      !lensVisible ||
      !point ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      lens.dataset.visible = "false";
      return;
    }

    const coarse = pointerKind === "touch";
    const size = { width: rect.width, height: rect.height };
    const view = stage?.getBoundingClientRect();
    const room = view
      ? {
          top: Math.max(0, rect.top - view.top - LENS_STAGE_MARGIN),
          bottom: Math.max(
            0,
            view.bottom - (rect.top + rect.height) - LENS_STAGE_MARGIN,
          ),
        }
      : undefined;
    const layout = lensLayout(
      point,
      size,
      lensSizeFor(size, coarse),
      zoom,
      coarse ? "offset" : "cursor",
      room,
    );
    const frame = figure.getBoundingClientRect();
    const style = lens.style;
    style.left = `${layout.left + rect.left - frame.left}px`;
    style.top = `${layout.top + rect.top - frame.top}px`;
    style.width = `${layout.width}px`;
    style.height = `${layout.height}px`;
    style.backgroundSize = `${layout.backgroundWidth}px ${layout.backgroundHeight}px`;
    style.backgroundPosition = `${layout.backgroundX}px ${layout.backgroundY}px`;
    lens.dataset.zoom = formatZoom(zoom);
    lens.dataset.visible = "true";
  };

  const syncZoomControls = () => {
    if (zoomLevel) zoomLevel.textContent = formatZoom(zoom);
    zoomOutButton?.setAttribute("aria-disabled", String(zoom <= ZOOM_MIN));
    zoomInButton?.setAttribute("aria-disabled", String(zoom >= ZOOM_MAX));
  };

  const setZoom = (next: number, speak = true) => {
    const value = clampZoom(next);
    if (value === zoom) return;
    zoom = value;
    syncZoomControls();
    if (speak) announce(`Zoom ${formatZoom(zoom)}`);
    render();
  };

  const setLensEnabled = (enabled: boolean, speak = true) => {
    lensEnabled = enabled;
    toggleButton?.setAttribute("aria-pressed", String(enabled));
    if (stage) stage.dataset.lens = enabled ? "on" : "off";
    if (!enabled) hideLens();
    else if (point && pointerKind !== "touch") lensVisible = true;
    if (speak) announce(enabled ? "Magnifier on" : "Magnifier off");
    render();
  };

  const setOrientation = (isTall: boolean) => {
    tall = isTall;
    dialog.dataset.orientation = isTall ? "tall" : "regular";
  };

  const markLoaded = () => {
    if (!image.getAttribute("src") || image.naturalWidth <= 0) return;
    imageReady = true;
    setOrientation(isTallImage(image.naturalWidth, image.naturalHeight));
    if (figure) {
      figure.removeAttribute("data-loading");
      figure.style.removeProperty("background-image");
      figure.style.removeProperty("--lightbox-aspect");
      // Never upscale past the file's own pixels (tall pages fill the width).
      figure.style.setProperty(
        "--lightbox-natural-width",
        `${image.naturalWidth}px`,
      );
    }
    if (lens)
      lens.style.backgroundImage = cssUrl(image.currentSrc || image.src);
    render();
  };

  const pointFromClient = (client: Point): Point | null => {
    const rect = imageRect();
    const x = client.x - rect.left;
    const y = client.y - rect.top;
    if (pointerKind === "touch") {
      return {
        x: Math.min(Math.max(x, 0), rect.width),
        y: Math.min(Math.max(y, 0), rect.height),
      };
    }
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return { x, y };
  };

  const trackPointer = (event: PointerEvent) => {
    const type = event.pointerType;
    pointerKind = type === "touch" || type === "pen" ? type : "mouse";
    dialog.dataset.pointer = pointerKind;
    lastClient = { x: event.clientX, y: event.clientY };
    if (pointerKind === "touch" && !pressed) return;
    // Track even while the lens is off, so turning it on shows it right away.
    const next = pointFromClient(lastClient);
    if (!next) {
      point = null;
      hideLens();
      render();
      return;
    }
    point = next;
    if (lensEnabled) lensVisible = true;
    render();
  };

  // A touch anywhere in the dialog (e.g. the Magnifier toggle) marks the input
  // as touch *before* the first touch lands on the image, so touch-action is
  // already in force when a drag starts.
  const onDialogPointerDown = (event: PointerEvent) => {
    const type = event.pointerType;
    if (type === "touch" || type === "pen" || type === "mouse") {
      dialog.dataset.pointer = type;
      pointerKind = type;
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || !lensEnabled) return;
    pressed = true;
    try {
      figure?.setPointerCapture?.(event.pointerId);
    } catch {
      // Capture is a nicety; the lens still follows without it.
    }
    trackPointer(event);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerType !== "touch") return;
    pressed = false;
    hideLens();
    render();
  };

  const onPointerLeave = () => {
    if (pressed) return;
    lastClient = null;
    hideLens();
    render();
  };

  const onImageClick = (event: MouseEvent) => {
    // Taps on touch screens drag the lens; only a mouse/pen click toggles it.
    if ((event as PointerEvent).pointerType === "touch") return;
    setLensEnabled(!lensEnabled);
  };

  const onWheel = (event: WheelEvent) => {
    // Tall pages always scroll; Ctrl+wheel stays the browser's page zoom.
    if (!lensEnabled || !lensVisible || tall || event.ctrlKey) return;
    event.preventDefault();
    setZoom(zoomByWheel(zoom, event.deltaY, event.deltaMode));
  };

  const onStageScroll = () => {
    // The page moved under a stationary pointer: re-aim the lens at it.
    if (!lensVisible || pointerKind === "keyboard") return;
    const next = lastClient ? pointFromClient(lastClient) : null;
    if (!next) {
      hideLens();
    } else {
      point = next;
    }
    render();
  };

  const onStageKeydown = (event: KeyboardEvent) => {
    if (!lensEnabled || !ARROW_KEYS.has(event.key)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    const rect = imageRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const size = { width: rect.width, height: rect.height };

    let from = point;
    if (!from || pointerKind !== "keyboard") {
      const view = stage?.getBoundingClientRect();
      const centreY = view
        ? (view.top + view.bottom) / 2 - rect.top
        : size.height / 2;
      from = {
        x: size.width / 2,
        y: Math.min(Math.max(centreY, 0), size.height),
      };
    }
    pointerKind = "keyboard";
    dialog.dataset.pointer = "keyboard";
    point = movePoint(from, event.key, size, event.shiftKey);
    lensVisible = true;

    // On a tall page, scroll to keep the lens in view.
    if (stage && tall) {
      const view = stage.getBoundingClientRect();
      const delta = scrollDeltaToReveal(
        rect.top + point.y,
        view.top,
        view.bottom,
      );
      if (delta) stage.scrollTop += delta;
    }
    render();
  };

  const onStageBlur = () => {
    if (pointerKind !== "keyboard") return;
    hideLens();
    render();
  };

  const onDialogKeydown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(stepZoom(zoom, 1));
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom(stepZoom(zoom, -1));
    } else if (event.key === "m" || event.key === "M") {
      event.preventDefault();
      setLensEnabled(!lensEnabled);
    }
  };

  const onZoomButton = (direction: 1 | -1) => (event: Event) => {
    const button = event.currentTarget as HTMLElement;
    if (button.getAttribute("aria-disabled") === "true") return;
    setZoom(stepZoom(zoom, direction));
  };

  const onToggleClick = () => setLensEnabled(!lensEnabled);

  const onImageError = () => {
    imageReady = false;
    figure?.removeAttribute("data-loading");
    hideLens();
  };

  const listen = <T extends EventTarget>(
    target: T | null,
    type: string,
    handler: (event: never) => void,
    options?: AddEventListenerOptions,
  ) => {
    if (!target) return;
    const listener = handler as unknown as EventListener;
    target.addEventListener(type, listener, options);
    sessionCleanup.push(() =>
      target.removeEventListener(type, listener, options),
    );
  };

  const startSession = () => {
    listen(image, "load", markLoaded);
    listen(image, "error", onImageError);
    listen(image, "click", onImageClick);
    listen(figure, "pointerenter", trackPointer);
    listen(figure, "pointermove", trackPointer);
    listen(figure, "pointerdown", onPointerDown);
    listen(figure, "pointerup", onPointerUp);
    listen(figure, "pointercancel", onPointerUp);
    listen(figure, "pointerleave", onPointerLeave);
    listen(figure, "wheel", onWheel, { passive: false });
    listen(stage, "scroll", onStageScroll);
    listen(stage, "keydown", onStageKeydown);
    listen(stage, "blur", onStageBlur);
    listen(dialog, "keydown", onDialogKeydown);
    listen(dialog, "pointerdown", onDialogPointerDown, { capture: true });
    listen(zoomOutButton, "click", onZoomButton(-1));
    listen(zoomInButton, "click", onZoomButton(1));
    listen(toggleButton, "click", onToggleClick);
  };

  const endSession = () => {
    sessionCleanup.forEach((remove) => remove());
    sessionCleanup = [];
  };

  const resetMagnifier = () => {
    zoom = ZOOM_DEFAULT;
    imageReady = false;
    point = null;
    lastClient = null;
    pressed = false;
    pointerKind = "mouse";
    hideLens();
    lens?.removeAttribute("style");
    if (stage) stage.scrollTop = 0;
    delete dialog.dataset.pointer;
    if (figure) {
      figure.removeAttribute("data-loading");
      figure.removeAttribute("style");
    }
    image.removeAttribute("src");
    image.alt = "";
    caption.textContent = "";
    if (live) live.textContent = "";
    dialog.removeAttribute("data-orientation");
    tall = false;
  };

  const openForTrigger = (event: Event) => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) return;

    const trigger = eventTarget.closest<HTMLButtonElement>(
      "[data-case-study-image-trigger]",
    );
    if (!trigger || !root.contains(trigger)) return;

    const src = trigger.dataset.fullSrc;
    if (!src) return;

    const alt =
      trigger.dataset.imageAlt ?? trigger.querySelector("img")?.alt ?? "";
    lastTrigger = trigger;

    endSession();
    resetMagnifier();
    startSession();
    syncZoomControls();
    const fine = prefersFinePointer();
    pointerKind = fine ? "mouse" : "touch";
    dialog.dataset.pointer = pointerKind;
    setLensEnabled(fine, false);

    // The inline display variant is already in cache: paint it as a stand-in
    // (and reserve the right box) while the full-resolution file arrives.
    const inline = trigger.querySelector("img");
    const inlineWidth =
      inline?.naturalWidth || Number(inline?.getAttribute("width")) || 0;
    const inlineHeight =
      inline?.naturalHeight || Number(inline?.getAttribute("height")) || 0;
    if (figure && inline && inlineWidth > 0 && inlineHeight > 0) {
      figure.dataset.loading = "true";
      figure.style.setProperty(
        "--lightbox-aspect",
        String(inlineWidth / inlineHeight),
      );
      figure.style.setProperty("--lightbox-natural-width", `${inlineWidth}px`);
      const preview = inline.currentSrc || inline.src;
      if (preview && !preview.endsWith(src)) {
        figure.style.backgroundImage = cssUrl(preview);
      }
      setOrientation(isTallImage(inlineWidth, inlineHeight));
    }

    image.src = src;
    image.alt = alt;
    caption.textContent = alt;

    if (!dialog.open) dialog.showModal();
    closeButton.focus();
    if (image.complete) markLoaded();
  };

  const closeOnBackdrop = (event: Event) => {
    if (event.target === dialog && dialog.open) dialog.close();
  };

  const closeOnEscape = (event: Event) => {
    event.preventDefault();
    if (dialog.open) dialog.close();
  };

  const restoreTriggerFocus = () => {
    endSession();
    resetMagnifier();
    lastTrigger?.focus();
    lastTrigger = null;
  };

  const closeFromButton = () => {
    if (dialog.open) dialog.close();
  };

  root.addEventListener("click", openForTrigger);
  dialog.addEventListener("click", closeOnBackdrop);
  dialog.addEventListener("cancel", closeOnEscape);
  dialog.addEventListener("close", restoreTriggerFocus);
  closeButton.addEventListener("click", closeFromButton);

  return () => {
    endSession();
    root.removeEventListener("click", openForTrigger);
    dialog.removeEventListener("click", closeOnBackdrop);
    dialog.removeEventListener("cancel", closeOnEscape);
    dialog.removeEventListener("close", restoreTriggerFocus);
    closeButton.removeEventListener("click", closeFromButton);
  };
}
