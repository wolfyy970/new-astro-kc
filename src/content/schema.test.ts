import { describe, it, expect } from "vitest";
import resume from "./resume.json";
import popovers from "./popovers.json";
import manifest from "./case-studies/manifest.json";
import truist from "./case-studies/truist.json";
import upwave from "./case-studies/upwave.json";
import sparksGrove from "./case-studies/sparks-grove.json";
import twoWayTv from "./case-studies/two-way-tv.json";
import {
  resumeSchema,
  popoverMapSchema,
  manifestSchema,
  caseStudyDataSchema,
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

  it.each([
    ["truist", truist],
    ["upwave", upwave],
    ["sparks-grove", sparksGrove],
    ["two-way-tv", twoWayTv],
  ])("case study %s matches caseStudyDataSchema", (_slug, data) => {
    expect(caseStudyDataSchema.safeParse(data).success).toBe(true);
  });
});

describe("content schemas — reject malformed data", () => {
  it("rejects a popover missing the required `text` field", () => {
    const bad = { k: { label: "x" } };
    expect(popoverMapSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a resume missing a required top-level field", () => {
    const { summary, ...withoutSummary } = resume as Record<string, unknown>;
    expect(resumeSchema.safeParse(withoutSummary).success).toBe(false);
  });

  it("rejects a case-study section with an unknown `type`", () => {
    const bad = {
      ...(truist as Record<string, unknown>),
      sections: [{ type: "notARealType" }],
    };
    expect(caseStudyDataSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a manifest entry missing `slug`", () => {
    expect(manifestSchema.safeParse([{ title: "x", description: "y", accent: "#000000", ogImage: "/a.png" }]).success).toBe(false);
  });
});
