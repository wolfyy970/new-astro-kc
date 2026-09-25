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
  writeJson("src/content/projects-writing.json", {
    publication: {
      name: "Publication",
      description: "Description",
      url: "https://example.com",
    },
    projects: [
      {
        state: "published",
        title: "Project",
        eyebrow: "Experiment",
        summary: "Summary",
        detail: "Detail",
        liveUrl: "https://example.com/project",
        leadImage: {
          src: "/images/proof.png",
          alt: "Lead",
          width: 1200,
          height: 800,
        },
        supportingImage: {
          src: "/images/proof.png",
          alt: "Supporting",
          width: 1200,
          height: 800,
        },
        video: {
          src: "/media/demo.mp4",
          poster: "/images/proof.png",
          width: 1200,
          height: 800,
          label: "Demo",
        },
        relatedWriting: ["essay"],
      },
      {
        state: "story",
        title: "Second",
        note: "A published project story.",
        href: "/second",
        brandMark: "/images/brand.svg",
        brandMarkAlt: "Second project mark",
        story: validStudy,
      },
      {
        state: "experiment",
        title: "Third",
        eyebrow: "Experiment",
        summary: "Summary",
        detail: "Detail",
        liveUrl: "https://example.com/third",
        screenshots: Array.from({ length: 4 }, (_, index) => ({
          src: "/images/experiment.webp",
          alt: `Screen ${index + 1}`,
          width: 1200,
          height: 800,
          caption: `Caption ${index + 1}`,
        })),
        stirringVideo: {
          src: "/media/stir.mp4",
          poster: "/images/proof.png",
          width: 1200,
          height: 800,
          label: "Stirring animation",
        },
      },
    ],
    writing: [
      {
        slug: "essay",
        title: "Essay",
        subtitle: "Subtitle",
        date: "2026-01-01",
        url: "https://example.com/essay",
      },
    ],
  });
  writeJson("src/content/references.json", {
    source: "https://example.com/references",
    references: [{ quote: "Quote", name: "Name", role: "Role" }],
  });
  writeJson("src/content/case-studies/manifest.json", validManifest);
  writeJson("src/content/case-studies/study.json", validStudy);

  const page = path.join(fixtureRoot, "src/pages/study.astro");
  mkdirSync(path.dirname(page), { recursive: true });
  writeFileSync(page, "---\n---\n");
  writeFileSync(path.join(fixtureRoot, "src/pages/second.astro"), "---\n---\n");

  const image = path.join(fixtureRoot, "public/images/proof.png");
  mkdirSync(path.dirname(image), { recursive: true });
  writeFileSync(image, "");
  writeFileSync(path.join(fixtureRoot, "public/images/brand.svg"), "<svg/>");
  writeFileSync(path.join(fixtureRoot, "public/images/experiment.webp"), "");
  const video = path.join(fixtureRoot, "public/media/demo.mp4");
  mkdirSync(path.dirname(video), { recursive: true });
  writeFileSync(video, "");
  writeFileSync(path.join(fixtureRoot, "public/media/stir.mp4"), "");
  const pdf = path.join(
    fixtureRoot,
    "public/downloads/KC-Wolff-Ingham-Resume.pdf",
  );
  mkdirSync(path.dirname(pdf), { recursive: true });
  writeFileSync(pdf, "");
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

  it("checks projects media and the résumé download in the build gate", () => {
    rmSync(path.join(fixtureRoot, "public/media/demo.mp4"));
    rmSync(
      path.join(fixtureRoot, "public/downloads/KC-Wolff-Ingham-Resume.pdf"),
    );

    const errors = verifyContent(fixtureRoot).errors;
    expect(errors).toContain(
      'Missing media for projects-writing.projects[0].video.src: "/media/demo.mp4"',
    );
    expect(errors).toContain(
      'Missing downloadable résumé: "public/downloads/KC-Wolff-Ingham-Resume.pdf"',
    );
  });

  it("checks media referenced by an independent project story", () => {
    rmSync(path.join(fixtureRoot, "public/images/proof.png"));

    expect(verifyContent(fixtureRoot).errors).toContain(
      'Missing media for projects-writing.projects[1].story hero.background: "/images/proof.png"',
    );
  });

  it("checks project brand marks, experiment screenshots, and animation assets", () => {
    rmSync(path.join(fixtureRoot, "public/images/brand.svg"));
    rmSync(path.join(fixtureRoot, "public/images/experiment.webp"));
    rmSync(path.join(fixtureRoot, "public/media/stir.mp4"));
    const errors = verifyContent(fixtureRoot).errors;
    expect(errors).toContain(
      'Missing media for projects-writing.projects[1].brandMark: "/images/brand.svg"',
    );
    expect(errors).toContain(
      'Missing media for projects-writing.projects[2].screenshots[0].src: "/images/experiment.webp"',
    );
    expect(errors).toContain(
      'Missing media for projects-writing.projects[2].stirringVideo.src: "/media/stir.mp4"',
    );
  });

  it("requires every linked project story to have a route", () => {
    rmSync(path.join(fixtureRoot, "src/pages/second.astro"));

    expect(verifyContent(fixtureRoot).errors).toContain(
      'Project story "Second" links to "/second" but its page is missing',
    );
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
