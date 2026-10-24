import { describe, expect, it } from "vitest";
import {
  LENS_HEIGHT,
  LENS_WIDTH,
  LENS_WIDTH_COARSE,
  TOUCH_LENS_GAP,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  clamp,
  clampZoom,
  formatZoom,
  isInside,
  isTallImage,
  lensLayout,
  lensSizeFor,
  movePoint,
  pointOnImage,
  scrollDeltaToReveal,
  stepZoom,
  zoomByWheel,
} from "./image-magnifier";

const image = { width: 1000, height: 600 };
const lens = { width: LENS_WIDTH, height: LENS_HEIGHT };

describe("zoom", () => {
  it("clamps to the supported range and survives bad input", () => {
    expect(clampZoom(0.2)).toBe(ZOOM_MIN);
    expect(clampZoom(40)).toBe(ZOOM_MAX);
    expect(clampZoom(3)).toBe(3);
    expect(clampZoom(Number.NaN)).toBe(ZOOM_DEFAULT);
  });

  it("steps by half a level and stops at the bounds", () => {
    expect(stepZoom(2.5, 1)).toBe(3);
    expect(stepZoom(2.5, -1)).toBe(2);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });

  it("zooms in when the wheel scrolls up, out when it scrolls down", () => {
    expect(zoomByWheel(2.5, -100)).toBeGreaterThan(2.5);
    expect(zoomByWheel(2.5, 100)).toBeLessThan(2.5);
    expect(zoomByWheel(ZOOM_MAX, -5000)).toBe(ZOOM_MAX);
    expect(zoomByWheel(ZOOM_MIN, 5000)).toBe(ZOOM_MIN);
  });

  it("treats line-mode wheel deltas as larger than pixel-mode ones", () => {
    expect(zoomByWheel(2.5, -3, 1)).toBeGreaterThan(zoomByWheel(2.5, -3, 0));
  });

  it("formats the level for the header", () => {
    expect(formatZoom(2.5)).toBe("2.5×");
    expect(formatZoom(3)).toBe("3×");
    expect(formatZoom(1.5)).toBe("1.5×");
  });
});

describe("tall images", () => {
  it("flags full-page captures and leaves ordinary shots alone", () => {
    expect(isTallImage(1500, 3700)).toBe(true);
    expect(isTallImage(1500, 2560)).toBe(true);
    expect(isTallImage(1200, 1566)).toBe(false);
    expect(isTallImage(1100, 487)).toBe(false);
    expect(isTallImage(0, 100)).toBe(false);
  });
});

describe("pointer mapping", () => {
  const rect = { left: 100, top: 50, width: 1000, height: 600 };

  it("maps viewport coordinates onto the image", () => {
    expect(pointOnImage({ x: 350, y: 250 }, rect)).toEqual({ x: 250, y: 200 });
  });

  it("reports null outside the image (so the lens hides)", () => {
    expect(pointOnImage({ x: 99, y: 100 }, rect)).toBeNull();
    expect(pointOnImage({ x: 500, y: 651 }, rect)).toBeNull();
    expect(isInside({ x: 100, y: 50 }, rect)).toBe(true);
  });

  it("is safe on a collapsed rect", () => {
    expect(
      pointOnImage({ x: 0, y: 0 }, { left: 0, top: 0, width: 0, height: 0 }),
    ).toBeNull();
  });
});

describe("lensSizeFor", () => {
  it("uses the full desktop lens on a large image", () => {
    expect(lensSizeFor(image)).toEqual(lens);
  });

  it("uses the smaller lens for coarse pointers", () => {
    expect(lensSizeFor(image, true).width).toBe(LENS_WIDTH_COARSE);
  });

  it("never swallows a small image", () => {
    const size = lensSizeFor({ width: 200, height: 100 });
    expect(size.width).toBe(140);
    expect(size.height).toBe(70);
  });
});

describe("lensLayout (cursor mode)", () => {
  it("centres the lens on the pointer in open space", () => {
    const layout = lensLayout({ x: 500, y: 300 }, image, lens, 2.5);
    expect(layout.left).toBe(500 - LENS_WIDTH / 2);
    expect(layout.top).toBe(300 - LENS_HEIGHT / 2);
  });

  it("keeps the lens inside the image at every edge and corner", () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 0, y: 600 },
      { x: 1000, y: 600 },
      { x: 5, y: 300 },
      { x: 995, y: 300 },
    ];
    for (const corner of corners) {
      const layout = lensLayout(corner, image, lens, 2.5);
      expect(layout.left).toBeGreaterThanOrEqual(0);
      expect(layout.top).toBeGreaterThanOrEqual(0);
      expect(layout.left + layout.width).toBeLessThanOrEqual(image.width);
      expect(layout.top + layout.height).toBeLessThanOrEqual(image.height);
    }
  });

  it("scales the full-resolution image by the zoom level", () => {
    const layout = lensLayout({ x: 500, y: 300 }, image, lens, 3);
    expect(layout.backgroundWidth).toBe(3000);
    expect(layout.backgroundHeight).toBe(1800);
  });

  it("draws the magnified pixel under the pointer exactly at the pointer", () => {
    const point = { x: 640, y: 210 };
    const zoom = 2.5;
    const layout = lensLayout(point, image, lens, zoom);
    // Pointer position inside the lens, and where that pointer's source pixel
    // lands inside the lens after magnification.
    const insideX = point.x - layout.left;
    const insideY = point.y - layout.top;
    expect(layout.backgroundX + point.x * zoom).toBeCloseTo(insideX, 6);
    expect(layout.backgroundY + point.y * zoom).toBeCloseTo(insideY, 6);
  });

  it("holds that alignment when the lens is pushed in from an edge, so edge pixels stay reachable", () => {
    const point = { x: 3, y: 4 };
    const zoom = 4;
    const layout = lensLayout(point, image, lens, zoom);
    expect(layout.left).toBe(0);
    expect(layout.top).toBe(0);
    expect(layout.backgroundX).toBeCloseTo(point.x - point.x * zoom, 6);
    expect(layout.backgroundY).toBeCloseTo(point.y - point.y * zoom, 6);
  });

  it("clamps out-of-range pointers and out-of-range zoom", () => {
    const layout = lensLayout({ x: -50, y: 9999 }, image, lens, 99);
    expect(layout.left).toBe(0);
    expect(layout.top + layout.height).toBe(image.height);
    expect(layout.backgroundWidth).toBe(image.width * ZOOM_MAX);
  });
});

