import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("shared interaction organisms", () => {
  it("keeps revealed hotspot hover visibly stronger than its resting load", () => {
    const css = read("src/styles/global.css");

    expect(css).toContain("--mark-a-hover-strong: 0.96;");
    expect(css).toMatch(
      /\.hotspot\.scroll-revealed:not\(\.active\):hover,[\s\S]*?--hs-a: calc\(var\(--mark-a-hover-strong\)/,
    );
  });

  it("uses one centred brand frame for notes and popover media", () => {
    const css = read("src/styles/global.css");
    const media = read("src/scripts/note-media.ts");

    expect(media).toContain('" brand-frame"');
    expect(css).toMatch(
      /\.brand-frame\s*\{[\s\S]*?justify-content: center;[\s\S]*?min-height: 132px;/,
    );
    expect(css).toContain(".brand-frame > .popover-img");
    expect(css).toContain(".brand-frame > .sa-img");
  });
});
