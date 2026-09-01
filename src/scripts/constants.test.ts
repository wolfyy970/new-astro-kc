import { describe, it, expect } from "vitest";
import * as constants from "./constants";

describe("Constants", () => {
  it("should have breakpoints in descending order", () => {
    expect(constants.BREAKPOINT_WIDE).toBeGreaterThan(
      constants.BREAKPOINT_TABLET,
    );
    expect(constants.BREAKPOINT_TABLET).toBeGreaterThan(
      constants.BREAKPOINT_INSET_COLUMNS,
    );
    expect(constants.BREAKPOINT_INSET_COLUMNS).toBeGreaterThan(
      constants.BREAKPOINT_MOBILE,
    );
  });

  it("should have reasonable timing values", () => {
    expect(constants.RESIZE_DEBOUNCE_MS).toBeGreaterThan(0);
    expect(constants.RESIZE_DEBOUNCE_MS).toBeLessThan(2000);
  });

  it("UNFOLD_REFLOW_MS should outlast the CSS grid-rows transition (0.5s)", () => {
    expect(constants.UNFOLD_REFLOW_MS).toBeGreaterThanOrEqual(500);
    expect(constants.UNFOLD_REFLOW_MS).toBeLessThan(2000);
  });

  it("INSET_COLLAPSE_MS should cover the fold-up before DOM removal", () => {
    expect(constants.INSET_COLLAPSE_MS).toBeGreaterThanOrEqual(300);
    expect(constants.INSET_COLLAPSE_MS).toBeLessThan(2000);
  });

  it("ANNOTATION_TEXT_SENTENCES should be a positive integer", () => {
    expect(Number.isInteger(constants.ANNOTATION_TEXT_SENTENCES)).toBe(true);
    expect(constants.ANNOTATION_TEXT_SENTENCES).toBeGreaterThanOrEqual(1);
  });

  it("VIDEO_EXTENSIONS should include .mp4 and .webm", () => {
    expect(constants.VIDEO_EXTENSIONS).toContain(".mp4");
    expect(constants.VIDEO_EXTENSIONS).toContain(".webm");
  });

  it("VIDEO_EXTENSIONS entries should all start with a dot", () => {
    constants.VIDEO_EXTENSIONS.forEach((ext) => {
      expect(ext.startsWith(".")).toBe(true);
    });
  });

  it("CSS selector and ID constants should be non-empty strings", () => {
    expect(constants.SEL_HOTSPOT).toBeTruthy();
    expect(constants.ID_POPOVER).toBeTruthy();
    expect(constants.ID_OVERLAY).toBeTruthy();
  });

  it("SEL_HOTSPOT should be a valid CSS class selector (starts with .)", () => {
    expect(constants.SEL_HOTSPOT.startsWith(".")).toBe(true);
  });

  it("SWIPE_DISMISS_THRESHOLD should be a positive pixel distance", () => {
    expect(constants.SWIPE_DISMISS_THRESHOLD).toBeGreaterThan(0);
    // Sanity: should feel intentional — not so small it fires on a tap, not so large it's unreachable
    expect(constants.SWIPE_DISMISS_THRESHOLD).toBeGreaterThanOrEqual(40);
    expect(constants.SWIPE_DISMISS_THRESHOLD).toBeLessThanOrEqual(200);
  });

  it("SWIPE_DISMISS_VELOCITY should be a positive px/ms value", () => {
    expect(constants.SWIPE_DISMISS_VELOCITY).toBeGreaterThan(0);
    // Should be a sub-1 px/ms value (1 px/ms = 1000 px/s — extremely fast flick)
    expect(constants.SWIPE_DISMISS_VELOCITY).toBeLessThan(1);
  });

  it("CSS class constants should be non-empty strings without leading dots", () => {
    const classConstants = [
      constants.CLS_ACTIVE,
      constants.CLS_VISIBLE,
      constants.CLS_OPEN,
      constants.CLS_REVEALED,
      constants.CLS_SCROLL_REVEALED,
      constants.CLS_ANNOTATION_SUPPRESSED,
      constants.CLS_IS_DRAGGING,
    ];
    classConstants.forEach((cls) => {
      expect(typeof cls).toBe("string");
      expect(cls.length).toBeGreaterThan(0);
      expect(cls.startsWith(".")).toBe(false);
    });
  });
});
