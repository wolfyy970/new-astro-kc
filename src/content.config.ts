// Astro requires explicit collection definitions for folders in src/content/.
// The case-studies JSON files are imported directly by page files — they are
// not queried through Astro's content collection API — but we still register the
// real schema so Astro validates every case-study file at build/sync time. The
// schema is shared with the build script and the derived TS types (see
// ./content/schema.ts) so the three never drift.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { caseStudyDataSchema } from "./content/schema.ts";

const caseStudies = defineCollection({
  // manifest.json is the index (an array), not a case study — exclude it so the
  // per-study object schema only sees actual study files.
  loader: glob({
    pattern: ["**/*.json", "!**/manifest.json"],
    base: "./src/content/case-studies",
  }),
  schema: caseStudyDataSchema,
});

export const collections = { "case-studies": caseStudies };
