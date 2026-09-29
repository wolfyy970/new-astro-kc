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
    expect(lightbox).toMatch(/max-height:\s*calc\(94dvh\s*-\s*132px\)/);
    expect(lightbox).toContain("object-fit: contain;");
    expect(page).toContain("leadStats={cs.leadStats}");
    expect(read("src/components/case-studies/StatRow.astro")).toContain(
      'compact && "is-compact"',
    );
  });
});
