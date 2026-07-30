import { describe, expect, it } from "vitest";
import { calculateAssistDelta } from "./note-geometry";
import {
  ASSIST_BOTTOM_GAP,
  ASSIST_NOTE_TOP,
  ASSIST_TERM_MIN,
} from "./constants";

describe("calculateAssistDelta", () => {
  it("reveals the final expanded bottom with the configured air gap", () => {
    const viewportHeight = 900;
    const noteTop = 300;
    const noteHeight = 200;
    const growth = 450;

    expect(
      calculateAssistDelta({
        growth,
        noteHeight,
        noteTop,
        termTop: 500,
        viewportHeight,
      }),
    ).toBe(
      noteTop + noteHeight + growth - (viewportHeight - ASSIST_BOTTOM_GAP),
    );
  });

  it("never carries the note or triggering term above their bounds", () => {
    expect(
      calculateAssistDelta({
        growth: 900,
        noteHeight: 200,
        noteTop: 120,
        termTop: 50,
        viewportHeight: 600,
      }),
    ).toBe(Math.min(120 - ASSIST_NOTE_TOP, 50 - ASSIST_TERM_MIN));
  });

  it("returns a non-positive delta when the expanded note already fits", () => {
    expect(
      calculateAssistDelta({
        growth: 0,
        noteHeight: 100,
        noteTop: 100,
        termTop: 100,
        viewportHeight: 900,
      }),
    ).toBeLessThanOrEqual(0);
  });
});
