import { describe, expect, it } from "vitest";
import {
  DISPLAY_MAX_WIDTH,
  displayVariantPath,
  isDisplayVariant,
  resolveDisplayImage,
} from "./display-image";
import { publicImageSize } from "./image-size";

// Unmocked, like image-size.test.ts: the helper's contract is about files that
// really exist under public/.

describe("displayVariantPath", () => {
  it("maps a WebP source to its display sibling", () => {
    expect(displayVariantPath("/images/truist/original.webp")).toBe(
      "/images/truist/original.display.webp",
    );
    expect(displayVariantPath("/images/a/B.WEBP")).toBe(
      "/images/a/B.display.webp",
    );
  });

  it("has no variant for variants themselves or for non-WebP files", () => {
    expect(
      displayVariantPath("/images/truist/original.display.webp"),
    ).toBeNull();
    expect(
      displayVariantPath("/images/awards/apple-design-award.png"),
    ).toBeNull();
    expect(displayVariantPath("/images/sparks-grove/gala_5.jpg")).toBeNull();
  });

  it("recognises display variants", () => {
    expect(isDisplayVariant("/x/y.display.webp")).toBe(true);
    expect(isDisplayVariant("/x/y.webp")).toBe(false);
  });
});

describe("resolveDisplayImage", () => {
  it("serves the lighter variant for a heavy 4K source, at the same aspect ratio", async () => {
    const full = await publicImageSize("/images/truist/original.webp");
    const shown = await resolveDisplayImage("/images/truist/original.webp");

    expect(shown.src).toBe("/images/truist/original.display.webp");
    expect(full).not.toBeNull();
    expect(shown.size).not.toBeNull();
    expect(shown.size!.width).toBeLessThanOrEqual(DISPLAY_MAX_WIDTH);
    expect(shown.size!.width).toBeLessThan(full!.width);
    expect(shown.size!.width / shown.size!.height).toBeCloseTo(
      full!.width / full!.height,
      2,
    );
  });

  it("falls back to the original when no variant was generated", async () => {
    const shown = await resolveDisplayImage(
      "/images/hypercard/what-is-hypercard.webp",
    );
    expect(shown.src).toBe("/images/hypercard/what-is-hypercard.webp");
    expect(shown.size).toEqual({ width: 512, height: 342 });
  });

  it("leaves non-WebP artwork alone", async () => {
    const shown = await resolveDisplayImage(
      "/images/awards/apple-design-award.png",
    );
    expect(shown.src).toBe("/images/awards/apple-design-award.png");
    expect(shown.size).toEqual({ width: 846, height: 1024 });
  });
});
