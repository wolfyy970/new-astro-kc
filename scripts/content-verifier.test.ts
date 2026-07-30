import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { verifyContent } from "./content-verifier.ts";

let fixtureRoot = "";

const writeJson = (relativePath: string, value: unknown): void => {
  const file = path.join(fixtureRoot, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
};

const validResume = {
  name: "Example",
  displayName: "Example",
  titleLine: "Designer",
  contact: {
    email: "example@example.com",
    phone: "555-0100",
    linkedin: "example",
    linkedinUrl: "https://example.com",
    location: "Atlanta",
  },
  hero: { tagline: "Tagline", credentials: ["Credential"] },
  summary: 'A <hotspot key="proof">claim</hotspot>.',
  experience: [
    {
      company: "Company",
      dates: "2020 - 2021",
      title: "Role",
      bullets: [],
    },
  ],
  education: [{ degree: "Degree", school: "School" }],
  patentsAndRecognition: {
    patents: "None",
    awards: "None",
    certifications: "None",
  },
};

const validPopovers = {
  proof: {
    label: "Proof",
    text: "Supporting detail.",
    img: "/images/proof.png",
    link: "/study",
    linkText: "View study",
  },
};

const validManifest = [
  {
    slug: "study",
    title: "Study",
    description: "Description",
    accent: "#123456",
    ogImage: "/images/proof.png",
  },
];

const validStudy = {
  meta: {
    title: "Study",
    description: "Description",
    accent: "#123456",
    ogImage: "/images/proof.png",
  },
  hero: {
    label: "Study",
    title: "Study",
    subtitle: "Subtitle",
    background: "/images/proof.png",
  },
  context: {
    challenge: "Challenge",
    role: "Role",
    company: "Company",
    scope: "Scope",
    team: "Team",
    body: "Body",
  },
  sections: [
    {
      type: "textOnly",
      key: "summary",
      title: "Summary",
      description: "Description",
    },
  ],
};

function writeValidFixture(): void {
  writeJson("src/content/resume.json", validResume);
  writeJson("src/content/popovers.json", validPopovers);
  writeJson("src/content/case-studies/manifest.json", validManifest);
  writeJson("src/content/case-studies/study.json", validStudy);

  const page = path.join(fixtureRoot, "src/pages/study.astro");
  mkdirSync(path.dirname(page), { recursive: true });
  writeFileSync(page, "---\n---\n");

  const image = path.join(fixtureRoot, "public/images/proof.png");
  mkdirSync(path.dirname(image), { recursive: true });
  writeFileSync(image, "");
}

describe("verifyContent", () => {
  beforeEach(() => {
    fixtureRoot = mkdtempSync(path.join(tmpdir(), "content-verifier-"));
    writeValidFixture();
  });

  afterEach(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it("accepts an exact, valid content inventory", () => {
    const result = verifyContent(fixtureRoot);
    expect(result.errors).toEqual([]);
    expect(result.stats).toEqual({
      caseStudyCount: 1,
      hotspotCount: 1,
      popoverCount: 1,
    });
  });

  it("enforces hotspot and popover parity in both directions", () => {
    writeJson("src/content/popovers.json", {
      ...validPopovers,
      unused: { label: "Unused", text: "Orphaned note." },
    });

    expect(verifyContent(fixtureRoot).errors).toContain(
      'Popover "unused" is not referenced by the resume',
    );
  });

  it("enforces manifest, JSON, and page parity", () => {
    writeJson("src/content/case-studies/orphan.json", validStudy);
    rmSync(path.join(fixtureRoot, "src/pages/study.astro"));

    const errors = verifyContent(fixtureRoot).errors;
    expect(errors).toContain(
      'Case study "orphan" has JSON content but no manifest entry',
    );
    expect(errors).toContain(
      'Manifest references "study" but its page is missing',
    );
  });

  it("reports malformed section data without traversing it", () => {
    writeJson("src/content/case-studies/study.json", {
      ...validStudy,
      sections: [{ type: "featureRow", key: "incomplete" }],
    });

    expect(() => verifyContent(fixtureRoot)).not.toThrow();
    expect(
      verifyContent(fixtureRoot).errors.some((error) =>
        error.includes("case-studies/study.json: sections.0"),
      ),
    ).toBe(true);
  });

  it("rejects asset paths that escape public", () => {
    writeJson("src/content/popovers.json", {
      proof: {
        ...validPopovers.proof,
        img: "../../outside.png",
      },
    });

    expect(verifyContent(fixtureRoot).errors).toContain(
      'Invalid public path for popover "proof".img: "../../outside.png"',
    );
  });
});
