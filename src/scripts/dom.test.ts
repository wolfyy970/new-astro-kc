import { describe, it, expect, vi } from "vitest";
import { requireGlobal, requireEl } from "./dom";
import { buildContentNode, splitAtSentences } from "./note-content";
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

  it("reserves the exact optimized image geometry", () => {
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode(
        {
          label: "Portrait",
          text: "Portrait evidence.",
          img: { src: "/portrait.webp", width: 213, height: 400 },
        },
        "popover",
      ),
    );

    const image = container.querySelector<HTMLImageElement>("img")!;
    expect(image.src).toContain("/portrait.webp");
    expect(image.width).toBe(213);
    expect(image.height).toBe(400);
  });

  it("should split a glance note: lead visible, continuation inside sa-more", () => {
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode({ ...mockData, text: sentences(LIMIT + 2) }, "sa", {
        splitGlance: true,
        prependRule: true,
      }),
    );
    expect(container.querySelector(".sa-rule")).toBeTruthy();

    // The lead sentence is the always-visible glance…
    const lead = container.querySelector(".sa-text");
    expect(lead?.textContent).toContain(`Sentence ${LIMIT}.`);
    expect(lead?.textContent).not.toContain(`Sentence ${LIMIT + 1}.`);

    // …and the remainder is rendered too — the note is never re-rendered on
    // expand — but waits inside the collapsed continuation wrapper.
    const more = container.querySelector(".sa-more .sa-more-inner");
    expect(more?.textContent).toContain(`Sentence ${LIMIT + 1}.`);
    expect(more?.textContent).not.toContain(`Sentence ${LIMIT}.`);
  });

  it("keeps the quote in the continuation, not the glance", () => {
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode({ ...mockData, text: sentences(LIMIT + 2) }, "sa", {
        splitGlance: true,
      }),
    );
    expect(container.querySelector(".sa-more .sa-quote")).toBeTruthy();
  });

  it("renders no continuation wrapper when the note already fits", () => {
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode({ label: "Fits", text: sentences(LIMIT) }, "sa", {
        splitGlance: true,
      }),
    );
    expect(container.querySelector(".sa-text")?.textContent).toContain(
      `Sentence ${LIMIT}.`,
    );
    expect(container.querySelector(".sa-more")).toBeNull();
  });

  it("should not split on abbreviations like U.S.", () => {
    const parts = [
      "Two U.S. patents granted in 2015.",
      ...Array.from({ length: LIMIT }, (_, i) => `Follow-up ${i + 1}.`),
    ];
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode({ ...mockData, text: parts.join(" ") }, "sa", {
        splitGlance: true,
      }),
    );
    // 'U.S.' must not read as a sentence boundary, so the opening sentence
    // survives intact in the glance and the follow-ups wait in the
    // continuation.
    expect(container.querySelector(".sa-text")?.textContent).toBe(
      "Two U.S. patents granted in 2015.",
    );
    expect(container.querySelector(".sa-more")?.textContent).toContain(
      `Follow-up ${LIMIT}.`,
    );
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

  it("splitAtSentences never appends a period to text that was not split", () => {
    const parts = [
      ...Array.from({ length: LIMIT - 1 }, (_, i) => `Lead ${i + 1}.`),
      "Short final sentence without a period",
    ];
    const { lead, rest } = splitAtSentences(parts.join(" "), LIMIT);
    expect(lead).toBe(parts.join(" "));
    expect(rest).toBe("");
  });

  it("splitAtSentences closes the lead's final period when it does split", () => {
    const { lead, rest } = splitAtSentences(sentences(LIMIT + 2), LIMIT);
    expect(lead.endsWith(".")).toBe(true);
    expect(lead).toContain(`Sentence ${LIMIT}.`);
    expect(rest).toContain(`Sentence ${LIMIT + 1}.`);
    expect(rest).not.toContain(`Sentence ${LIMIT}.`);
  });

  // ── The glance / dig ladder ──
  // Both surfaces share the complete media set and project hierarchy. The
  // margin truncates only its narrative until expanded.

  const richData: PopoverData = {
    label: "Rich Entry",
    text: sentences(LIMIT + 3),
    media: ["one.jpg", "two.jpg", "three.jpg"],
    link: "/case-study",
    linkText: "Read the case study",
  };

  it("should render the descriptive label without decorative numbering", () => {
    const margin = fragmentToHTML(buildContentNode(richData, "sa"));
    const popover = fragmentToHTML(
      buildContentNode(richData, "popover", { wrapBody: true }),
    );
    expect(margin).toContain('class="sa-label"');
    expect(popover).toContain('class="popover-label"');
    expect(margin).not.toContain("sa-folio");
    expect(popover).not.toContain("popover-folio");
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

  it("places a project link directly after media and before the narrative", () => {
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode(richData, "popover", {
        wrapBody: true,
        mediaMode: "full",
      }),
    );

    const carousel = container.querySelector(".popover-carousel-wrap");
    const link = container.querySelector(".popover-link");
    const body = container.querySelector(".popover-body");

    expect(carousel?.nextElementSibling).toBe(link);
    expect(link?.nextElementSibling).toBe(body);
  });

  it("uses the same project hierarchy in wide marginalia", () => {
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode(richData, "sa", {
        mediaMode: "full",
        includeLink: true,
      }),
    );

    const carousel = container.querySelector(".sa-carousel-wrap");
    const link = container.querySelector(".sa-link");
    const head = container.querySelector(".sa-head");
    const text = container.querySelector(".sa-text");

    expect(carousel?.nextElementSibling).toBe(link);
    expect(link?.nextElementSibling).toBe(head);
    expect(head?.nextElementSibling).toBe(text);
  });

  it("places a no-media project link after context and before narrative", () => {
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode(
        {
          label: "No image",
          stat: "42%",
          text: "Longer explanation.",
          link: "/project",
          linkText: "View project",
        },
        "popover",
        { wrapBody: true },
      ),
    );

    const body = container.querySelector(".popover-body");
    expect(body?.children[0].classList.contains("popover-head")).toBe(true);
    expect(body?.children[1].classList.contains("popover-stat")).toBe(true);
    expect(body?.children[2].classList.contains("popover-link")).toBe(true);
    expect(body?.children[3].classList.contains("popover-text")).toBe(true);
  });

  it("places a no-media marginalia link after context and before narrative", () => {
    const container = document.createElement("div");
    container.appendChild(
      buildContentNode(
        {
          label: "No image",
          stat: "42%",
          text: "Longer explanation.",
          link: "/project",
          linkText: "View project",
        },
        "sa",
        { includeLink: true },
      ),
    );

    expect(container.children[0].classList.contains("sa-head")).toBe(true);
    expect(container.children[1].classList.contains("sa-stat")).toBe(true);
    expect(container.children[2].classList.contains("sa-link")).toBe(true);
    expect(container.children[3].classList.contains("sa-text")).toBe(true);
  });

  it("should give a margin note a real link, in both states", () => {
    // The collapsed note carries it too: reaching a project used to mean
    // expanding first and hunting for it at the foot of the column.
    const collapsed = fragmentToHTML(
      buildContentNode(richData, "sa", {
        splitGlance: true,
        includeLink: true,
      }),
    );
    expect(collapsed).toContain('href="/case-study"');
    expect(collapsed).toContain("gateway-link");
    expect(collapsed).toMatch(/\bsa-link\b/);
    // The label is its own element so the underline belongs to the words.
    expect(collapsed).toMatch(/\bsa-link-label\b/);
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

  it("sets the issuer's device on the label line of every surface", () => {
    const brandedData: PopoverData = {
      label: "Apple Design Award",
      text: "Award context.",
      img: "award.png",
      brandMark: "apple-rainbow.svg",
      brandMarkAlt: "Period Apple Computer rainbow logo",
    };

    for (const prefix of ["popover", "sa"] as const) {
      const container = document.createElement("div");
      container.appendChild(
        buildContentNode(brandedData, prefix, { mediaMode: "full" }),
      );

      // The mark lives in the head row — apparatus, not a second figure.
      const device = container.querySelector(
        `.${prefix}-head .${prefix}-brand-mark`,
      ) as HTMLImageElement;
      expect(device).toBeTruthy();
      expect(device.getAttribute("src")).toBe("apple-rainbow.svg");
      expect(device.getAttribute("alt")).toBe(
        "Period Apple Computer rainbow logo",
      );

      // The old media-grid composition is gone.
      expect(
        container.querySelector(`.${prefix}-media--with-brand`),
      ).toBeNull();
      expect(
        container.querySelector(`.${prefix}-media .${prefix}-brand-mark`),
      ).toBeNull();
    }
  });

  it("composes the issuer's device with the stat when one exists", () => {
    const hallmarkData: PopoverData = {
      label: "Apple Design Award",
      text: "Award context.",
      stat: "1994",
      brandMark: "apple-rainbow.svg",
    };

    const container = document.createElement("div");
    container.appendChild(buildContentNode(hallmarkData, "sa"));

    // The device vouches the figure — "(apple) 1994" is one hallmark — so it
    // sits inside the stat, not on the label line.
    const stat = container.querySelector(".sa-stat");
    expect(stat?.classList.contains("sa-stat--device")).toBe(true);
    expect(stat?.querySelector(".sa-brand-mark")).toBeTruthy();
    expect(stat?.textContent).toBe("1994");
    expect(container.querySelector(".sa-head .sa-brand-mark")).toBeNull();
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

  it("should advance the carousel when the next button is clicked", () => {
    const container = document.createElement("div");
    container.appendChild(buildContentNode(richData, "sa"));

    const carousel = container.querySelector(".sa-carousel") as HTMLElement;
    const slides =
      container.querySelectorAll<HTMLElement>(".sa-carousel-slide");
    const scrollTo = vi.fn();
    Object.defineProperty(carousel, "scrollTo", {
      value: scrollTo,
      configurable: true,
    });
    Object.defineProperty(slides[0], "offsetLeft", {
      value: 10,
      configurable: true,
    });
    Object.defineProperty(slides[1], "offsetLeft", {
      value: 240,
      configurable: true,
    });

    const next = container.querySelector(
      ".sa-carousel-nav.next",
    ) as HTMLButtonElement;
    next.click();

    expect(scrollTo).toHaveBeenCalledWith({
      left: 230,
      behavior: "smooth",
    });
    expect(
      container
        .querySelector('[aria-label="Go to slide 2"]')
        ?.classList.contains("active"),
    ).toBe(true);
  });

  it("wraps at the ends — the strip is a loop, so both chevrons always work", () => {
    const container = document.createElement("div");
    container.appendChild(buildContentNode(richData, "sa"));

    const carousel = container.querySelector(".sa-carousel") as HTMLElement;
    const slides =
      container.querySelectorAll<HTMLElement>(".sa-carousel-slide");
    const scrollTo = vi.fn();
    Object.defineProperty(carousel, "scrollTo", {
      value: scrollTo,
      configurable: true,
    });
    slides.forEach((slide, i) =>
      Object.defineProperty(slide, "offsetLeft", {
        value: i * 300,
        configurable: true,
      }),
    );

    const prev = container.querySelector(
      ".sa-carousel-nav.prev",
    ) as HTMLButtonElement;
    const next = container.querySelector(
      ".sa-carousel-nav.next",
    ) as HTMLButtonElement;

    // From the first slide, "previous" carries round to the last…
    prev.click();
    expect(scrollTo).toHaveBeenLastCalledWith({
      left: 600,
      behavior: "smooth",
    });
    expect(
      container
        .querySelector('[aria-label="Go to slide 3"]')
        ?.classList.contains("active"),
    ).toBe(true);

    // …and from the last slide, "next" returns to the first.
    next.click();
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
    expect(
      container
        .querySelector('[aria-label="Go to slide 1"]')
        ?.classList.contains("active"),
    ).toBe(true);

    // Neither chevron ever retires — no inline fade, no pointer lockout.
    expect(prev.style.opacity).toBe("");
    expect(next.style.opacity).toBe("");
    expect(prev.style.pointerEvents).toBe("");
    expect(next.style.pointerEvents).toBe("");
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
