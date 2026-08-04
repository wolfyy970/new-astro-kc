# Confidential — KC Wolff-Ingham

High-fidelity Design Leadership Portfolio built with Astro 7. This project demonstrates strategic product depth, technical fluency, and a commitment to inclusive, high-presence digital experiences.

## Core Interactive Features

- **The Annotated Document:** The whole piece is a printed monograph marked up in the margin — a masthead carrying every piece of identity once, then the résumé on one continuous sheet with notes running down both margins. One serif (Newsreader) sets both the title and the 17px body so the page reads as a single publication; a mono carries the annotation apparatus only. The résumé's typography is achromatic: the only colour on it is the photographs (the work) and the reader's two highlighter inks (the annotation).
- **Highlighter-Marked Terms:** Every annotated term wears a translucent felt-tip stroke, as if the reader marked the document — yellow for marginalia, green when the note also leads to a deeper case study. Strokes are flat matte ink with straight chisel-cut ends; six hand-tuned band geometries are assigned by hashing each term's key, so every mark is unique against its neighbours yet identical across visits, and each wrapped line re-strokes like a human hand. A superscript Tabler Notes icon (hover/focus hint: “Case study”) sits outside the ink on green terms only; both distinctions also reach assistive tech through the accessible label. Both editions have their own pens — vivid translucent ink on light stock, a luminous low-load tint on dark.
- **A Ladder, Not a Duplicate:** Marked term → margin note (label, figure, one sentence) → the full note, with a project destination exposed only where one exists. Above 1420px the note simply continues in the margin; below it, the same content binds into the document flow.
- **A Time Axis:** Experience sets its years in a mono rail hanging in the sheet's own margin, so tenure and sequence read at a glance without parsing a sentence. It replaced the company-left/dates-right row — the most generic pattern the résumé form has.
- **The Document Makes Room:** Nothing floats over the page on a desktop. On wide displays a clicked term's margin note unfolds in place — the remaining narrative continues below its first sentence, neighbouring notes glide down frame-by-frame to make room, the rest of the margin recedes a step, and the note's hairline extends across the column. Between 600px and the wide tier, the note binds INTO the document flow directly after the term's own paragraph or bullet: hairline above and below, mono label with a quiet fold control, full-measure media plate, and the narrative set in two columns like a printed footnote block. Project-backed notes keep the black-and-white destination directly after the media on every surface.
- **Magazine-Style Marginalia:** Margin annotations that reveal as hotspots scroll into view on wide displays (≥1420px — a threshold derived from sheet + gutter + column, so a 1440px laptop qualifies), with a cold-start intro annotation when all hotspots are initially below the fold.
- **A Portrait That Greets:** A hand-drawn line engraving of the author sits opposite the masthead name, straddling the rule. The first hover (or tap) plays a one-time staged smile that stays for the visit — currentColor ink, so both editions draw it themselves.
- **Rich Media & Context-Aware Video:** Seamless inline playback of videos and arrays of mixed format images, bundled as elegant native carousels with swipe support, circular chevron navigation that never dead-ends, and pagination.
- **Accessible Editorial Design:** WCAG AA compliant contrast calibration and semantic ARIA 1.1 structure.
- **Mobile-First Bottom Sheets:** Native-feeling bottom sheet with swipe-down dismiss (velocity-aware flick detection), tap-outside-to-close, a visible pill drag handle, and a 44×44px close button meeting Apple HIG and WCAG touch-target standards.

- **Two Editions:** Light is the default — the paper metaphor only holds on paper. Dark is a tuned night edition with its own stock (near-black, not true black, so the photographs have something to sit on), not an inversion. The edition flag is `html.theme-dark`; case-study section wrappers use `section-light`/`section-dark` so a section and the global edition can never collide in the cascade. Switching editions is an ink wash, not a flash: the next edition blooms out of the toggle itself (View Transition API + an SVG mask whose blob edge undulates via embedded SMIL as it spreads), with a half-opacity bleed halo soaking ahead of the front. Reduced motion gets a quiet crossfade; browsers without the API keep the instant switch.
- **Feature Flags:** Server-side `CASE_STUDY_LINKS` controls which case-study links and semantic markers reach popovers and marginalia, supporting incremental publishing without code changes.
- **Content Integrity Suite:** Automated validation of hotspot links, image paths, and media arrays to prevent regressions.
- **Verified Asset Pipeline:** Intrinsic image dimensions are read at render time, optimized popover URLs retain their output geometry, and content verification blocks missing media before deployment.
- **Brand-Accurate Case Study Theming:** Each case study is its client's environment — Delta reads as Delta, Truist as Truist. `CaseStudyLayout` takes the page's `accent` and a validated server-side utility (`src/utils/color.ts`) derives `--accent`, `--accent-rgb`, `--accent-contrast` and `--accent-ink`, applied as an inline body style so brand colours can never bleed between pages regardless of CSS bundle order. `--accent-ink` darkens a brand only as far as legibility requires, so a light brand can set 11px type without dropping under AA.
- **Data-Driven Case Studies:** Content-separated architecture — each study is a self-contained `<slug>.json` file; a dispatcher component (`CaseStudySection.astro`) switches on a `type` field to render the correct layout composition. Adding a new case study or a new section type requires no changes to existing pages.
- **Context-Preserving Project Navigation:** Returning from a case study restores the exact résumé position and reopens the note the reader left from — margin, bound-in, or sheet, per the current tier — including its carousel frame, when the browser cache does not retain them.

## Quick Start

```bash
npm install     # Install dependencies
npm run verify  # Validate content integrity (hotspots & images)
npm run dev     # Start development server
npm run dev:status # Inspect a server left by an older session
npm run dev:stop   # Stop a server left by an older session
npm run format  # Apply Prettier formatting
npm run lint    # Run ESLint across Astro, TypeScript, and JavaScript
npm run check   # Run Astro type and template diagnostics
npm run test    # Run unit tests
npm run build   # Production-ready build (runs verify automatically)
npm run quality # Run the complete pre-deployment gate
```

## Documentation Map

- [**PRODUCT.md**](./PRODUCT.md) — Feature specifications and strategic value proposition.
- [**USER_GUIDE.md**](./USER_GUIDE.md) — Setup, source-material and content management, and deployment workflows.
- [**ARCHITECTURE.md**](./ARCHITECTURE.md) — Technical design, modular interactive engines, and data flow.
- [**DESIGN.md**](./DESIGN.md) — The visual system: palette doctrine, type roles, layout rules, components. Machine-readable tokens in the frontmatter.
- [**DOCUMENTATION.md**](./DOCUMENTATION.md) — Meta-documentation philosophy and maintenance rules.
