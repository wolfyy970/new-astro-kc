import { describe, expect, it } from "vitest";
import { nearestSlideIndex } from "./note-media";

describe("nearestSlideIndex", () => {
  const offsetsWithGap = [20, 340, 660];

  it("normalizes slide offsets against the first slide", () => {
    expect(nearestSlideIndex(0, offsetsWithGap)).toBe(0);
    expect(nearestSlideIndex(320, offsetsWithGap)).toBe(1);
    expect(nearestSlideIndex(640, offsetsWithGap)).toBe(2);
  });

  it("chooses the physically nearest slide between snap points", () => {
    expect(nearestSlideIndex(140, offsetsWithGap)).toBe(0);
    expect(nearestSlideIndex(190, offsetsWithGap)).toBe(1);
    expect(nearestSlideIndex(500, offsetsWithGap)).toBe(2);
  });

  it("clamps browser overscroll naturally to an edge slide", () => {
    expect(nearestSlideIndex(-100, offsetsWithGap)).toBe(0);
    expect(nearestSlideIndex(900, offsetsWithGap)).toBe(2);
  });

  it("handles an empty carousel defensively", () => {
    expect(nearestSlideIndex(100, [])).toBe(0);
  });
});