describe("lensLayout (offset mode, touch)", () => {
  const small = { width: 220, height: 160 };

  it("floats above the finger and centres the magnified area on it", () => {
    const point = { x: 500, y: 400 };
    const layout = lensLayout(point, image, small, 2.5, "offset");
    expect(layout.top + layout.height).toBe(point.y - TOUCH_LENS_GAP);
    expect(layout.backgroundX).toBeCloseTo(small.width / 2 - point.x * 2.5, 6);
    expect(layout.backgroundY).toBeCloseTo(small.height / 2 - point.y * 2.5, 6);
  });

  it("drops below the finger when there is no room above", () => {
    const point = { x: 500, y: 40 };
    const layout = lensLayout(point, image, small, 2.5, "offset");
    expect(layout.top).toBe(point.y + TOUCH_LENS_GAP);
  });

  it("may overhang the image into spare stage space so a short image still gets a lens above the finger", () => {
    const wide = { width: 340, height: 145 };
    const point = { x: 170, y: 90 };
    const stay = lensLayout(point, wide, small, 2.5, "offset");
    const roomy = lensLayout(point, wide, small, 2.5, "offset", {
      top: 300,
      bottom: 300,
    });
    // Without room the lens is wedged inside the image and covers the finger.
    expect(stay.top + stay.height).toBeGreaterThan(point.y);
    // With room it floats clear above the finger, partly outside the image.
    expect(roomy.top).toBeLessThan(0);
    expect(roomy.top + roomy.height).toBe(point.y - TOUCH_LENS_GAP);
  });

  it("respects the room it was given", () => {
    const layout = lensLayout(
      { x: 170, y: 20 },
      { width: 340, height: 145 },
      small,
      2.5,
      "offset",
      {
        top: 10,
        bottom: 0,
      },
    );
    expect(layout.top).toBeGreaterThanOrEqual(-10);
  });

  it("stays on the image near the sides", () => {
    const layout = lensLayout({ x: 2, y: 580 }, image, small, 2.5, "offset");
    expect(layout.left).toBe(0);
    expect(layout.top + layout.height).toBeLessThanOrEqual(image.height);
  });
});

describe("tall image path", () => {
  // A 1500x3700 capture fitted to a 1400px-wide stage and scrolled: the lens
  // maths only ever sees the rendered box, so it needs no scroll awareness.
  const tall = { width: 1400, height: 3453 };

  it("keeps the lens inside a very tall image anywhere along its length", () => {
    for (const y of [0, 1200, 3000, 3453]) {
      const layout = lensLayout({ x: 700, y }, tall, lens, 2.5);
      expect(layout.top).toBeGreaterThanOrEqual(0);
      expect(layout.top + layout.height).toBeLessThanOrEqual(tall.height);
    }
  });

  it("magnifies the full height, not the viewport", () => {
    const layout = lensLayout({ x: 700, y: 3000 }, tall, lens, 2);
    expect(layout.backgroundHeight).toBe(tall.height * 2);
  });
});

describe("keyboard movement", () => {
  it("moves in steps, bigger with Shift, and stays on the image", () => {
    const start = { x: 500, y: 300 };
    expect(movePoint(start, "ArrowRight", image)).toEqual({ x: 524, y: 300 });
    expect(movePoint(start, "ArrowUp", image, true)).toEqual({
      x: 500,
      y: 204,
    });
    expect(movePoint({ x: 2, y: 2 }, "ArrowLeft", image)).toEqual({
      x: 0,
      y: 2,
    });
    expect(movePoint({ x: 999, y: 599 }, "ArrowDown", image, true)).toEqual({
      x: 999,
      y: 600,
    });
  });

  it("ignores non-arrow keys", () => {
    expect(movePoint({ x: 10, y: 10 }, "a", image)).toEqual({ x: 10, y: 10 });
  });

  it("clamp tolerates an inverted range", () => {
    expect(clamp(5, 10, 0)).toBe(10);
  });
});

describe("scrollDeltaToReveal", () => {
  it("is zero while the point is comfortably visible", () => {
    expect(scrollDeltaToReveal(400, 100, 800)).toBe(0);
  });

  it("scrolls up or down just enough to bring the point back", () => {
    expect(scrollDeltaToReveal(110, 100, 800)).toBe(-30);
    expect(scrollDeltaToReveal(790, 100, 800)).toBe(30);
  });
});
