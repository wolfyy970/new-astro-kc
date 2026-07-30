import { describe, expect, it } from "vitest";
import { safeEqual } from "./auth";

describe("safeEqual", () => {
  it("accepts equal UTF-8 strings", () => {
    expect(safeEqual("same password", "same password")).toBe(true);
    expect(safeEqual("sämé", "sämé")).toBe(true);
  });

  it("rejects same-length and different-length values without throwing", () => {
    expect(safeEqual("secret", "secrex")).toBe(false);
    expect(() => safeEqual("short", "much longer")).not.toThrow();
    expect(safeEqual("short", "much longer")).toBe(false);
  });
});
