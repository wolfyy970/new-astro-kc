import { describe, it, expect } from "vitest";
import resume from "./resume.json";
import popovers from "./popovers.json";
import references from "./references.json";
import projectsWriting from "./projects-writing.json";
import manifest from "./case-studies/manifest.json";
import truist from "./case-studies/truist.json";
import upwave from "./case-studies/upwave.json";
import sparksGrove from "./case-studies/sparks-grove.json";
import twoWayTv from "./case-studies/two-way-tv.json";
import felix from "./case-studies/felix.json";
import armchairManager from "./case-studies/armchair-manager.json";
import fusionfall from "./case-studies/fusionfall.json";
import magicWall from "./case-studies/magic-wall.json";
import {
  resumeSchema,
  popoverMapSchema,
  manifestSchema,
  caseStudyDataSchema,
  referencesSchema,
  projectsWritingSchema,
} from "./schema";

describe("content schemas — real data conforms", () => {
  it("resume.json matches resumeSchema", () => {
    expect(resumeSchema.safeParse(resume).success).toBe(true);
  });

  it("popovers.json matches popoverMapSchema", () => {
    expect(popoverMapSchema.safeParse(popovers).success).toBe(true);
  });

  it("manifest.json matches manifestSchema", () => {
    expect(manifestSchema.safeParse(manifest).success).toBe(true);
  });

  it("references.json matches referencesSchema", () => {
    expect(referencesSchema.safeParse(references).success).toBe(true);
  });

  it("projects-writing.json matches projectsWritingSchema", () => {
    expect(projectsWritingSchema.safeParse(projectsWriting).success).toBe(true);
  });

  it("keeps project data in the approved page sequence", () => {
    expect(projectsWriting.projects.map((project) => project.title)).toEqual([
      "Org Chart Studio",
      "Unreel Recipes",
      "Designer",
    ]);
  });

  it("keeps Org Chart Studio's hero true to the Sunny Peeps surface system", () => {
    const project = projectsWritingSchema
      .parse(projectsWriting)
      .projects.find(
        (entry) =>
          entry.state === "story" && entry.href === "/org-chart-studio",
      );

    expect(project?.state).toBe("story");
    if (!project || project.state !== "story") return;

    expect(project.story.hero).toMatchObject({
      composition: "product",
      brandMark: "/images/projects/org-chart-studio/brand-mark.svg",
      brandMarkAlt: "Org Chart Studio four-color tile mark",
      image: "/images/projects/org-chart-studio/northstar-spectrum.png",
    });
  });

  it("requires alt text for the Org Chart Studio hero mark", () => {
    const bad = {
      ...projectsWriting,
      projects: projectsWriting.projects.map((entry) =>
        entry.state === "story" && entry.href === "/org-chart-studio"
          ? {
              ...entry,
              story: {
                ...entry.story,
                hero: { ...entry.story.hero, brandMarkAlt: undefined },
              },
            }
          : entry,
      ),
    };

    expect(projectsWritingSchema.safeParse(bad).success).toBe(false);
  });

  it.each([
    ["truist", truist],
    ["upwave", upwave],
    ["sparks-grove", sparksGrove],
    ["two-way-tv", twoWayTv],
    ["felix", felix],
    ["armchair-manager", armchairManager],
    ["fusionfall", fusionfall],
    ["magic-wall", magicWall],
  ])("case study %s matches caseStudyDataSchema", (_slug, data) => {
    expect(caseStudyDataSchema.safeParse(data).success).toBe(true);
  });
});

