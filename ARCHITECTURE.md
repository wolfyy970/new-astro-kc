# Architecture & Technical Design

## System Overview

The portfolio is built on **Astro 5.0**, leveraging its strengths in content-heavy, static-site generation with minimal JavaScript delivery.

## Component & Layout Strategy

### Layouts
- **BaseLayout.astro:** Used for the main interactive resume. Handles global fonts (Cormorant Garamond, Source Sans 3, JetBrains Mono) and the popover overlay infrastructure.
- **CaseStudyLayout.astro:** Used for individual case study pages. It includes navigation back to home and a different font set (Inter, Playfair Display).

### Content Flow
1. **JSON Files:** `resume.json` and `popovers.json` act as the "database."
2. **Feature Flags (`src/utils/feature-flags.ts`):** `applyFeatureFlags` strips `link`/`linkText` from any popover whose case study page is not enabled in `CASE_STUDY_LINKS`. This runs server-side in `index.astro` before data is serialised to `window.__POPOVERS__`, so the client never receives links to unpublished pages.
3. **Page Templates:** `src/pages/index.astro` reads the JSON data, applies feature flags, then optimizes images.
4. **Hotspot Processing:** `renderHotspots` converts `<hotspot>` tags into interactive `<span>` elements with appropriate ARIA attributes.

## Interactive Systems

The interactive layer is decomposed into modular engines for maintainability and focus:

### 1. Popover Engine (`popover-engine.ts`)
Handles the heavy lifting for the contextual overlay system:
- **Draggable Context:** Desktop popovers are draggable via a dedicated chrome handle, allowing users to move them while browsing.
- **Focus Management:** Implements full focus trapping and keyboard navigation (Tab/Shift-Tab, Escape to close).
- **Responsive Handling:** Swaps between floating draggable panels and mobile "bottom-sheets."
- **Annotation Sync:** "Dissolves" (suppresses) the corresponding margin annotation when a popover is open to prevent content duplication.
- **Viewport-Aware Positioning:** Initial placement uses `POPOVER_MAX_HEIGHT_VH` (matching the CSS `max-height` rule) as the worst-case height estimate for the above/below flip decision. After the first render frame, a post-render clamp measures the actual `offsetHeight` and re-adjusts `top` if the popover overflows the viewport — ensuring tall carousels always stay on screen without relying on hardcoded height estimates.

### 2. Annotation Engine (`annotation-engine.ts`)
Manages the "magazine-style" margin content:
- **Automatic DOM Mapping:** Dynamically parses `.hotspot` anchors in the DOM and automatically alternates left/right side assignments for marginalia (decoupling content creation from configuration).
- **Intersection Observation:** Rebuilds and positions margin annotations as hotspots scroll into view.
- **Overlap Resolution:** Algorithmic adjustment to prevent vertical collisions between adjacent annotations.
- **Cold-Start Intro Annotation:** When the engine initializes at wide screen and no hotspots are immediately in the viewport, a native-feeling introductory annotation is injected at the top of the margin. It sets the expectation for the interactive experience and dissolves the moment the first real annotation reveals. Cleaned up immediately on resize/teardown via `resetAnnotationState`.
- **Widen Hint ("Sticker Peel"):** An intricate resize-driven interaction on laptop sizes (1024px–1459px). It features tracking SVG `<textPath>` components that physically roll out around the resume's boundaries synchronously as the user resizes, avoiding complex CSS transforms. It automatically resets IntersectionObservers to detect immediate visibility upon completion.
- **Lifecycle Safety:** `resetAnnotationState()` handles DOM/state cleanup without aborting the `resizeAbortController`, preserving the resize listener across intermediate resets. `cleanupAnnotations()` performs a full teardown including the controller.

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

#### Brand Colour Theming
`CaseStudyLayout` accepts a required `accent` prop (6-digit hex string). The layout passes this to `src/utils/color.ts → buildAccentStyle()`, which validates the hex, derives an RGB triplet and border variant, and emits all three as an inline `style` on `<body>`:
```
--accent: #3b1a5a; --accent-rgb: 59, 26, 90; --accent-border: rgba(59, 26, 90, 0.2);
```
Inline styles take precedence over any stylesheet rule, so brand colours cannot bleed between pages regardless of CSS bundle concatenation order. If `accent` is omitted or malformed, `resolveHexColor()` falls back to the portfolio amber (`#70541C`) and emits a dev-mode console warning. Components should use `var(--accent, currentColor)` rather than any brand-specific hardcoded fallback.

## Content Integrity & Performance

### 1. Content Integrity Suite (`scripts/verify-content.ts`)
A custom TypeScript-driven verification system that ensures 100% link safety:
- **Schema Validation:** Enforces strict structural integrity for `resume.json` and `popovers.json`, with `try/catch` around JSON parsing so malformed files produce a clean error rather than a stack trace.
- **Hotspot Validation:** Cross-references `<hotspot>` tags in `resume.json` against `popovers.json` inventory, and enforces a strict 1:1 mapping by failing the build if any duplicate hotspots are used in the resume.
- **Media Validation:** Validates that every `img` path and every path within `media` arrays exists in the `public/` directory.
- **Build Guard:** Integrated into the `npm run build` process to prevent broken deployments.

### 2. Image Optimization Pipeline
Leverages Astro's Image Service for modern asset delivery:
- **Static Assets:** Automatic WebP conversion and resizing within case study components.
- **Dynamic Assets:** Build-time pre-optimization of all popover images in `index.astro`, ensuring even dynamically loaded content is hashed and optimized.

## Security

Authentication lives in `src/middleware.ts`:
- **Fail-closed:** Returns `503` if `SITE_PASSWORD` is not configured (never accidentally open).
- **Constant-time comparison:** `safeEqual()` uses XOR byte-by-byte comparison to prevent timing attacks on cookie validation.
- **Asset bypass:** `ASSET_EXT` regex precisely matches static file extensions — avoids the overly broad `.includes('.')` approach.
- **Security headers:** Every authenticated response sets `X-Robots-Tag`, `Cache-Control`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`.

## Testing Strategy
- **Vitest + JSDOM:** Core logic and utility functions are verified against a simulated browser environment.
- **Key Testable Units:**
  - `src/utils/color.ts`: Hex validation, RGB conversion, and full `buildAccentStyle()` output for the brand theming system.
  - `src/utils/validation.ts`: Logic for extracting and validating hotspots.
  - `src/utils/images.ts`: Pipeline for pre-optimizing dynamic image assets, including case-insensitive extension handling and forwarding of `IMAGE_OPTIMIZE_OPTIONS`.
  - `src/utils/render.ts`: Hotspot-to-span transformation, verified to use `SEL_HOTSPOT` and `ID_POPOVER` constants.
  - `src/utils/feature-flags.ts`: Slug parsing, `isCaseStudyLinkEnabled`, and `applyFeatureFlags` immutability.
  - `src/scripts/annotation-engine.ts`: Side assignment, overlap resolution, and cold-start intro annotation lifecycle.
  - `src/scripts/dom.ts`: DOM construction for popovers, carousels, and accessibility attributes.
  - `src/scripts/constants.ts`: Structural invariants — breakpoint ordering, value ranges, `VIDEO_EXTENSIONS` contents, CSS class/selector format.
