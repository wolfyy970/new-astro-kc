import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sharedStyles = readFileSync("src/styles/base.css", "utf8");

describe("site-wide text wrapping", () => {
  it("balances editorial blocks while keeping list and table copy pretty-wrapped", () => {
    expect(sharedStyles).toMatch(
      /:where\(h1, h2, h3, h4, h5, h6\)\s*\{\s*text-wrap: balance;/s,
    );
    expect(sharedStyles).toMatch(
      /:where\(p, blockquote, figcaption, dd\)\s*\{\s*text-wrap: balance;/s,
    );
    expect(sharedStyles).toContain("text-wrap: pretty");
    expect(sharedStyles).toContain(".hero-subtitle");
    expect(sharedStyles).toContain(".project-entry-copy > p");
  });
});
