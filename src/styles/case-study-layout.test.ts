import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("case-study and work-cover layout", () => {
  it("keeps the linked case-study cover image inside the whole-card link", () => {
    const workPage = read("src/pages/work.astro");

    expect(workPage).toMatch(
      /<a\s+class="work-card"[\s\S]*?href=\{`\/\$\{study\.slug\}`\}[\s\S]*?<figure[\s\S]*?<img[\s\S]*?src=\{study\.ogImage\}[\s\S]*?<\/a>/,
    );
    expect(workPage).toContain('study.coverFit === "contain"');

    const workStyles = read("src/styles/work-index.css");
    expect(workStyles).toMatch(
      /\.work-card-media--contain img\s*\{[^}]*object-fit:\s*contain/s,
    );
  });

  it("keeps the magnifier lens clear of Close: controls live in a header outside the image stage", () => {
    const lightbox = read(
      "src/components/case-studies/CaseStudyImageLightbox.astro",
    );
    const header = lightbox.indexOf('class="lightbox-header"');
    const stage = lightbox.indexOf("data-case-study-stage");
    const close = lightbox.indexOf("data-case-study-image-close");
    const lens = lightbox.indexOf("data-case-study-lens");

    expect(header).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(header);
    expect(close).toBeLessThan(stage);
    expect(lens).toBeGreaterThan(stage);
    expect(lightbox).toContain('aria-label="Image magnifier"');
    expect(lightbox).toContain('aria-live="polite"');
    expect(lightbox).toContain("data-case-study-magnifier-toggle");
    expect(lightbox).toMatch(
      /\.lightbox-lens\s*\{[^}]*pointer-events:\s*none/s,
    );
    // Tall captures fit the width and scroll instead of shrinking to fit.
    expect(lightbox).toMatch(
      /\[data-orientation="tall"\][\s\S]*?\.lightbox-stage\s*\{[^}]*place-items:\s*start center/,
    );
    expect(lightbox).toMatch(/overscroll-behavior:\s*contain/);
  });

  it("uses the shared, responsive rhythm for repeated feature rows", () => {
    const caseStudyStyles = read("src/styles/case-study.css");
    const featureRow = read("src/components/case-studies/FeatureRow.astro");

    expect(caseStudyStyles).toContain(
      "--cs-pad-feature: clamp(88px, 7vw, 112px) 80px;",
    );
    expect(featureRow).toContain("padding: var(--cs-pad-feature);");
    expect(featureRow).toContain("padding: var(--cs-pad-feature-tablet);");
    expect(featureRow).toContain("padding: var(--cs-pad-media-mobile);");
  });

  it("routes case-study evidence images through the shared enlarged-image viewer", () => {
    const mediaComponents = [
      "CaseStudyHero.astro",
      "FeatureRow.astro",
      "PhotoGrid.astro",
      "CaptionedImage.astro",
      "FullBleedSection.astro",
      "LargeImageSection.astro",
      "ShowcaseCard.astro",
    ];

    for (const component of mediaComponents) {
      expect(
        read(`src/components/case-studies/${component}`),
        `${component} should use the shared trigger`,
      ).toContain("CaseStudyImageTrigger");
    }

    // Two-tier delivery: the inline picture is the light display variant, the
    // trigger keeps the full-resolution original for the viewer and its lens.
    for (const component of mediaComponents) {
      const source = read(`src/components/case-studies/${component}`);
      expect(
        source,
        `${component} should resolve a display variant for its inline image`,
      ).toContain("resolveDisplayImage");
      expect(source).toMatch(/display[?]?\.src|displaySrc/);
    }

    const page = read("src/components/case-studies/CaseStudyPage.astro");
    const trigger = read(
      "src/components/case-studies/CaseStudyImageTrigger.astro",
    );
    const lightbox = read(
      "src/components/case-studies/CaseStudyImageLightbox.astro",
    );

    expect(page).toContain("<CaseStudyImageLightbox />");
    expect(trigger).toContain("data-case-study-image-trigger");
    expect(trigger).toContain("aria-label={`View larger image: ${alt}`}");
    expect(lightbox).toContain("data-case-study-image-close");
    expect(lightbox).toMatch(
      /max-height:\s*calc\(94dvh\s*-\s*var\(--lightbox-chrome\)\)/,
    );
    expect(lightbox).toContain("object-fit: contain;");
    expect(page).toContain("leadStats={cs.leadStats}");
    expect(read("src/components/case-studies/StatRow.astro")).toContain(
      'compact && "is-compact"',
    );
  });
});
