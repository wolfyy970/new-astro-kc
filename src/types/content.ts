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
  popoverDataSchema,
  popoverMapSchema,
  caseStudyPhotoItemSchema,
  caseStudyStatItemSchema,
  caseStudySectionSchema,
  caseStudyDataSchema,
} from "../content/schema.ts";

type AuthoredPopoverData = z.infer<typeof popoverDataSchema>;
export type AuthoredPopoverMap = z.infer<typeof popoverMapSchema>;

/** Image metadata produced at build time and serialized for client rendering. */
export interface OptimizedPopoverImage {
  src: string;
  width: number;
  height: number;
}

export type PopoverMedia = string | OptimizedPopoverImage;
export type PopoverData = Omit<AuthoredPopoverData, "img" | "media"> & {
  img?: PopoverMedia;
  media?: PopoverMedia[];
};
export type PopoverMap = Record<string, PopoverData>;

export type CaseStudyPhotoItem = z.infer<typeof caseStudyPhotoItemSchema>;
export type CaseStudyStatItem = z.infer<typeof caseStudyStatItemSchema>;
export type CaseStudySectionData = z.infer<typeof caseStudySectionSchema>;
export type CaseStudyData = z.infer<typeof caseStudyDataSchema>;
