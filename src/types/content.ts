// ── Content type definitions ──────────────────────────────────────────────────
// These types describe the exact shape of data coming from the JSON "database"
// (resume.json, popovers.json, case-studies/*.json). They enforce type safety at
// the boundary between build-time Astro data and both server-rendered templates
// and client-side scripts.
//
// They are DERIVED from the zod schemas in ../content/schema.ts so the runtime
// validators and the compile-time types can never drift. This file is type-only
// (`import type`), so zod is fully erased and never enters the client bundle.
import type { z } from "zod";
import type {
  educationSchema,
  experienceEntrySchema,
  contactSchema,
  patentsAndRecognitionSchema,
  resumeSchema,
  popoverDataSchema,
  popoverMapSchema,
  caseStudyMetaSchema,
  caseStudyHeroSchema,
  caseStudyContextSchema,
  caseStudySectionTypeSchema,
  caseStudyCardSchema,
  caseStudyPhotoItemSchema,
  caseStudyStatItemSchema,
  caseStudySectionSchema,
  caseStudyDataSchema,
} from "../content/schema.ts";

export type Education = z.infer<typeof educationSchema>;
export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;
export type Contact = z.infer<typeof contactSchema>;
export type PatentsAndRecognition = z.infer<typeof patentsAndRecognitionSchema>;
export type ResumeData = z.infer<typeof resumeSchema>;

export type PopoverData = z.infer<typeof popoverDataSchema>;
export type PopoverMap = z.infer<typeof popoverMapSchema>;

export type CaseStudyMeta = z.infer<typeof caseStudyMetaSchema>;
export type CaseStudyHeroData = z.infer<typeof caseStudyHeroSchema>;
export type CaseStudyContext = z.infer<typeof caseStudyContextSchema>;
export type CaseStudySectionType = z.infer<typeof caseStudySectionTypeSchema>;
export type CaseStudyCard = z.infer<typeof caseStudyCardSchema>;
export type CaseStudyPhotoItem = z.infer<typeof caseStudyPhotoItemSchema>;
export type CaseStudyStatItem = z.infer<typeof caseStudyStatItemSchema>;
export type CaseStudySectionData = z.infer<typeof caseStudySectionSchema>;
export type CaseStudyData = z.infer<typeof caseStudyDataSchema>;
