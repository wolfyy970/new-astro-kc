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
- **Responsive Handling:** Swaps between floating draggable panels and mobile "bottom-sheets." The handle strip is repurposed on mobile as a visible pill-and-swipe affordance (48px tall, centered pill indicator) rather than hidden.
- **Mobile Swipe-to-Dismiss:** `makeMobileSwipeable()` attaches touch event listeners once at init. It only engages when `isMobileScreen()` is true, the drag direction is downward, and `scrollTop === 0` (so in-sheet content scrolling is never hijacked). During the gesture, `CLS_IS_DRAGGING` disables CSS transitions and a `--sheet-drag-offset` CSS custom property drives the live transform. On release, a velocity check (`SWIPE_DISMISS_VELOCITY = 0.4 px/ms`) or distance check (`SWIPE_DISMISS_THRESHOLD = 80px`) decides dismiss vs. snap-back. The CSS variable approach is required because the mobile transform rules use `!important`; since custom properties resolve before `!important` is evaluated, JS can set `--sheet-drag-offset` via `style.setProperty()` to override the value without fighting specificity. `closePopover()` always resets the property so the next open starts clean.
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

### 3. Deterministic Type Scale

All `font-size` values in `src/styles/global.css` are driven by 13 semantic CSS custom properties defined once in `:root`:

| Variable | Role | Desktop | Mobile | Small Mobile |
|---|---|---|---|---|
| `--type-editorial` | Hero name | clamp(48–88px) | clamp(36–52px) | 42px |
| `--type-editorial-sub` | Hero subtitle | clamp(18–24px) | 18px | — |
| `--type-h1` – `--type-h5` | Document hierarchy | 36/18/15/16/15px | 24/16/13/14/13px | 22/15px |
| `--type-body-lg` / `--type-body` / `--type-body-sm` | Body copy | 17/16/14px | 16/16/13px | — |
| `--type-meta` | Mono labels | 11px | 12px | — |
| `--type-stat` | Display numbers | 28px | 28px | — |
| `--type-legal` | Footer fine print | 12px | 11px | — |

**The rule:** breakpoints override `:root` variables only — never individual element `font-size`. To change how any level looks at any viewport, change one variable and it cascades everywhere. No element-level `font-size` magic numbers are permitted (one deliberate exception: `.site-footer p` at 10px watermark scale, documented inline).

### 4. Native CSS Highlighting (Hotspot Highlighting)
We've refined the interactive highlighting for "Executive Elegance":
- **`box-decoration-break: clone`:** Enables precise padding and border-radius application across multiple lines.
- **Semantic Opacity Control:** All hotspot states (default, hover, active) are governed by dry CSS variables in `global.css`.

### 5. Case Study Template System

The case study system has three distinct layers. Each layer has a single responsibility, and a new agent should understand all three before making changes.

```
src/content/case-studies/
  manifest.json          ← ordered index of all published studies
  truist.json            ← self-contained data for one study
  upwave.json
  sparks-grove.json
  two-way-tv.json

src/pages/
  truist.astro           ← thin shell: imports JSON, renders hero + context + sections
  upwave.astro
  sparks-grove.astro
  two-way-tv.astro

src/components/case-studies/
  CaseStudySection.astro ← dispatcher: switches on section.type
  CaseStudyLayout.astro  ← HTML shell, fonts, back nav, accent theming
  CaseStudyHero.astro    ← full-bleed or device-mockup hero
  ContextGrid.astro      ← challenge/role/scope/team grid
  ShowcaseSection.astro  ← section wrapper (light or dark)
  ShowcaseGrid.astro     ← 1/2/3-column CSS grid
  ShowcaseCard.astro     ← image + title + description card
  FeatureRow.astro       ← 50/50 image-beside-text row
```

**Data flows like this:**

1. `manifest.json` — used by `verify-content.ts` to enumerate all studies and check image paths at build time. Also available for future nav/listing components.
2. `truist.json` (etc.) — imported directly by the page file. Contains `meta`, `hero`, `context`, and an ordered `sections` array.
3. `truist.astro` — passes `meta` to `CaseStudyLayout`, `hero` to `CaseStudyHero`, `context` to `ContextGrid`, then maps `cs.sections` through `CaseStudySection`.
4. `CaseStudySection.astro` — reads `section.type` and renders the correct component tree. Also handles `bg` (background color/gradient wrapper) and `darkBg` (`--case-study-dark` override).

#### Section Type Catalog

Every section in a study JSON file must have a `type` field. `CaseStudySection.astro` switches on this value.

