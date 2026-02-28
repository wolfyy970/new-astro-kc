# Product Specification

KC Wolff-Ingham's portfolio is a high-impact, interactive digital presence for a senior design leader. It is designed to demonstrate both strategic depth and technical fluency.

## Core Features

### 1. Interactive Resume (Home Page)
The primary landing experience is a "living" resume document.
- **Editorial Hero Section:** A clean, high-contrast introduction with smooth fade-in animations and a sharp tagline: "Design leadership, product depth, and technical savvy."
- **Popovers (Hotspots):** Inline links that trigger detailed context overlays.
  - **Draggable Context:** Popovers can be moved around the screen on desktop, allowing persistent reference while reading.
  - **Focus Management:** Full keyboard support and focus trapping for an accessible experience.
  - **Integrated Close:** Consistent, easy-to-find '×' button on both desktop and mobile.
- **Scroll Annotations:** On wide screens (≥1400px), key hotspots automatically reveal themselves as margin annotations as the user scrolls, providing a rich, "magazine-style" experience.
- **Annotation Dissolve:** A refined visual effect where margin annotations gracefully disappear when their corresponding popover is opened, avoiding visual clutter and content duplication.
- **Marginalia Discovery (Widen Hint):** On standard laptop/desktop screens (≥ 600px and < 1400px), an elegant "sticker peel" animation guides the user to widen their browser. Animated directional chevrons naturally slide around the edge of the resume document as the user resizes. Upon expanding past 1400px, the margin annotations reveal themselves immediately.
- **Executive Elegance Interaction:** Refined hotspot states with subtle underlines and semantic opacity control, ensuring a premium feel that prioritizes content readability.

### 2. Case Studies (Componentized)
Deep dives into major projects, now powered by a modular, high-performance template system:
- **Truist:** Focused on $66B merger strategy and C-suite foresight.
- **Sparks Grove (Delta):** Cinematic, editorial presentation of global media platforms.
- **Upwave:** Quantified-self venture and IoT behavioral science.

### 3. Foundation & Strategy
- **Content Integrity Suite:** Automated verification ensures that every interactive hotspot is valid, maps strictly one-to-one across the resume to avoid ambiguity, and every media asset is present, preventing regressions during content updates.
- **WCAG AA Compliance:** Rigorous color contrast calibration (4.5:1+) for all branding accents.
- **Semantic Structure:** Full ARIA 1.1 implementation, keyboard skip-links, and focus-trapped interactive cards.
- **Cinematic Pacing:** Fluid high-altitude photography blended with authoritative, accessible typography.
- **Performance Mastery:** From 1400px marginalia to mobile bottom-sheets with identical functional density and LCP-optimized image delivery.

## Target Audience
- Executive recruiters and hiring managers.
- C-Suite leadership in Product, Tech, and Design.
- Industry peers looking for design leadership benchmarks.
