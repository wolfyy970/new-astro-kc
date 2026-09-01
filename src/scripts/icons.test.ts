import { describe, it, expect } from "vitest";
import {
  ICON_CHEVRON_NEXT,
  ICON_CHEVRON_PREV,
  ICON_PLAY,
  ICON_X,
} from "./icons";

describe("icons", () => {
  it("wraps outline icons with shared stroke attributes", () => {
    for (const icon of [ICON_X, ICON_CHEVRON_PREV, ICON_CHEVRON_NEXT]) {
      expect(icon).toContain('viewBox="0 0 24 24"');
      expect(icon).toContain('stroke="currentColor"');
      expect(icon).toContain('aria-hidden="true"');
      expect(icon).toContain('focusable="false"');
    }
  });

  it("uses fill for the play icon", () => {
    expect(ICON_PLAY).toContain('fill="currentColor"');
    expect(ICON_PLAY).toContain('width="20"');
  });
});