| `type` | What renders | Required JSON fields | Optional JSON fields |
|---|---|---|---|
| `cardGrid` | ShowcaseSection + ShowcaseGrid + ShowcaseCard[] | `cards[]` | `columns` (1-3, default 2), `isDark`, `bg`, `darkBg` |
| `mixedGrid` | ShowcaseSection + 1-col grid (primaryCard) + 2-col grid (secondaryCards) | `primaryCard`, `secondaryCards[]` | `isDark`, `bg`, `darkBg` |
| `featureRow` | FeatureRow (image beside text, optionally reversed) | `title`, `description`, `image`, `imageAlt` | `reverse`, `label`, `bg` |
| `textOnly` | ShowcaseSection with no child grid | `title`, `description` | `label`, `isDark`, `bg`, `darkBg` |
| `largeImage` | ShowcaseSection + constrained full-width Image | `image`, `imageAlt` | `label`, `title`, `description`, `imageWidth`, `imageHeight`, `bg` |
| `fullBleed` | Full-viewport `<section>` + Image (no text) | `image`, `imageAlt` | `bg` |

**Shared optional fields on every section:** `key` (identifier, not rendered), `label` (eyebrow text), `bg` (any CSS color or gradient), `isDark` (dark variant), `darkBg` (overrides accent-derived dark background).

#### Brand Colour Theming

`CaseStudyLayout` accepts a required `accent` prop (6-digit hex string). The layout passes this to `src/utils/color.ts → buildAccentStyle()`, which validates the hex, derives an RGB triplet and border variant, and emits all three as an inline `style` on `<body>`:

```
--accent: #3b1a5a; --accent-rgb: 59, 26, 90; --accent-border: rgba(59, 26, 90, 0.2);
```

Inline styles take precedence over any stylesheet rule, so brand colours cannot bleed between pages regardless of CSS bundle concatenation order. If `accent` is omitted or malformed, `resolveHexColor()` falls back to the portfolio amber (`#70541C`) and emits a dev-mode console warning. Components should use `var(--accent, currentColor)` rather than any brand-specific hardcoded fallback.

Dark sections (`isDark: true`) compute their background using `color-mix(in srgb, var(--accent) 80%, #000)`. When this produces an unsuitable result (e.g. Upwave's orange accent yields a dark orange, not the intended charcoal), set `darkBg` on the section to override it — this sets `--case-study-dark` on the wrapper div, which `ShowcaseSection` reads as a fallback before the color-mix computation.

#### How to add a new case study

1. Create `src/content/case-studies/<slug>.json` following the schema in `.vscode/case-study.schema.json`.
2. Add one entry to `src/content/case-studies/manifest.json` (slug, title, description, accent, ogImage).
3. Create `src/pages/<slug>.astro` — copy any existing page as a template. The body is always: import JSON, render `CaseStudyHero`, `ContextGrid`, then `cs.sections.map(s => <CaseStudySection {...s} />)`.
4. Add the new page's filename to the `fileMatch` list in `.vscode/settings.json` so the JSON schema activates in the editor.
5. Set `CASE_STUDY_LINKS=true` (or add the slug) in your `.env.local` to enable the popover link.
6. Run `npm run verify` — the script reads from `manifest.json` to discover and validate all image paths.

#### How to add a new section type

1. Add the new type string to the `enum` in `.vscode/case-study.schema.json` → `definitions.Section.allOf[0].properties.type`.
2. Add an `if/then` rule block in the same file to enforce required fields for the new type.
3. Add a conditional branch in `src/components/case-studies/CaseStudySection.astro` (follow the existing pattern).
4. Add a row to the Section Type Catalog table above.
5. Add any required props to the `Props` interface and destructuring block in `CaseStudySection.astro`.

## Content Integrity & Performance

### 1. Content Integrity Suite (`scripts/verify-content.ts`)
A custom TypeScript-driven verification system that ensures 100% link safety:
- **Schema Validation:** Enforces strict structural integrity for `resume.json` and `popovers.json`, with `try/catch` around JSON parsing so malformed files produce a clean error rather than a stack trace.
- **Hotspot Validation:** Cross-references `<hotspot>` tags in `resume.json` against `popovers.json` inventory, and enforces a strict 1:1 mapping by failing the build if any duplicate hotspots are used in the resume.
- **Media Validation:** Validates that every `img` path and every path within `media` arrays exists in the `public/` directory.
- **Case Study Validation:** Reads `src/content/case-studies/manifest.json` to enumerate all studies, then for each slug verifies that the individual `<slug>.json` file exists and that every image referenced in `meta`, `hero`, and all `sections` entries resolves to a real file in `public/`.
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
  - `src/scripts/constants.ts`: Structural invariants — breakpoint ordering, value ranges, `VIDEO_EXTENSIONS` contents, CSS class/selector format, and swipe-gesture thresholds (`SWIPE_DISMISS_THRESHOLD`, `SWIPE_DISMISS_VELOCITY`).
