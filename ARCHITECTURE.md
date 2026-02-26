# Architecture & Technical Design

## System Overview

The portfolio is built on **Astro 5.0**, leveraging its strengths in content-heavy, static-site generation with minimal JavaScript delivery.

## Component & Layout Strategy

### Layouts
- **BaseLayout.astro:** Used for the main interactive resume. Handles global fonts (Cormorant Garamond, Source Sans 3, JetBrains Mono) and the popover overlay infrastructure.
- **CaseStudyLayout.astro:** Used for individual case study pages. It includes navigation back to home and a different font set (Inter, Playfair Display) better suited for long-form case study reading.

### Content Flow
1. **JSON Files:** `resume.json` and `popovers.json` act as the "database."
2. **Page Templates:** `src/pages/index.astro` reads the JSON data.
3. **Hotspot Processing:** A helper function `renderHotspots` converts the `<hotspot>` tags in the JSON strings into interactive `<span>` elements during the build process.

## Interactive Systems

### Popover Engine
A client-side JavaScript engine in `index.astro` handles:
- Position calculation for desktop popovers.
- "Bottom-sheet" behavior for mobile popovers.
- Focus management and accessibility (ARIA).

### Margin Annotation System
A custom implementation using `IntersectionObserver` that:
- Monitors hotspots as they enter the viewport.
- Triggers the appearance of absolute-positioned annotations in the page margins on wide displays (≥1400px).
- **Marginalia Preview (Desktop Discovery):** When the window is between 1024px and 1399px, a vertical discovery hint is displayed. As hotspots enter the viewport, a subtle "nudge" animation is triggered to encourage users to widen their browser.
- Resolves vertical overlaps to ensure a clean layout on wide displays.

## Styling
- **Global CSS:** `src/styles/global.css` handles the main resume styling and the complex interactive UI components.
- **Case Study CSS:** `src/styles/case-study.css` provides base styling for the case study templates, which is then extended by page-specific styles.
