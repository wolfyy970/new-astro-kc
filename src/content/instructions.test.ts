import { describe, it, expect } from "vitest";
import {
  INTERACTIVE_LEAD_CLICK,
  INTERACTIVE_LEAD_TAP,
  INTERACTIVE_PENS,
} from "./instructions";

describe("instructions", () => {
  it("keeps click and tap leads distinct for responsive copy", () => {
    expect(INTERACTIVE_LEAD_CLICK).toContain("Click");
    expect(INTERACTIVE_LEAD_TAP).toContain("Tap");
    expect(INTERACTIVE_LEAD_CLICK).not.toBe(INTERACTIVE_LEAD_TAP);
  });

  it("names the two pen colours for specimen markup", () => {
    expect(INTERACTIVE_PENS.yellowWord).toBe("Yellow");
    expect(INTERACTIVE_PENS.greenWord).toBe("green");
  });
});
