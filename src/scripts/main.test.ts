import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "src/scripts/main.ts"),
  "utf8",
);

describe("resume interaction bootstrap contract", () => {
  it("binds the sheet router before deferred layout work", () => {
    const routerBinding = source.indexOf("initPopoverEngine(popovers);");
    const deferredLayout = source.indexOf("requestAnimationFrame");

    expect(routerBinding).toBeGreaterThan(-1);
    expect(deferredLayout).toBeGreaterThan(-1);
    expect(routerBinding).toBeLessThan(deferredLayout);
  });

  it("keeps deferred annotation cleanup paired with the second frame", () => {
    expect(source).toContain("cancelAnimationFrame(outerFrame);");
    expect(source).toContain("cancelAnimationFrame(innerFrame);");
    expect(source).toContain("cleanupPopoverEngine();");
    expect(source).toContain("cleanupAnnotations();");
  });
});
