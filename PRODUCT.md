# Product Specification

KC Wolff-Ingham's portfolio is a high-impact, interactive digital presence for a senior design leader. It is designed to demonstrate both strategic depth and technical fluency.

## Core Features

### 1. Interactive Resume (Home Page)
The primary landing experience is a "living" resume document.
- **Editorial Hero Section:** A clean, high-contrast introduction with smooth fade-in animations and a sharp tagline: "Design leadership, product depth, and technical savvy."
- **Popovers (Hotspots):** Inline links that trigger detailed context overlays.
  - **Rich Media & Carousels:** Popovers and marginalia support arrays of mixed media (images and video). Multiple items automatically render as swipeable carousels featuring elegant pagination dots and subtle chevron navigation that dynamically appear and fade out when navigating.
  - **Context-Aware Video Playback:** Videos embedded in arrays natively autoplay silently, while standalone videos or those in the first position start paused with a custom UI overlay play button, respecting user intent.
  - **Draggable Context:** Popovers can be moved around the screen on desktop, allowing persistent reference while reading.
  - **Focus Management:** Full keyboard support and focus trapping for an accessible experience.
  - **Integrated Close:** Consistent, easy-to-find '×' button on both desktop and mobile.
- **Scroll Annotations:** On wide screens (≥1460px), key hotspots automatically reveal themselves as margin annotations as the user scrolls, providing a rich, "magazine-style" experience.
- **Cold-Start Intro Annotation:** When the page first loads at wide screen with all hotspots below the fold (the margin would otherwise be empty), a native-feeling introductory annotation automatically appears in the left margin. It sets the expectation — "Scroll to reveal..." — then gracefully dissolves the moment the first real annotation scrolls into view.
- **Annotation Dissolve:** A refined visual effect where margin annotations gracefully disappear when their corresponding popover is opened, avoiding visual clutter and content duplication.
- **Marginalia Discovery (Widen Hint):** On standard laptop/desktop screens (≥1024px and <1460px), an elegant "sticker peel" animation guides the user to widen their browser. Animated directional chevrons naturally slide around the edge of the resume document as the user resizes. Upon expanding past 1460px, the margin annotations reveal themselves immediately.
- **Executive Elegance Interaction:** Refined hotspot states with subtle underlines and semantic opacity control, ensuring a premium feel that prioritizes content readability.

### 2. Case Studies (Componentized)
Deep dives into major projects, now powered by a modular, high-performance template system:
- **Truist:** Focused on $66B merger strategy and C-suite foresight.
- **Sparks Grove (Delta):** Cinematic, editorial presentation of global media platforms.
- **Upwave:** Quantified-self venture and IoT behavioral science.
- **Two Way TV:** Design and launch of the UK's first interactive TV multiplayer game service (BAFTA nominated).

### 3. Foundation & Strategy
- **Feature Flags:** `CASE_STUDY_LINKS` environment variable controls which case study links are visible in popovers. Filtering is server-side — the client never receives links to unpublished pages. Supports incremental content publishing without code changes.
- **Brand-Accurate Case Study Theming:** Each case study page applies its own brand accent colour via `CaseStudyLayout`. The colour is validated at build time and propagated as CSS custom properties (`--accent`, `--accent-rgb`, `--accent-border`) on `<body>`, preventing any brand colour from leaking into adjacent pages regardless of CSS bundle order.
- **Content Integrity Suite:** Automated verification ensures that every interactive hotspot is valid, maps strictly one-to-one across the resume to avoid ambiguity, and every media asset (including `media` arrays) is present, preventing regressions during content updates.
- **Security Hardening:** Constant-time cookie comparison (timing-attack resistant), fail-closed authentication (503 if `SITE_PASSWORD` is absent), refined asset path matching, and full security header suite (`X-Robots-Tag`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
- **WCAG AA Compliance:** Rigorous color contrast calibration (4.5:1+) for all branding accents.
- **Semantic Structure:** Full ARIA 1.1 implementation, keyboard skip-links, and focus-trapped interactive cards.
- **Cinematic Pacing:** Fluid high-altitude photography blended with authoritative, accessible typography.
- **Performance Mastery:** From 1460px marginalia to mobile bottom-sheets with identical functional density and LCP-optimized image delivery.

## Target Audience
- Executive recruiters and hiring managers.
- C-Suite leadership in Product, Tech, and Design.
- Industry peers looking for design leadership benchmarks.