describe("content schemas — reject malformed data", () => {
  it("rejects a popover missing the required `text` field", () => {
    const bad = { k: { label: "x" } };
    expect(popoverMapSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects impossible writing dates before Intl formatting can crash", () => {
    const bad = {
      ...projectsWriting,
      writing: projectsWriting.writing.map((entry, index) =>
        index === 0 ? { ...entry, date: "2026-02-31" } : entry,
      ),
    };
    expect(projectsWritingSchema.safeParse(bad).success).toBe(false);
  });

  it("requires exactly one published project for the projects page", () => {
    const forthcoming = { state: "forthcoming", title: "Later", note: "Soon" };
    const published = projectsWriting.projects.find(
      (project) => project.state === "published",
    );
    expect(published).toBeDefined();
    if (!published) return;

    const twoPublished = {
      ...projectsWriting,
      projects: [published, published, forthcoming],
    };
    expect(projectsWritingSchema.safeParse(twoPublished).success).toBe(false);

    const noPublished = {
      ...projectsWriting,
      projects: [forthcoming, forthcoming, forthcoming],
    };
    expect(projectsWritingSchema.safeParse(noPublished).success).toBe(false);
  });

  it("requires project-story links to stay on an internal portfolio route", () => {
    const story = projectsWriting.projects.find(
      (project) => project.state === "story",
    );
    expect(story).toBeDefined();
    if (!story) return;

    const bad = {
      ...projectsWriting,
      projects: projectsWriting.projects.map((project) =>
        project === story
          ? { ...project, href: "https://example.com" }
          : project,
      ),
    };
    expect(projectsWritingSchema.safeParse(bad).success).toBe(false);
  });

  it("keeps the Org Chart Studio logo paired with accessible text", () => {
    const story = projectsWritingSchema
      .parse(projectsWriting)
      .projects.find((project) => project.state === "story");
    expect(story?.state).toBe("story");
    if (!story || story.state !== "story") return;

    const missingAlt = { ...story, brandMarkAlt: undefined };
    const bad = {
      ...projectsWriting,
      projects: projectsWriting.projects.map((project) =>
        project.state === "story" ? missingAlt : project,
      ),
    };
    expect(projectsWritingSchema.safeParse(bad).success).toBe(false);
  });

  it("requires the four documented Unreel Recipes product views", () => {
    const experiment = projectsWritingSchema
      .parse(projectsWriting)
      .projects.find((project) => project.state === "experiment");
    expect(experiment?.state).toBe("experiment");
    if (!experiment || experiment.state !== "experiment") return;

    const bad = {
      ...projectsWriting,
      projects: projectsWriting.projects.map((project) =>
        project.state === "experiment"
          ? { ...experiment, screenshots: experiment.screenshots.slice(0, 3) }
          : project,
      ),
    };
    expect(projectsWritingSchema.safeParse(bad).success).toBe(false);
  });

  it("keeps the named resume notes on a readable brand-mark first frame", () => {
    const expected = {
      merger: "/images/brands/truist.svg",
      magicwall: "/images/brands/cnn.svg",
      "rts-award": "/images/brands/cnn-com.svg",
      fusionfall: "/images/brands/cartoon-network-original.svg",
      ar: "/images/brands/nba-original.svg",
      upwave: "/images/brands/upwave-original.png",
    } as const;

    Object.entries(expected).forEach(([key, path]) => {
      const media = popovers[key as keyof typeof expected].media;
      expect(media?.[0]).toBe(path);
    });
    expect(popovers.delta.img).toBe("/images/brands/delta-official.png");
    expect(popovers["truist-products"].img).toBe("/images/brands/truist.svg");
    expect(popovers["gpc-revenue"].brandMark).toBe("/images/brands/napa.svg");
    expect(popovers.bolt.img).toBe("/images/brands/gpc.svg");
    expect(popovers.agentic.media?.[0]).toBe("/images/brands/napa.svg");
    expect(popovers.emmy.img).toBe("/images/brands/conan.svg");
  });

  it("rejects a resume missing a required top-level field", () => {
    const withoutSummary = { ...resume } as Partial<typeof resume>;
    delete withoutSummary.summary;
    expect(resumeSchema.safeParse(withoutSummary).success).toBe(false);
  });

  it("rejects a case-study section with an unknown `type`", () => {
    const bad = {
      ...(truist as Record<string, unknown>),
      sections: [{ type: "notARealType" }],
    };
    expect(caseStudyDataSchema.safeParse(bad).success).toBe(false);
  });

  it.each([
    ["cardGrid", { type: "cardGrid", key: "missing-cards" }],
    [
      "featureRow",
      {
        type: "featureRow",
        key: "missing-image",
        title: "Title",
        description: "Description",
      },
    ],
    [
      "textOnly",
      { type: "textOnly", key: "missing-description", title: "Title" },
    ],
    ["photoGrid", { type: "photoGrid", key: "missing-images" }],
    ["video", { type: "video", key: "missing-video", title: "Title" }],
    [
      "externalVideo",
      { type: "externalVideo", key: "missing-embed", title: "Title" },
    ],
  ])("rejects an incomplete %s section", (_type, section) => {
    const bad = { ...truist, sections: [section] };
    expect(caseStudyDataSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown fields instead of silently stripping typos", () => {
    const bad = {
      ...truist,
      sections: [
        {
          type: "textOnly",
          key: "typo",
          title: "Title",
          description: "Description",
          descriptoin: "This typo must not disappear",
        },
      ],
    };
    expect(caseStudyDataSchema.safeParse(bad).success).toBe(false);
  });

  it("requires paired feature-row link fields", () => {
    const featureRow = armchairManager.sections[0];
    const bad = {
      ...armchairManager,
      sections: [{ ...featureRow, link: "/example" }],
    };
    expect(caseStudyDataSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate section keys", () => {
    const [first, second] = truist.sections;
    const bad = {
      ...truist,
      sections: [first, { ...second, key: first.key }],
    };
    expect(caseStudyDataSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unapproved external video host", () => {
    const bad = {
      ...truist,
      sections: [
        {
          type: "externalVideo",
          key: "unapproved-embed",
          title: "External video",
          embedUrl: "https://example.com/embed/video",
          sourceUrl: "https://example.com/video",
        },
      ],
    };
    expect(caseStudyDataSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a popover brand mark without alternative text", () => {
    const bad = {
      k: {
        label: "Artifact",
        text: "Details",
        brandMark: "/images/issuer.png",
      },
    };
    expect(popoverMapSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a manifest entry missing `slug`", () => {
    expect(
      manifestSchema.safeParse([
        { title: "x", description: "y", accent: "#000000", ogImage: "/a.png" },
      ]).success,
    ).toBe(false);
  });

  it("rejects a project whose related writing does not exist", () => {
    const published = projectsWriting.projects.find(
      (project) => project.state === "published",
    );
    expect(published?.state).toBe("published");
    if (!published || published.state !== "published") return;

    const bad = {
      ...projectsWriting,
      projects: [
        { ...published, relatedWriting: ["not-in-the-archive"] },
        ...projectsWriting.projects.slice(1),
      ],
    };
    expect(projectsWritingSchema.safeParse(bad).success).toBe(false);
  });
});
