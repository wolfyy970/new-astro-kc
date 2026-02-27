# Architecture & Technical Design

## System Overview

The portfolio is built on **Astro 5.0**, leveraging its strengths in content-heavy, static-site generation with minimal JavaScript delivery.

## Component & Layout Strategy

### Layouts
- **BaseLayout.astro:** Used for the main interactive resume. Handles global fonts (Cormorant Garamond, Source Sans 3, JetBrains Mono) and the popover overlay infrastructure.
- **CaseStudyLayout.astro:** Used for individual case study pages. It includes navigation back to home and a different font set (Inter, Playfair Display).

### Content Flow
1. **JSON Files:** `resume.json` and `popovers.json` act as the "database."
2. **Page Templates:** `src/pages/index.astro` reads the JSON data.
3. **Hotspot Processing:** `renderHotspots` converts `<hotspot>` tags into interactive `<span>` elements with appropriate ARIA attributes.

## Interactive Systems

The interactive layer is decomposed into modular engines for maintainability and focus:

### 1. Popover Engine (`popover-engine.ts`)
Handles the heavy lifting for the contextual overlay system:
- **Draggable Context:** Desktop popovers are draggable via a dedicated chrome handle, allowing users to move them while browsing.
- **Focus Management:** Implements full focus trapping and keyboard navigation (Tab/Shift-Tab, Escape to close).
- **Responsive Handling:** Swaps between floating draggable panels and mobile "bottom-sheets."
- **Annotation Sync:** "Dissolves" (suppresses) the corresponding margin annotation when a popover is open to prevent content duplication.

### 2. Annotation Engine (`annotation-engine.ts`)
Manages the "magazine-style" margin content:
- **Automatic DOM Mapping:** Dynamically parses `.hotspot` anchors in the DOM and automatically alternates left/right side assignments for marginalia (decoupling content creation from configuration).
- **Intersection Observation:** Rebuilds and positions margin annotations as hotspots scroll into view.
- **Overlap Resolution:** Algorithmic adjustment to prevent vertical collisions between adjacent annotations.
- **Widen Hint ("Sticker Peel"):** An intricate resize-driven interaction on laptop and tablet sizes (600px - 1399px). It features tracking SVG `<textPath>` components that physically roll out around the resume's boundaries synchronously as the user resizes the window, avoiding complex CSS transforms. It automatically resets IntersectionObservers to detect immediate visibility upon completion.

### 3. Native CSS Highlighting
We've refined the interactive highlighting for "Executive Elegance":
- **`box-decoration-break: clone`:** Enables precise padding and border-radius application across multiple lines.
- **Semantic Opacity Control:** All hotspot states (default, hover, active) are governed by dry CSS variables in `global.css`.

### 4. Case Study Template System
A modular suite of Astro components for consistent, high-performance case study authoring:
- **CaseStudyHero.astro:** Background-integrated hero sections with LCP-optimized images.
- **ContextGrid.astro:** Standardized challenge/role/scope layout.
- **ShowcaseGrid.astro / ShowcaseCard.astro:** Responsive, optimized image galleries.
- **FeatureRow.astro:** Asymmetric layouts for deep-dive content.

## Content Integrity & Performance

### 1. Content Integrity Suite (`scripts/verify-content.ts`)
A custom TypeScript-driven verification system that ensures 100% link safety:
- **Hotspot Validation:** Cross-references `<hotspot>` tags in `resume.json` against `popovers.json` inventory.
- **Media Validation:** Validates that every image path referenced in the content exists in the `public/` directory.
- **Build Guard:** Integrated into the `npm run build` process to prevent broken deployments.

### 2. Image Optimization Pipeline
Leverages Astro's Image Service for modern asset delivery:
- **Static Assets:** Automatic WebP conversion and resizing within case study components.
- **Dynamic Assets:** Build-time pre-optimization of all popover images in `index.astro`, ensuring even dynamically loaded content is hashed and optimized.

## Testing Strategy
- **Vitest + JSDOM:** Core logic and utility functions are verified against a simulated browser environment.
- **Key Testable Units:** 
  - `src/utils/validation.ts`: Logic for extracting and validating hotspots.
  - `src/utils/images.ts`: Pipeline for pre-optimizing dynamic image assets.
  - `src/utils/render.ts`: Hotspot-to-span transformation logic.
  - `src/scripts/annotation-engine.test.ts`: Layout and overlap resolution logic for marginalia.
