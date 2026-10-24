/**
 * Pure geometry for the lightbox magnifier — no DOM access, so every rule here
 * is unit-tested in image-magnifier.test.ts.
 *
 * Coordinates are CSS pixels measured from the top-left of the *rendered*
 * image. "Zoom" is relative to what the reader sees (2.5× = 2.5 times the
 * on-screen size), so the lens shows real detail whenever the full-resolution
 * file is larger than its on-screen box.
 */

export const ZOOM_MIN = 1.5;
export const ZOOM_MAX = 5;
export const ZOOM_DEFAULT = 2.5;
export const ZOOM_STEP = 0.5;

export const LENS_WIDTH = 280;
export const LENS_HEIGHT = 200;
export const LENS_WIDTH_COARSE = 220;
export const LENS_HEIGHT_COARSE = 160;
/** The lens never covers more than this share of the image on either axis. */
export const LENS_MAX_SHARE = 0.7;
/** Gap between a finger and the lens that floats above it. */
export const TOUCH_LENS_GAP = 28;

/** height / width above which an image is "tall": fit the width and scroll. */
export const TALL_RATIO = 1.6;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  left: number;
  top: number;
}

export type LensMode = "cursor" | "offset";

/** Free space around the image (inside the stage) a floating lens may use. */
export interface LensRoom {
  top: number;
  bottom: number;
}

export interface LensLayout {
  /** Lens box, relative to the image's top-left. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** `background-size` / `background-position` of the magnified image. */
  backgroundWidth: number;
  backgroundHeight: number;
  backgroundX: number;
  backgroundY: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return ZOOM_DEFAULT;
  return Math.round(clamp(zoom, ZOOM_MIN, ZOOM_MAX) * 100) / 100;
}

/** One +/- button press (or key press): a fixed step, snapped to the bounds. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  return clampZoom(zoom + direction * ZOOM_STEP);
}

/**
 * Wheel zoom is exponential so a trackpad's stream of small deltas feels the
 * same as a mouse wheel's single large one. Scrolling up (negative deltaY)
 * zooms in.
 */
export function zoomByWheel(
  zoom: number,
  deltaY: number,
  deltaMode: number = 0,
): number {
  const pixels =
    deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 100 : deltaY;
  return clampZoom(zoom * Math.exp(-pixels * 0.002));
}

export function formatZoom(zoom: number): string {
  const rounded = Math.round(zoom * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}×`;
}

/** Tall pages (full-length design captures) scroll instead of shrinking to fit. */
export function isTallImage(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return height / width > TALL_RATIO;
}

export function isInside(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

/** Viewport pointer position → image-relative position (null when outside). */
export function pointOnImage(client: Point, rect: Rect): Point | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  if (!isInside(client, rect)) return null;
  return { x: client.x - rect.left, y: client.y - rect.top };
}

/** Lens dimensions: fixed on desktop, but never swallowing a small image. */
export function lensSizeFor(image: Size, coarse = false): Size {
  const baseWidth = coarse ? LENS_WIDTH_COARSE : LENS_WIDTH;
  const baseHeight = coarse ? LENS_HEIGHT_COARSE : LENS_HEIGHT;
  return {
    width: Math.round(Math.min(baseWidth, image.width * LENS_MAX_SHARE)),
    height: Math.round(Math.min(baseHeight, image.height * LENS_MAX_SHARE)),
  };
}

/**
 * Places the lens and aims the magnified image.
 *
 * - `cursor` (mouse, pen, keyboard): the lens is centred on the pointer, then
 *   shifted just enough to stay inside the image. The magnified pixel under
 *   the pointer is drawn exactly at the pointer — like a real glass held over
 *   the page — so even the outermost pixels of the image stay reachable.
 * - `offset` (touch): the lens floats above the finger (below it when there is
 *   no room above) and shows the magnified area centred on the finger. A short,
 *   wide image can't hold a lens above the finger, so `room` lets it overhang
 *   into the stage's spare space (the stage clips it; it never reaches the
 *   header).
 */
export function lensLayout(
  point: Point,
  image: Size,
  lens: Size,
  zoom: number,
  mode: LensMode = "cursor",
  room: LensRoom = { top: 0, bottom: 0 },
): LensLayout {
  const safeZoom = clampZoom(zoom);
  const px = clamp(point.x, 0, image.width);
  const py = clamp(point.y, 0, image.height);

  const minTop = mode === "offset" ? -Math.max(0, room.top) : 0;
  const maxTop =
    image.height -
    lens.height +
    (mode === "offset" ? Math.max(0, room.bottom) : 0);

  let left = px - lens.width / 2;
  let top: number;
  if (mode === "offset") {
    top = py - TOUCH_LENS_GAP - lens.height;
    if (top < minTop) top = py + TOUCH_LENS_GAP;
  } else {
    top = py - lens.height / 2;
  }
  left = clamp(left, 0, image.width - lens.width);
  top = clamp(top, minTop, maxTop);

  const backgroundWidth = image.width * safeZoom;
  const backgroundHeight = image.height * safeZoom;
  const anchorX = mode === "offset" ? lens.width / 2 : px - left;
  const anchorY = mode === "offset" ? lens.height / 2 : py - top;

  return {
    left,
    top,
    width: lens.width,
    height: lens.height,
    backgroundWidth,
    backgroundHeight,
    backgroundX: anchorX - px * safeZoom,
    backgroundY: anchorY - py * safeZoom,
  };
}

/** Arrow-key movement of the virtual pointer, kept on the image. */
export function movePoint(
  point: Point,
  key: string,
  image: Size,
  big = false,
): Point {
  const step = big ? 96 : 24;
  const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
  const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
  return {
    x: clamp(point.x + dx, 0, image.width),
    y: clamp(point.y + dy, 0, image.height),
  };
}

/**
 * How far a scroll container must scroll to bring `y` (in container viewport
 * coordinates) inside the visible band, keeping `margin` of breathing room.
 */
export function scrollDeltaToReveal(
  y: number,
  viewTop: number,
  viewBottom: number,
  margin = 40,
): number {
  if (y < viewTop + margin) return y - (viewTop + margin);
  if (y > viewBottom - margin) return y - (viewBottom - margin);
  return 0;
}
