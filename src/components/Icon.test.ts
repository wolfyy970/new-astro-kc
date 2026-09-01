import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/Icon.astro"),
  "utf8",
);

describe("Icon component imports", () => {
  it("loads only the curated Tabler SVG modules", () => {
    expect(source).not.toMatch(/from\s+["']@tabler\/icons-astro/);

    const directImports =
      source.match(/@tabler\/icons\/outline\/[^"']+\.svg\?raw/g) ?? [];

    expect(directImports.sort()).toEqual([
      "@tabler/icons/outline/arrows-horizontal.svg?raw",
      "@tabler/icons/outline/eye-off.svg?raw",
      "@tabler/icons/outline/eye.svg?raw",
      "@tabler/icons/outline/moon.svg?raw",
      "@tabler/icons/outline/sun.svg?raw",
    ]);
  });
});
