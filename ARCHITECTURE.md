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
- **Widen Hint:** Triggers nudge animations between 1024px-1399px to signal hidden marginalia content.

### 3. Native CSS Highlighting
We removed JavaScript-based highlight orchestration in favor of native CSS robustness:
- **`box-decoration-break: clone`:** Enables precise padding and border-radius applications geometry wrapping across multiple lines.

## Shared Infrastructure

- **DOM Utilities (`dom.ts`):** Centralized helper for required elements, global variables, and shared HTML building logic for cards.
- **Constants (`constants.ts`):** Single source of truth for breakpoints, timing, and visual constants. Includes WCAG-calibrated R/G/B values to ensure parity between CSS and JS-rendered elements.
- **Global CSS:** `src/styles/global.css` defines the core design system (4px baseline) and sophisticated transitions.

## Testing Strategy
- **Vitest + JSDOM:** Core logic is verified against a simulated browser environment.
- **Key Testable Units:** 
  - `src/utils/render.ts`: Verifies hotspot-to-span transformation logic.
  - `src/scripts/dom.ts`: Validates shared HTML construction and global variable safety.
  - `src/scripts/constants.ts`: Sanity checks for visual and geometric configuration.
