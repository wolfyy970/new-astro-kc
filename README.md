# Confidential — KC Wolff-Ingham

High-fidelity Design Leadership Portfolio built with Astro 5.0. This project demonstrates strategic product depth, technical fluency, and a commitment to inclusive, high-presence digital experiences.

## Core Interactive Features

- **Draggable Context Overlay:** Floating desktop popovers that follow user focus, enabling persistent reference during reading.
- **Magazine-Style Marginalia:** Margin annotations that reveal as hotspots scroll into view on wide displays (≥1460px), with a cold-start intro annotation that sets the expectation when all hotspots are initially below the fold.
- **High-Fidelity Interaction:** Fragment-based text highlighting with content-aware directional fades.
- **Rich Media & Context-Aware Video:** Seamless inline playback of videos and arrays of mixed format images, bundled as elegant native carousels with swipe support, smart chevrons, and pagination.
- **Accessible Editorial Design:** WCAG AA compliant contrast calibration and semantic ARIA 1.1 structure.
- **Mobile-First Bottom Sheets:** Native-feeling bottom sheet with swipe-down dismiss (velocity-aware flick detection), tap-outside-to-close, a visible pill drag handle, and a 44×44px close button meeting Apple HIG and WCAG touch-target standards.

- **Executive Elegance Hotspots:** Refined interaction model with subtle underlines and semantic opacity control.
- **Feature Flags:** Server-side `CASE_STUDY_LINKS` environment variable controls which case study links appear in popovers — supports incremental content publishing without code changes.
- **Content Integrity Suite:** Automated validation of hotspot links, image paths, and media arrays to prevent regressions.
- **Image Optimization Pipeline:** Build-time asset processing using Astro 5.0 for high-performance WebP delivery.
- **Brand-Accurate Case Study Theming:** Each case study page carries its own `accent` color via `CaseStudyLayout`. A validated server-side utility (`src/utils/color.ts`) derives `--accent`, `--accent-rgb`, and `--accent-border` CSS custom properties, applied as an inline body style so brand colours can never bleed between pages regardless of CSS bundle order.
- **Data-Driven Case Studies:** Content-separated architecture — each study is a self-contained `<slug>.json` file; a dispatcher component (`CaseStudySection.astro`) switches on a `type` field to render the correct layout composition. Adding a new case study or a new section type requires no changes to existing pages.

## Quick Start

```bash
npm install     # Install dependencies
npm run setup   # Clean demo content to start fresh
npm run verify  # Validate content integrity (hotspots & images)
npm run dev     # Start development server
npm run test    # Run unit tests
npm run build   # Production-ready build (runs verify automatically)
```

## Documentation Map

- [**PRODUCT.md**](./PRODUCT.md) — Feature specifications and strategic value proposition.
- [**USER_GUIDE.md**](./USER_GUIDE.md) — Setup, content management, and manual deployment workflows.
- [**ARCHITECTURE.md**](./ARCHITECTURE.md) — Technical design, modular interactive engines, and data flow.
- [**DOCUMENTATION.md**](./DOCUMENTATION.md) — Meta-documentation philosophy and maintenance rules.
