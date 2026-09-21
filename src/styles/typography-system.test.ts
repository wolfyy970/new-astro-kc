import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("shared typography system", () => {
  const tokens = read("src/styles/tokens.css");

  it("defines the complete public heading and quote scale in one place", () => {
    for (const role of [
      "page-title",
      "hero-title",
      "title-page",
      "heading-2",
      "heading-3",
      "heading-4",
      "quote-lead",
      "quote",
    ]) {
      expect(tokens).toContain(`--type-${role}:`);
    }
    expect(tokens).toContain("--type-meta-compact:");
  });

  it("wires each public surface to the appropriate shared roles", () => {
    expect(read("src/styles/global.css")).toMatch(
      /\.masthead-name[\s\S]*?font-size: var\(--type-title-page\)/,
    );
    expect(read("src/styles/work-index.css")).toMatch(
      /\.work-index-title[\s\S]*?font-size: var\(--type-page-title\)/,
    );
    expect(read("src/styles/references.css")).toMatch(
      /\.reference-feature blockquote[\s\S]*?font-size: var\(--type-quote-lead\)/,
    );
    expect(read("src/styles/case-study.css")).toContain(
      "--cs-hero-title: var(--type-hero-title)",
    );
    expect(read("src/pages/login.astro")).toContain(
      "font-size: var(--type-title-page)",
    );
    expect(read("src/pages/design.astro")).toContain(
      "font-size: var(--type-title-page)",
    );
    expect(read("src/components/SiteNav.astro")).toContain(
      "font-size: var(--type-meta-compact)",
    );
    expect(read("src/pages/design.astro")).toContain(
      '<main class="design-page" id="main-content">',
    );
    expect(read("src/components/SiteNav.astro")).toContain(
      "data-resume-back={",
    );
    expect(read("src/scripts/return-to-resume.ts")).toContain(
      "[data-resume-back]",
    );
  });
});
