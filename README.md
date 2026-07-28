# Confidential — KC Wolff-Ingham

High-fidelity Design Leadership Portfolio built with Astro 7. This project demonstrates strategic product depth, technical fluency, and a commitment to inclusive, high-presence digital experiences.

## Core Interactive Features

- **The Annotated Document:** The whole piece is a printed monograph marked up in the margin — a masthead carrying every piece of identity once, then the résumé on one continuous sheet with notes running down both margins. One serif (Newsreader) sets both the title and the 17px body so the page reads as a single publication; a mono carries the annotation apparatus only. The résumé is achromatic: the only colour on it is inside the photographs, which are the work.
- **Semantic Annotated Terms:** Every annotated term has a quiet hairline underline. A superscript Tabler Notes icon appears only when the note also leads to a deeper case study; its hover/focus hint says “Case study.” Marginalia-only terms carry no redundant icon.
- **A Ladder, Not a Duplicate:** Marked term → margin note (label, figure, one sentence) → the full note, with a project destination exposed only where one exists. Above 1420px the note expands in place and the popover never opens; below it, the same content arrives as a panel.
- **A Time Axis:** Experience sets its years in a mono rail hanging in the sheet's own margin, so tenure and sequence read at a glance without parsing a sentence. It replaced the company-left/dates-right row — the most generic pattern the résumé form has.
- **Draggable Context Overlay:** Fluid 480–560px desktop popovers that can be repositioned while preserving a readable measure. Project-backed notes put a clean, sticky black-and-white destination directly after the media (or after the note heading when there is no media), so it remains visible as the narrative scrolls.
- **Magazine-Style Marginalia:** Margin annotations that reveal as hotspots scroll into view on wide displays (≥1420px — a threshold derived from sheet + gutter + column, so a 1440px laptop qualifies), with a cold-start intro annotation when all hotspots are initially below the fold.
- **Rich Media & Context-Aware Video:** Seamless inline playback of videos and arrays of mixed format images, bundled as elegant native carousels with swipe support, smart chevrons, and pagination.
- **Accessible Editorial Design:** WCAG AA compliant contrast calibration and semantic ARIA 1.1 structure.
- **Mobile-First Bottom Sheets:** Native-feeling bottom sheet with swipe-down dismiss (velocity-aware flick detection), tap-outside-to-close, a visible pill drag handle, and a 44×44px close button meeting Apple HIG and WCAG touch-target standards.

- **Two Editions:** Light is the default — the paper metaphor only holds on paper. Dark is a tuned night edition with its own stock (near-black, not true black, so the photographs have something to sit on), not an inversion. The edition flag is `html.theme-dark`; case-study section wrappers use `section-light`/`section-dark` so a section and the global edition can never collide in the cascade.
- **Feature Flags:** Server-side `CASE_STUDY_LINKS` controls which case-study links and semantic markers reach popovers and marginalia, supporting incremental publishing without code changes.
- **Content Integrity Suite:** Automated validation of hotspot links, image paths, and media arrays to prevent regressions.
- **Image Optimization Pipeline:** Build-time asset processing using Astro 7 for high-performance WebP delivery.
- **Brand-Accurate Case Study Theming:** Each case study is its client's environment — Delta reads as Delta, Truist as Truist. `CaseStudyLayout` takes the page's `accent` and a validated server-side utility (`src/utils/color.ts`) derives `--accent`, `--accent-rgb`, `--accent-contrast` and `--accent-ink`, applied as an inline body style so brand colours can never bleed between pages regardless of CSS bundle order. `--accent-ink` darkens a brand only as far as legibility requires, so a light brand can set 11px type without dropping under AA.
- **Data-Driven Case Studies:** Content-separated architecture — each study is a self-contained `<slug>.json` file; a dispatcher component (`CaseStudySection.astro`) switches on a `type` field to render the correct layout composition. Adding a new case study or a new section type requires no changes to existing pages.
- **Context-Preserving Project Navigation:** Returning from a case study restores the exact résumé position and reconstructs the open popover, its carousel frame, internal scroll, and dragged position when the browser cache does not retain them.

## Quick Start

```bash
npm install     # Install dependencies
npm run verify  # Validate content integrity (hotspots & images)
npm run dev     # Start development server
npm run format  # Apply Prettier formatting
npm run lint    # Run ESLint across Astro, TypeScript, and JavaScript
npm run check   # Run Astro type and template diagnostics
npm run test    # Run unit tests
npm run build   # Production-ready build (runs verify automatically)
```

## Documentation Map

- [**PRODUCT.md**](./PRODUCT.md) — Feature specifications and strategic value proposition.
- [**USER_GUIDE.md**](./USER_GUIDE.md) — Setup, content management, and manual deployment workflows.
- [**ARCHITECTURE.md**](./ARCHITECTURE.md) — Technical design, modular interactive engines, and data flow.
- [**DESIGN.md**](./DESIGN.md) — The visual system: palette doctrine, type roles, layout rules, components. Machine-readable tokens in the frontmatter.
- [**DOCUMENTATION.md**](./DOCUMENTATION.md) — Meta-documentation philosophy and maintenance rules.
