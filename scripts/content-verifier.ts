import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";
import {
  caseStudyDataSchema,
  manifestSchema,
  popoverMapSchema,
  resumeSchema,
} from "../src/content/schema.ts";
import type {
  AuthoredPopoverMap,
  CaseStudyData,
  CaseStudySectionData,
} from "../src/types/content.ts";
import {
  extractHotspotKeys,
  findDuplicateHotspots,
} from "../src/utils/validation.ts";

interface VerificationStats {
  caseStudyCount: number;
  hotspotCount: number;
  popoverCount: number;
}

interface VerificationResult {
  errors: string[];
  stats: VerificationStats;
}

interface RepositoryPaths {
  caseStudiesDir: string;
  manifest: string;
  pagesDir: string;
  popovers: string;
  publicDir: string;
  resume: string;
}

function repositoryPaths(rootDir: string): RepositoryPaths {
  const caseStudiesDir = path.join(rootDir, "src/content/case-studies");
  return {
    caseStudiesDir,
    manifest: path.join(caseStudiesDir, "manifest.json"),
    pagesDir: path.join(rootDir, "src/pages"),
    popovers: path.join(rootDir, "src/content/popovers.json"),
    publicDir: path.join(rootDir, "public"),
    resume: path.join(rootDir, "src/content/resume.json"),
  };
}

function readJson(file: string, label: string, errors: string[]): unknown {
  if (!fs.existsSync(file)) {
    errors.push(`${label}: file not found`);
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  } catch (error) {
    errors.push(`${label}: failed to parse JSON — ${(error as Error).message}`);
    return undefined;
  }
}

function parseSchema<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  label: string,
  errors: string[],
): z.output<Schema> | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  result.error.issues.forEach((issue) => {
    errors.push(
      `${label}: ${issue.path.join(".") || "(root)"} — ${issue.message}`,
    );
  });
  return null;
}

function publicAssetFile(publicDir: string, assetPath: string): string | null {
  const publicRoot = path.resolve(publicDir);
  const candidate = path.resolve(publicRoot, assetPath.replace(/^\/+/, ""));
  return candidate.startsWith(`${publicRoot}${path.sep}`) ? candidate : null;
}

function checkAsset(
  publicDir: string,
  assetPath: string,
  context: string,
  errors: string[],
): void {
  const file = publicAssetFile(publicDir, assetPath);
  if (!file) {
    errors.push(`Invalid public path for ${context}: "${assetPath}"`);
  } else if (!fs.existsSync(file)) {
    errors.push(`Missing media for ${context}: "${assetPath}"`);
  }
}

function checkPopoverAssets(
  popovers: AuthoredPopoverMap,
  publicDir: string,
  errors: string[],
): void {
  Object.entries(popovers).forEach(([key, popover]) => {
    if (popover.img) {
      checkAsset(publicDir, popover.img, `popover "${key}".img`, errors);
    }
    if (popover.brandMark) {
      checkAsset(
        publicDir,
        popover.brandMark,
        `popover "${key}".brandMark`,
        errors,
      );
    }
    popover.media?.forEach((media, index) => {
      checkAsset(publicDir, media, `popover "${key}".media[${index}]`, errors);
    });
  });
}

function sectionAssetReferences(
  section: CaseStudySectionData,
): ReadonlyArray<readonly [path: string, field: string]> {
  switch (section.type) {
    case "cardGrid":
      return section.cards.map((card, index) => [
        card.image,
        `cards[${index}].image`,
      ]);
    case "mixedGrid":
      return [
        [section.primaryCard.image, "primaryCard.image"],
        ...section.secondaryCards.map(
          (card, index) =>
            [card.image, `secondaryCards[${index}].image`] as const,
        ),
      ];
    case "featureRow":
    case "largeImage":
    case "fullBleed":
    case "captionedImage":
      return [[section.image, "image"]];
    case "photoGrid":
      return section.images.map((image, index) => [
        image.src,
        `images[${index}].src`,
      ]);
    case "video":
      return [
        [section.video, "video"],
        ...(section.poster ? ([[section.poster, "poster"]] as const) : []),
      ];
    case "externalVideo":
    case "textOnly":
    case "statRow":
      return [];
  }
}

