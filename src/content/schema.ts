// ── Content schemas (single source of truth) ──────────────────────────────────
// These zod schemas describe the exact shape of the JSON "database"
// (resume.json, popovers.json, case-studies/*.json, manifest.json).
//
// They are the ONE definition consumed by every layer:
//   - src/types/content.ts  derives all TS types via `z.infer` (compile-time)
//   - src/content.config.ts  feeds the case-study schema to Astro's collection
//   - scripts/verify-content.ts  parses the JSON at build time with `safeParse`
//
// Keep this framework-agnostic (`import { z } from "zod"`, not "astro:content")
// so the Node build script and vitest can import it without an Astro runtime.
import { z } from "zod";

// ── Resume ────────────────────────────────────────────────────────────────────

export const educationSchema = z.object({
  degree: z.string(),
  school: z.string(),
  focus: z.string().optional(),
});

export const experienceEntrySchema = z.object({
  company: z.string(),
  dates: z.string(),
  title: z.string(),
  description: z.string().optional(),
  bullets: z.array(z.string()),
});

export const contactSchema = z.object({
  email: z.string(),
  phone: z.string(),
  linkedin: z.string(),
  linkedinUrl: z.string(),
  location: z.string(),
});

export const patentsAndRecognitionSchema = z.object({
  patents: z.string(),
  awards: z.string(),
  certifications: z.string(),
});

export const resumeSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  titleLine: z.string(),
  contact: contactSchema,
  hero: z.object({
    tagline: z.string(),
    credentials: z.array(z.string()),
  }),
  summary: z.string(),
  experience: z.array(experienceEntrySchema),
  education: z.array(educationSchema),
  patentsAndRecognition: patentsAndRecognitionSchema,
});

// ── Popovers ──────────────────────────────────────────────────────────────────

export const popoverDataSchema = z.object({
  label: z.string(),
  text: z.string(),
  stat: z.string().optional(),
  img: z.string().optional(),
  media: z.array(z.string()).optional(),
  brandMark: z.string().optional(),
  brandMarkAlt: z.string().optional(),
  quote: z.string().optional(),
  link: z.string().optional(),
  linkText: z.string().optional(),
});

export const popoverMapSchema = z.record(z.string(), popoverDataSchema);

// ── Case studies ──────────────────────────────────────────────────────────────

export const caseStudyMetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  ogImage: z.string().optional(),
  accent: z.string().optional(),
});

export const caseStudyHeroSchema = z.object({
  label: z.string().optional(),
  title: z.string(),
  subtitle: z.string(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  background: z.string().optional(),
});

export const caseStudyContextSchema = z.object({
  challenge: z.string(),
  role: z.string(),
  company: z.string(),
  scope: z.string(),
  team: z.string(),
  body: z.string(),
});

export const caseStudySectionTypeSchema = z.enum([
  "cardGrid",
  "mixedGrid",
  "featureRow",
  "textOnly",
  "largeImage",
  "fullBleed",
  "captionedImage",
  "photoGrid",
  "statRow",
  "video",
]);

export const caseStudyCardSchema = z.object({
  title: z.string(),
  description: z.string(),
  image: z.string(),
  imageAlt: z.string(),
});

export const caseStudyPhotoItemSchema = z.object({
  src: z.string(),
  alt: z.string(),
});

export const caseStudyStatItemSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const caseStudySectionSchema = z.object({
  type: caseStudySectionTypeSchema,
  key: z.string().optional(),
  label: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  linkText: z.string().optional(),
  isMobile: z.boolean().optional(),
  bg: z.string().optional(),
  isDark: z.boolean().optional(),
  darkBg: z.string().optional(),
  columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  cards: z.array(caseStudyCardSchema).optional(),
  primaryCard: caseStudyCardSchema.optional(),
  secondaryCards: z.array(caseStudyCardSchema).optional(),
  reverse: z.boolean().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  imageWidth: z.number().optional(),
  imageHeight: z.number().optional(),
  displayWidth: z.number().positive().optional(),
  caption: z.string().optional(),
  video: z.string().optional(),
  poster: z.string().optional(),
  images: z.array(caseStudyPhotoItemSchema).optional(),
  gap: z.enum(["tight", "normal", "loose"]).optional(),
  stats: z.array(caseStudyStatItemSchema).optional(),
});

export const caseStudyDataSchema = z.object({
  meta: caseStudyMetaSchema,
  hero: caseStudyHeroSchema,
  context: caseStudyContextSchema,
  sections: z.array(caseStudySectionSchema),
});

export const manifestEntrySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  accent: z.string(),
  ogImage: z.string(),
});

export const manifestSchema = z.array(manifestEntrySchema);
