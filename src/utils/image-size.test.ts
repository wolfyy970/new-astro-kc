import { describe, it, expect, vi, afterEach } from "vitest";
import { publicImageSize } from "./image-size";

// Deliberately unmocked: real sharp, real files under public/. The whole point
// of this helper is that the numbers it reports match the assets on disk, and a
// mocked sharp would only prove that the mock returns what it was told to.
// Reading an image header is cheap.

describe("publicImageSize", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports the real pixel dimensions of a file in public/", async () => {
    // Felix's box art: portrait, and the reason the case-study components stopped
    // hardcoding their own width/height.
    expect(await publicImageSize("/images/felix/cover.webp")).toEqual({
      width: 765,
      height: 969,
    });
  });

  it("reads a landscape asset just as accurately", async () => {
    expect(await publicImageSize("/images/felix/contents-menu.png")).toEqual({
      width: 1920,
      height: 1440,
    });
  });

  it("reports dimensions that disagree with the old hardcoded defaults", async () => {
    // largeImage defaulted to 1300x800 for every image, and FeatureRow to
    // 800x600. This asset is neither, which is exactly why those defaults
    // produced squashed pictures.
    const size = await publicImageSize("/images/sparks-grove/gala_5.jpg");
    expect(size).not.toBeNull();
    expect(size!.width / size!.height).toBeCloseTo(3 / 2, 2);
    expect(size).not.toEqual({ width: 800, height: 600 });
  });

  it("returns null for a missing file instead of throwing", async () => {
    // Warn-and-degrade: a bad path is a content error worth surfacing, but it
    // must not take the build down. Callers supply their own fallback.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await publicImageSize("/images/felix/no-such-file.png")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("treats the leading slash as a site path, not a filesystem root", async () => {
    // Joining "/images/..." naively would escape to the filesystem root and
    // never resolve. Passing the same path without the slash must agree.
    const withSlash = await publicImageSize("/images/felix/cover.webp");
    const withoutSlash = await publicImageSize("images/felix/cover.webp");
    expect(withoutSlash).toEqual(withSlash);
  });

  it("memoises, so a repeated reference costs one read", async () => {
    const first = await publicImageSize("/images/felix/making-faces.png");
    const second = await publicImageSize("/images/felix/making-faces.png");
    // Same object identity proves the cache was hit rather than the header
    // being re-parsed — a photo grid can name one asset several times.
    expect(second).toBe(first);
  });

  it("caches the null result too, so a missing file is not re-checked", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const warn = console.warn as unknown as ReturnType<typeof vi.fn>;
    await publicImageSize("/images/felix/also-missing.png");
    const afterFirst = warn.mock.calls.length;
    await publicImageSize("/images/felix/also-missing.png");
    expect(warn.mock.calls.length).toBe(afterFirst);
  });
});
