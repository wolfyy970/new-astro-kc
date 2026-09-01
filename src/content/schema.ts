// ── Content schemas (single source of truth) ──────────────────────────────────
// These framework-agnostic schemas are shared by Astro's content collection,
// the build-time verifier, and the inferred TypeScript types. Content is
// authored JSON, so every object is strict: a misspelled field must fail rather
// than be silently stripped.
import { z } from "zod";

const nonEmptyString = z.string().min(1);
const imagePathSchema = nonEmptyString.regex(
  /^\/images\//,
  "Expected a path below /images/",
);
const videoPathSchema = nonEmptyString.regex(
  /^\/media\/.*\.(mp4|webm)$/i,
  "Expected an .mp4 or .webm path below /media/",
);
const webUrlSchema = z
  .url()
  .refine((url) => url.startsWith("https://"), "Expected an HTTPS URL");
const approvedEmbedUrlSchema = webUrlSchema.refine(
  (url) => new URL(url).hostname === "embed.ted.com",
  "Expected an approved TED embed URL",
);
const accentSchema = nonEmptyString.regex(
  /^#[0-9a-fA-F]{6}$/,
  "Expected a 6-digit hex color",
);

// ── Resume ────────────────────────────────────────────────────────────────────

const educationSchema = z
  .object({
    degree: nonEmptyString,
    school: nonEmptyString,
    focus: nonEmptyString.optional(),
  })
  .strict();

const experienceEntrySchema = z
  .object({
    company: nonEmptyString,
    dates: nonEmptyString,
    title: nonEmptyString,
    description: nonEmptyString.optional(),
    bullets: z.array(nonEmptyString),
  })
  .strict();

const contactSchema = z
  .object({
    email: nonEmptyString,
    phone: nonEmptyString,
    linkedin: nonEmptyString,
    linkedinUrl: nonEmptyString,
    location: nonEmptyString,
  })
  .strict();

const patentsAndRecognitionSchema = z
  .object({
    patents: nonEmptyString,
    awards: nonEmptyString,
    certifications: nonEmptyString,
  })
  .strict();

export const resumeSchema = z
  .object({
    name: nonEmptyString,
    displayName: nonEmptyString,
    titleLine: nonEmptyString,
    contact: contactSchema,
    hero: z
      .object({
        tagline: nonEmptyString,
        credentials: z.array(nonEmptyString).min(1),
      })
      .strict(),
    summary: nonEmptyString,
    experience: z.array(experienceEntrySchema).min(1),
    education: z.array(educationSchema).min(1),
    patentsAndRecognition: patentsAndRecognitionSchema,
  })
  .strict();

// ── Popovers ──────────────────────────────────────────────────────────────────

export const popoverDataSchema = z
  .object({
    label: nonEmptyString,
    text: nonEmptyString,
    stat: nonEmptyString.optional(),
    img: nonEmptyString.optional(),
    media: z.array(nonEmptyString).min(1).optional(),
    brandMark: imagePathSchema.optional(),
    brandMarkAlt: nonEmptyString.optional(),
    quote: nonEmptyString.optional(),
    link: nonEmptyString.optional(),
    linkText: nonEmptyString.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (Boolean(data.brandMark) !== Boolean(data.brandMarkAlt)) {
      context.addIssue({
        code: "custom",
        message: "brandMark and brandMarkAlt must be provided together",
        path: [data.brandMark ? "brandMarkAlt" : "brandMark"],
      });
    }
    if (Boolean(data.link) !== Boolean(data.linkText)) {
      context.addIssue({
        code: "custom",
        message: "link and linkText must be provided together",
        path: [data.link ? "linkText" : "link"],
      });
    }
  });

export const popoverMapSchema = z.record(nonEmptyString, popoverDataSchema);

// ── Case studies ──────────────────────────────────────────────────────────────

const caseStudyMetaSchema = z
  .object({
    title: nonEmptyString,
    description: nonEmptyString,
    ogImage: imagePathSchema.optional(),
    accent: accentSchema,
  })
  .strict();

const heroBaseShape = {
  label: nonEmptyString,
  title: nonEmptyString,
  subtitle: nonEmptyString,
};

const caseStudyImageHeroSchema = z
  .object({
    ...heroBaseShape,
    image: imagePathSchema,
    imageAlt: nonEmptyString,
  })
  .strict();

const caseStudyBackgroundHeroSchema = z
  .object({
    ...heroBaseShape,
    background: imagePathSchema,
  })
  .strict();

const caseStudyHeroSchema = z.union([
  caseStudyImageHeroSchema,
  caseStudyBackgroundHeroSchema,
]);

const caseStudyContextSchema = z
  .object({
    challenge: nonEmptyString,
    role: nonEmptyString,
    company: nonEmptyString,
    scope: nonEmptyString,
    team: nonEmptyString,
    body: nonEmptyString,
  })
  .strict();

const caseStudyCardSchema = z
  .object({
    title: nonEmptyString,
    description: nonEmptyString,
    image: imagePathSchema,
    imageAlt: nonEmptyString,
  })
  .strict();

export const caseStudyPhotoItemSchema = z
  .object({
    src: imagePathSchema,
    alt: nonEmptyString,
  })
  .strict();

