import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildContentNode, requireGlobal, requireEl } from "./dom";
import { ANNOTATION_TEXT_SENTENCES } from "./constants";
import type { PopoverData } from "../types/content";

// The truncation tests are driven by the constant rather than a literal, so
// retuning how much the margin shows stays a one-line change instead of a
// test-rewrite. (It was hardcoded to 3, which is what broke when the margin
// note became a one-sentence glance.)
const LIMIT = ANNOTATION_TEXT_SENTENCES;

/** "Sentence 1. Sentence 2. … Sentence n." */
function sentences(n: number): string {
  return Array.from({ length: n }, (_, i) => `Sentence ${i + 1}.`).join(" ");
}

describe("buildContentNode", () => {
  const mockData: PopoverData = {
    label: "Test Label",
    text: "This is sentence one. This is sentence two. This is sentence three.",
    img: "test.jpg",
    stat: "99%",
    quote: "A test quote.",
    link: "https://example.com",
    linkText: "Learn More",
  };

  function fragmentToHTML(frag: DocumentFragment): string {
    const div = document.createElement("div");
    div.appendChild(frag);
    return div.innerHTML;
  }

  it("should build full HTML/DOM for popover (wrapBody: true)", () => {
    const frag = buildContentNode(mockData, "popover", { wrapBody: true });
    const html = fragmentToHTML(frag);
    expect(html).toContain('class="popover-body"');
    expect(html).toContain('class="popover-img"');
    expect(html).toContain('src="test.jpg"');
    expect(html).toContain('class="popover-label"');
    expect(html).toContain("Test Label");
    expect(html).toContain("99%");
    expect(html).toContain("A test quote.");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("Learn More");
    expect(html).toContain("This is sentence three."); // Full text
  });

  it("should truncate a margin note at ANNOTATION_TEXT_SENTENCES when there are more", () => {
    const frag = buildContentNode(
      { ...mockData, text: sentences(LIMIT + 2) },
      "sa",
      { truncateText: true, prependRule: true },
    );
    const html = fragmentToHTML(frag);
    expect(html).toContain('class="sa-rule"');
    expect(html).toContain(`Sentence ${LIMIT}.`);
    expect(html).not.toContain(`Sentence ${LIMIT + 1}.`);
  });

  it("should NOT truncate a margin note that already fits", () => {
    const frag = buildContentNode(
      { ...mockData, text: sentences(LIMIT) },
      "sa",
      {
        truncateText: true,
      },
    );
    expect(fragmentToHTML(frag)).toContain(`Sentence ${LIMIT}.`);
  });

  it("should not split on abbreviations like U.S. when truncating", () => {
    const parts = [
      "Two U.S. patents granted in 2015.",
      ...Array.from({ length: LIMIT }, (_, i) => `Follow-up ${i + 1}.`),
    ];
    const frag = buildContentNode(
      { ...mockData, text: parts.join(" ") },
      "sa",
      { truncateText: true },
    );
    const html = fragmentToHTML(frag);
    // 'U.S.' must not read as a sentence boundary, so the opening sentence
    // survives intact and the overflow sentence is the one dropped.
    expect(html).toContain("Two U.S. patents granted in 2015.");
    expect(html).not.toContain(`Follow-up ${LIMIT}.`);
  });

  it("should handle missing optional fields", () => {
    const minimalData: PopoverData = {
      label: "Minimal",
      text: "Only text.",
    };
    const frag = buildContentNode(minimalData, "popover");
    const html = fragmentToHTML(frag);
    expect(html).not.toContain("img");
    expect(html).not.toContain("stat");
    expect(html).not.toContain("quote");
    expect(html).not.toContain("link");
    expect(html).toContain("Minimal");
    expect(html).toContain("Only text.");
  });
  it("should handle lack of linkText for link", () => {
    const noLinkText: PopoverData = {
      label: "No Link Text",
      text: "Text",
      link: "https://example.com",
    };
    const frag = buildContentNode(noLinkText, "popover");
    const html = fragmentToHTML(frag);
    expect(html).not.toContain("href");
  });

  it("should not append a period to text that was never truncated", () => {
    const parts = [
      ...Array.from({ length: LIMIT - 1 }, (_, i) => `Lead ${i + 1}.`),
      "Short final sentence without a period",
    ];
    const frag = buildContentNode(
      { label: "Text Fix", text: parts.join(" ") },
      "popover",
      { truncateText: true },
    );
    const html = fragmentToHTML(frag);
    expect(html).toContain("Short final sentence without a period");
    expect(html).not.toContain("Short final sentence without a period.");
  });

  // ── The glance / dig ladder ──
  // The margin note and the popover must not be two copies of one thing. These
  // lock in the split: the margin shows one figure and no link, the popover
  // shows everything.

  const richData: PopoverData = {
    label: "Rich Entry",
    text: sentences(LIMIT + 3),
    media: ["one.jpg", "two.jpg", "three.jpg"],
    link: "/case-study",
    linkText: "Read the case study",
  };

  it("should render the folio number on both surfaces", () => {
    const margin = fragmentToHTML(
      buildContentNode(richData, "sa", { folio: 7 }),
    );
    const popover = fragmentToHTML(
      buildContentNode(richData, "popover", { wrapBody: true, folio: 7 }),
    );
    expect(margin).toContain('class="sa-folio"');
    expect(margin).toContain(">7<");
    expect(popover).toContain('class="popover-folio"');
    expect(popover).toContain(">7<");
  });

  it("should omit the folio element entirely when no number is given", () => {
    const html = fragmentToHTML(buildContentNode(richData, "popover"));
    expect(html).not.toContain("popover-folio");
    expect(html).toContain('class="popover-label"');
  });

  it("thumb mode should show one figure and no carousel", () => {
    const html = fragmentToHTML(
      buildContentNode(richData, "sa", { mediaMode: "thumb" }),
    );
    expect(html).toContain('src="one.jpg"');
    expect(html).not.toContain('src="two.jpg"');
    expect(html).not.toContain("sa-carousel");
  });

  it("full mode should show every figure as a carousel", () => {
    const html = fragmentToHTML(
      buildContentNode(richData, "popover", { mediaMode: "full" }),
    );
    expect(html).toContain('src="one.jpg"');
    expect(html).toContain('src="three.jpg"');
    expect(html).toContain("popover-carousel");
  });

  it("should keep the case-study link out of the margin and in the popover", () => {
    const margin = fragmentToHTML(
      buildContentNode(richData, "sa", { includeLink: false }),
    );
    const popover = fragmentToHTML(
      buildContentNode(richData, "popover", { includeLink: true }),
    );
    expect(margin).not.toContain('href="/case-study"');
    expect(popover).toContain('href="/case-study"');
  });

  it("should give a margin note a real link, in both states", () => {
    // The collapsed note carries it too: reaching a project used to mean
    // expanding first and hunting for it at the foot of the column.
    const collapsed = fragmentToHTML(
      buildContentNode(richData, "sa", {
        truncateText: true,
        includeLink: true,
      }),
    );
    expect(collapsed).toContain('href="/case-study"');
    expect(collapsed).toContain('class="sa-link"');
    // The label is its own element so the underline belongs to the words.
    expect(collapsed).toContain('class="sa-link-label"');
  });

  it("should keep affordance glyphs out of the content string", () => {
    const html = fragmentToHTML(
      buildContentNode(richData, "popover", { includeLink: true }),
    );
    expect(html).not.toContain("\u2192");
  });

  it("should give each carousel figure a distinguishable description", () => {
    const html = fragmentToHTML(
      buildContentNode(richData, "popover", { mediaMode: "full" }),
    );
    // Previously every image carried the same label verbatim, so a screen
    // reader announced the identical string once per slide.
    expect(html).toContain("figure 1 of 3");
    expect(html).toContain("figure 3 of 3");
  });

  it("should not add figure numbering to a lone image", () => {
    const html = fragmentToHTML(
      buildContentNode(
        { label: "Solo", text: "Text.", img: "solo.jpg" },
        "popover",
      ),
    );
    expect(html).toContain('alt="Solo"');
    expect(html).not.toContain("figure 1 of 1");
  });

  it("should render a video element properly with correct fallback and autoplay disable structure", () => {
    const videoData: PopoverData = {
      label: "A Video",
      text: "Video summary",
      media: ["/vid1.mp4"],
    };
    const frag = buildContentNode(videoData, "popover");
    const html = fragmentToHTML(frag);

    // Assert single video wraps in play button since play is disabled for single/first items
    expect(html).toContain('class="popover-vid-wrap"');
    expect(html).toContain('class="popover-play-btn"');
    expect(html).toContain("vid1.mp4");
  });

  it("should gracefully build the full carousel structure when multiple items are present", () => {
    const multiData: PopoverData = {
      label: "Carousel",
      text: "Carousel desc",
      media: ["/img1.js", "/vid1.mp4"], // Testing mixed format
    };
    const frag = buildContentNode(multiData, "popover");
    const html = fragmentToHTML(frag);

    // Assert carousel wrapper presence
    expect(html).toContain('class="popover-carousel-wrap"');
    expect(html).toContain('class="popover-carousel-inner"');

    // Assert chevrons
    expect(html).toContain('class="popover-carousel-nav prev"');
    expect(html).toContain('class="popover-carousel-nav next"');

    // Assert dots
    expect(html).toContain('class="popover-carousel-dots"');
    expect(html).toContain('class="popover-carousel-dot active"');
  });

  it('should set type="button" on all dynamically created buttons (nav, dots, play)', () => {
    const multiData: PopoverData = {
      label: "Carousel",
      text: "Carousel desc",
      media: ["/img1.jpg", "/vid1.mp4"],
    };
    const container = document.createElement("div");
    container.appendChild(buildContentNode(multiData, "popover"));
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn.type).toBe("button");
    });
  });
});

describe("requireGlobal", () => {
  it("should return the value if present on window", () => {
    (window as any).__MOCK_GLOBAL__ = { test: 123 };
    const result = (requireGlobal as any)("__MOCK_GLOBAL__");
    expect(result.test).toBe(123);
    delete (window as any).__MOCK_GLOBAL__;
  });

  it("should throw if value is missing", () => {
    expect(() => (requireGlobal as any)("__NON_EXISTENT__")).toThrow(
      "window.__NON_EXISTENT__ is not set",
    );
  });
});

describe("requireEl", () => {
  it("should throw if element is missing", () => {
    expect(() => requireEl("ghost-id")).toThrow(
      "Required element #ghost-id not found",
    );
  });
});
