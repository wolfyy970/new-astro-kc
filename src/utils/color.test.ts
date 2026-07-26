import { describe, it, expect } from "vitest";
import {
  resolveHexColor,
  hexToRgbString,
  buildAccentStyle,
  isHexColorDark,
  accentInk,
} from "./color";

describe("resolveHexColor", () => {
  it("returns a valid 6-digit hex unchanged", () => {
    expect(resolveHexColor("#3b1a5a")).toBe("#3b1a5a");
    expect(resolveHexColor("#F26522")).toBe("#F26522");
    expect(resolveHexColor("#00c2e0")).toBe("#00c2e0");
  });

  it("returns the fallback when value is undefined", () => {
    expect(resolveHexColor(undefined)).toBe("#000000");
  });

  it("returns the fallback when value is null", () => {
    expect(resolveHexColor(null)).toBe("#000000");
  });

  it("returns the fallback for a shorthand hex (#rgb)", () => {
    expect(resolveHexColor("#3b1")).toBe("#000000");
  });

  it("returns the fallback for a hex missing the leading #", () => {
    expect(resolveHexColor("3b1a5a")).toBe("#000000");
  });

  it("returns the fallback for an empty string", () => {
    expect(resolveHexColor("")).toBe("#000000");
  });

  it("returns the fallback for a non-hex color name", () => {
    expect(resolveHexColor("purple")).toBe("#000000");
  });

  it("respects a custom fallback argument", () => {
    expect(resolveHexColor(undefined, "#000000")).toBe("#000000");
    expect(resolveHexColor("bad", "#ffffff")).toBe("#ffffff");
  });
});

describe("hexToRgbString", () => {
  it("converts black correctly", () => {
    expect(hexToRgbString("#000000")).toBe("0, 0, 0");
  });

  it("converts white correctly", () => {
    expect(hexToRgbString("#ffffff")).toBe("255, 255, 255");
  });

  it("converts Truist purple correctly", () => {
    expect(hexToRgbString("#3b1a5a")).toBe("59, 26, 90");
  });

  it("converts Upwave orange correctly", () => {
    expect(hexToRgbString("#f26522")).toBe("242, 101, 34");
  });

  it("is case-insensitive", () => {
    expect(hexToRgbString("#F26522")).toBe("242, 101, 34");
    expect(hexToRgbString("#f26522")).toBe("242, 101, 34");
  });
});

describe("buildAccentStyle", () => {
  it("builds all four CSS custom properties from a valid hex", () => {
    const style = buildAccentStyle("#3b1a5a");
    expect(style).toContain("--accent: #3b1a5a");
    expect(style).toContain("--accent-rgb: 59, 26, 90");
    expect(style).toContain("--accent-contrast: #FFFFFF");
  });

  it("uses the original color for --accent-contrast if it is bright enough", () => {
    const style = buildAccentStyle("#00c2e0");
    expect(style).toContain("--accent: #00c2e0");
    expect(style).toContain("--accent-contrast: #00c2e0");
  });

  it("falls back to the portfolio default when given undefined", () => {
    const style = buildAccentStyle(undefined);
    expect(style).toContain("--accent: #000000");
    expect(style).toContain("--accent-rgb: 0, 0, 0");
  });

  it("falls back to the portfolio default for an invalid color", () => {
    const style = buildAccentStyle("#bad");
    expect(style).toContain("--accent: #000000");
  });

  it("produces a string suitable for use as an HTML style attribute", () => {
    const style = buildAccentStyle("#c8102e");
    // --accent, --accent-rgb, --accent-contrast, --accent-ink.
    // (--accent-border was dropped: it was emitted on every case-study page
    // and no stylesheet consumed it.)
    expect(style.split(";").filter(Boolean).length).toBe(4);
  });

  it("emits a readable ink for a brand too light to set text", () => {
    expect(buildAccentStyle("#00c2e0")).toContain("--accent-ink: #007c8f");
  });
});

describe("accentInk", () => {
  /** WCAG contrast against white, for asserting the guarantee directly. */
  const onWhite = (hex: string) => {
    const lum = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
      )
      .reduce((a, c, i) => a + [0.2126, 0.7152, 0.0722][i] * c, 0);
    return 1.05 / (lum + 0.05);
  };

  // The five brands actually published under src/content/case-studies/.
  const BRANDS = ["#3b1a5a", "#c8102e", "#f26522", "#1e4db7", "#00c2e0"];

  it("clears the target against white for every published brand", () => {
    for (const brand of BRANDS) {
      expect(onWhite(accentInk(brand))).toBeGreaterThanOrEqual(4.9);
    }
  });

  it("leaves a brand that is already dark enough untouched", () => {
    // Truist, Delta and Two Way TV set text at their own hex.
    expect(accentInk("#3b1a5a")).toBe("#3b1a5a");
    expect(accentInk("#c8102e")).toBe("#c8102e");
    expect(accentInk("#1e4db7")).toBe("#1e4db7");
  });

  it("darkens only the brands that fail, preserving their hue", () => {
    // Cyan stays cyan-ish: blue channel still dominates, red still lowest.
    const ink = accentInk("#00c2e0");
    expect(ink).not.toBe("#00c2e0");
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(ink.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(r);
  });

  it("honours a caller-supplied target", () => {
    expect(onWhite(accentInk("#f26522", 7))).toBeGreaterThanOrEqual(7);
  });

  it("bottoms out at black rather than looping forever", () => {
    expect(accentInk("#ffffff", 21)).toBe("#000000");
  });
});

describe("isHexColorDark", () => {
  it("returns true for dark colors", () => {
    expect(isHexColorDark("#000000")).toBe(true);
    expect(isHexColorDark("#3b1a5a")).toBe(true);
  });

  it("returns false for light colors", () => {
    expect(isHexColorDark("#ffffff")).toBe(false);
    expect(isHexColorDark("#00c2e0")).toBe(false);
  });

  it("supports 3-digit shorthand hex codes", () => {
    expect(isHexColorDark("#000")).toBe(true);
    expect(isHexColorDark("#fff")).toBe(false);
  });

  it("treats gradient strings as dark by default", () => {
    // The stops are deliberately the documented ink and stock: the function
    // short-circuits on the word "gradient" and never parses them, so a
    // fixture built from off-palette hexes only looked like a colour decision
    // to anything scanning the repo.
    expect(
      isHexColorDark("linear-gradient(135deg, #000000 0%, #ffffff 100%)"),
    ).toBe(true);
  });

  it("calls a gradient dark even when its stops are light", () => {
    // Pins the reason the assertion above passes — the stops are not read.
    expect(isHexColorDark("linear-gradient(90deg, #ffffff, #ffffff)")).toBe(
      true,
    );
  });

  it("returns false for invalid or empty input", () => {
    expect(isHexColorDark(undefined)).toBe(false);
    expect(isHexColorDark(null)).toBe(false);
    expect(isHexColorDark("")).toBe(false);
    expect(isHexColorDark("invalid-color")).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(isHexColorDark("#00c2e0", 128)).toBe(false);
    expect(isHexColorDark("#00c2e0", 140)).toBe(true);
  });

  it("handles boundary values correctly", () => {
    expect(isHexColorDark("#808080", 128)).toBe(false);
    expect(isHexColorDark("#7f7f7f", 128)).toBe(true);
  });
});
