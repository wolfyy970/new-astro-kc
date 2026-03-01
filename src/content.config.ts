// Astro 5 requires explicit collection definitions for folders in src/content/.
// The case-studies JSON files are imported directly by page files — they are
// not queried through Astro's content collection API — so we register a
// pass-through glob collection purely to suppress the auto-generation warning.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/case-studies' }),
  schema: z.any(),
});

export const collections = { 'case-studies': caseStudies };