export const caseStudyStatItemSchema = z
  .object({
    value: nonEmptyString,
    label: nonEmptyString,
  })
  .strict();

const sectionSharedShape = {
  key: nonEmptyString.regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  label: nonEmptyString.optional(),
  bg: nonEmptyString.optional(),
  isDark: z.boolean().optional(),
  darkBg: nonEmptyString.optional(),
};

function sectionSchema<Type extends string, Shape extends z.ZodRawShape>(
  type: Type,
  shape: Shape,
) {
  return z
    .object({
      ...sectionSharedShape,
      type: z.literal(type),
      ...shape,
    })
    .strict();
}

const columnsSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const cardGridSectionSchema = sectionSchema("cardGrid", {
  title: nonEmptyString.optional(),
  description: nonEmptyString.optional(),
  columns: columnsSchema.optional(),
  cards: z.array(caseStudyCardSchema).min(1),
});

const mixedGridSectionSchema = sectionSchema("mixedGrid", {
  title: nonEmptyString.optional(),
  description: nonEmptyString.optional(),
  primaryCard: caseStudyCardSchema,
  secondaryCards: z.array(caseStudyCardSchema).min(1),
});

const featureRowSectionSchema = sectionSchema("featureRow", {
  title: nonEmptyString,
  description: nonEmptyString,
  image: imagePathSchema,
  imageAlt: nonEmptyString,
  reverse: z.boolean().optional(),
  link: nonEmptyString.optional(),
  linkText: nonEmptyString.optional(),
  caption: nonEmptyString.optional(),
});

const textOnlySectionSchema = sectionSchema("textOnly", {
  title: nonEmptyString,
  description: nonEmptyString,
});

const largeImageSectionSchema = sectionSchema("largeImage", {
  title: nonEmptyString.optional(),
  description: nonEmptyString.optional(),
  image: imagePathSchema,
  imageAlt: nonEmptyString,
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
});

const fullBleedSectionSchema = sectionSchema("fullBleed", {
  image: imagePathSchema,
  imageAlt: nonEmptyString,
});

const captionedImageSectionSchema = sectionSchema("captionedImage", {
  image: imagePathSchema,
  imageAlt: nonEmptyString,
  caption: nonEmptyString.optional(),
  isMobile: z.boolean().optional(),
  displayWidth: z.number().int().positive().optional(),
});

const photoGridSectionSchema = sectionSchema("photoGrid", {
  title: nonEmptyString.optional(),
  description: nonEmptyString.optional(),
  columns: columnsSchema.optional(),
  images: z.array(caseStudyPhotoItemSchema).min(2),
  gap: z.enum(["tight", "normal", "loose"]).optional(),
});

const statRowSectionSchema = sectionSchema("statRow", {
  stats: z.array(caseStudyStatItemSchema).min(2).max(5),
});

const videoSectionSchema = sectionSchema("video", {
  title: nonEmptyString,
  description: nonEmptyString.optional(),
  video: videoPathSchema,
  poster: imagePathSchema.optional(),
  caption: nonEmptyString.optional(),
  captions: z.string().regex(/^\//, "captions path must start with /").optional(),
});

const externalVideoSectionSchema = sectionSchema("externalVideo", {
  title: nonEmptyString,
  description: nonEmptyString.optional(),
  embedUrl: approvedEmbedUrlSchema,
  sourceUrl: webUrlSchema,
  caption: nonEmptyString.optional(),
});

export const caseStudySectionSchema = z
  .discriminatedUnion("type", [
    cardGridSectionSchema,
    mixedGridSectionSchema,
    featureRowSectionSchema,
    textOnlySectionSchema,
    largeImageSectionSchema,
    fullBleedSectionSchema,
    captionedImageSectionSchema,
    photoGridSectionSchema,
    statRowSectionSchema,
    videoSectionSchema,
    externalVideoSectionSchema,
  ])
  .superRefine((section, context) => {
    if (
      section.type === "featureRow" &&
      Boolean(section.link) !== Boolean(section.linkText)
    ) {
      context.addIssue({
        code: "custom",
        message: "link and linkText must be provided together",
        path: [section.link ? "linkText" : "link"],
      });
    }
  });

export const caseStudyDataSchema = z
  .object({
    meta: caseStudyMetaSchema,
    hero: caseStudyHeroSchema,
    context: caseStudyContextSchema,
    sections: z.array(caseStudySectionSchema).min(1),
  })
  .strict()
  .superRefine((study, context) => {
    const seen = new Set<string>();
    study.sections.forEach((section, index) => {
      if (seen.has(section.key)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate section key "${section.key}"`,
          path: ["sections", index, "key"],
        });
      }
      seen.add(section.key);
    });
  });

const manifestEntrySchema = z
  .object({
    slug: nonEmptyString.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: nonEmptyString,
    description: nonEmptyString,
    accent: accentSchema,
    ogImage: imagePathSchema,
  })
  .strict();

export const manifestSchema = z
  .array(manifestEntrySchema)
  .min(1)
  .superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.slug)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate manifest slug "${entry.slug}"`,
          path: [index, "slug"],
        });
      }
      seen.add(entry.slug);
    });
  });