function checkCaseStudyAssets(
  study: CaseStudyData,
  slug: string,
  publicDir: string,
  errors: string[],
): void {
  if (study.meta.ogImage) {
    checkAsset(
      publicDir,
      study.meta.ogImage,
      `case-studies/${slug}.json meta.ogImage`,
      errors,
    );
  }

  if ("image" in study.hero) {
    checkAsset(
      publicDir,
      study.hero.image,
      `case-studies/${slug}.json hero.image`,
      errors,
    );
  } else {
    checkAsset(
      publicDir,
      study.hero.background,
      `case-studies/${slug}.json hero.background`,
      errors,
    );
  }

  study.sections.forEach((section) => {
    sectionAssetReferences(section).forEach(([assetPath, field]) => {
      checkAsset(
        publicDir,
        assetPath,
        `case-studies/${slug}.json sections[${section.key}].${field}`,
        errors,
      );
    });
  });
}

function jsonStudySlugs(caseStudiesDir: string): Set<string> {
  if (!fs.existsSync(caseStudiesDir)) return new Set();
  return new Set(
    fs
      .readdirSync(caseStudiesDir)
      .filter((file) => file.endsWith(".json") && file !== "manifest.json")
      .map((file) => path.basename(file, ".json")),
  );
}

function checkInventory(
  manifestSlugs: Set<string>,
  studySlugs: Set<string>,
  pagesDir: string,
  errors: string[],
): void {
  studySlugs.forEach((slug) => {
    if (!manifestSlugs.has(slug)) {
      errors.push(
        `Case study "${slug}" has JSON content but no manifest entry`,
      );
    }
  });

  manifestSlugs.forEach((slug) => {
    if (!studySlugs.has(slug)) {
      errors.push(`Manifest references "${slug}" but ${slug}.json is missing`);
    }
    if (!fs.existsSync(path.join(pagesDir, `${slug}.astro`))) {
      errors.push(`Manifest references "${slug}" but its page is missing`);
    }
  });
}

function checkHotspotParity(
  resume: unknown,
  popovers: AuthoredPopoverMap | null,
  errors: string[],
): number {
  const hotspotKeys = extractHotspotKeys(resume);

  findDuplicateHotspots(resume).forEach((key) => {
    errors.push(`Duplicate hotspot key found in resume: "${key}"`);
  });

  if (popovers) {
    hotspotKeys.forEach((key) => {
      if (!popovers[key]) {
        errors.push(`Missing popover data for hotspot key: "${key}"`);
      }
    });
    Object.keys(popovers).forEach((key) => {
      if (!hotspotKeys.has(key)) {
        errors.push(`Popover "${key}" is not referenced by the resume`);
      }
    });
  }

  return hotspotKeys.size;
}

function checkPopoverLinks(
  popovers: AuthoredPopoverMap,
  manifestSlugs: Set<string>,
  errors: string[],
): void {
  Object.entries(popovers).forEach(([key, popover]) => {
    if (!popover.link) return;
    const slug = popover.link.replace(/^\/+/, "");
    if (!manifestSlugs.has(slug)) {
      errors.push(
        `Popover "${key}" links to "${popover.link}", which is absent from the manifest`,
      );
    }
  });
}

export function verifyContent(rootDir: string): VerificationResult {
  const paths = repositoryPaths(rootDir);
  const errors: string[] = [];

  const rawResume = readJson(paths.resume, "Resume", errors);
  const rawPopovers = readJson(paths.popovers, "Popovers", errors);
  const rawManifest = readJson(paths.manifest, "Manifest", errors);

  parseSchema(resumeSchema, rawResume, "Resume", errors);
  const popovers = parseSchema(
    popoverMapSchema,
    rawPopovers,
    "Popovers",
    errors,
  );
  const manifest = parseSchema(manifestSchema, rawManifest, "Manifest", errors);

  const hotspotCount = checkHotspotParity(rawResume, popovers, errors);
  if (popovers) checkPopoverAssets(popovers, paths.publicDir, errors);

  const studySlugs = jsonStudySlugs(paths.caseStudiesDir);
  const manifestSlugs = new Set(manifest?.map(({ slug }) => slug) ?? []);
  checkInventory(manifestSlugs, studySlugs, paths.pagesDir, errors);
  if (popovers) checkPopoverLinks(popovers, manifestSlugs, errors);

  manifest?.forEach(({ slug }) => {
    const rawStudy = readJson(
      path.join(paths.caseStudiesDir, `${slug}.json`),
      `case-studies/${slug}.json`,
      errors,
    );
    const study = parseSchema(
      caseStudyDataSchema,
      rawStudy,
      `case-studies/${slug}.json`,
      errors,
    );
    if (study) checkCaseStudyAssets(study, slug, paths.publicDir, errors);
  });

  return {
    errors,
    stats: {
      caseStudyCount: manifest?.length ?? 0,
      hotspotCount,
      popoverCount: popovers ? Object.keys(popovers).length : 0,
    },
  };
}
