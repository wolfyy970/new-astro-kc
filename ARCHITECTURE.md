# Architecture & Technical Design

## System Overview

The portfolio is built on **Astro 7**, using server output through the Vercel adapter with minimal client JavaScript.

## Component & Layout Strategy

### Layouts

- **BaseLayout.astro:** Used for the main interactive resume. Renders the shared `<BaseHead />` and sets up the popover overlay infrastructure.
- **CaseStudyLayout.astro:** Used for individual case study pages. Adds context-preserving back navigation and per-page accent theming, and renders the same `<BaseHead />`.
- **BaseHead.astro:** Shared `<head>` partial (charset/viewport/title, `robots: noindex`, Open Graph + Twitter tags, favicon, fonts via `<HeadFonts />`, and the theme `<ThemeScript />`) used by both layouts so the document head can't drift between them.

### Content Flow

1. **JSON Files:** `resume.json` and `popovers.json` act as the "database."
2. **Feature Flags (`src/utils/feature-flags.ts`):** `applyFeatureFlags` strips `link`/`linkText` from any popover whose case study page is not enabled in `CASE_STUDY_LINKS`. This runs server-side in `index.astro` before data is serialised to `window.__POPOVERS__`, so the client never receives links to unpublished pages.
3. **Page Templates:** `src/pages/index.astro` reads the JSON data, optimizes popover images, then applies feature flags before serializing the final map to the client.
4. **Hotspot Processing:** one `createHotspotRenderer(popovers)` instance converts `<hotspot>` tags into interactive spans. Every term gets an underline; only an enabled project-backed term gets the superscript Tabler Notes icon and “Case study” hint.

## Interactive Systems

The interactive layer is decomposed into modular engines for maintainability and focus:

### 1. Popover Engine (`popover-engine.ts`)

Handles the heavy lifting for the contextual overlay system:

- **Draggable Context:** Desktop popovers are draggable via a dedicated chrome handle, allowing users to move them while browsing.
- **Focus Management:** Implements full focus trapping and keyboard navigation (Tab/Shift-Tab, Escape to close).
- **Responsive Handling:** Swaps between floating draggable panels and mobile "bottom-sheets." The handle strip is repurposed on mobile as a visible pill-and-swipe affordance (48px tall, centered pill indicator) rather than hidden.
- **Mobile Swipe-to-Dismiss:** `makeMobileSwipeable()` attaches touch event listeners once at init. It only engages when `isMobileScreen()` is true, the drag direction is downward, and `scrollTop === 0` (so in-sheet content scrolling is never hijacked). During the gesture, `CLS_IS_DRAGGING` disables CSS transitions and a `--sheet-drag-offset` CSS custom property drives the live transform. On release, a velocity check (`SWIPE_DISMISS_VELOCITY = 0.4 px/ms`) or distance check (`SWIPE_DISMISS_THRESHOLD = 80px`) decides dismiss vs. snap-back. The CSS variable approach is required because the mobile transform rules use `!important`; since custom properties resolve before `!important` is evaluated, JS can set `--sheet-drag-offset` via `style.setProperty()` to override the value without fighting specificity. `closePopover()` always resets the property so the next open starts clean.
- **Annotation Sync:** "Dissolves" (suppresses) the corresponding margin annotation when a popover is open to prevent content duplication.
- **Viewport-Aware Positioning:** Initial placement uses `POPOVER_MAX_HEIGHT_VH` (matching the CSS `max-height` rule) as the worst-case height estimate for the above/below flip decision. `clampToViewport()` then measures actual `offsetHeight` and pins the panel inside the viewport.

  Two things make that guarantee real, and both were previously missing:

  1. **The clamp re-runs as figures load.** Popover images carry no `width`/`height`, so until each resource resolves it contributes zero height and the panel grows _after_ it has been positioned. `onMediaReady()` (shared with the annotation engine, exported from `dom.ts`) re-clamps per figure, guarded on the note still being open.
  2. **Both edges are checked, in both places.** The flip (`topAboveIfItFits`) tested only the top margin and the clamp tested only the bottom, so each covered for the other's gap. When the term is outside the viewport — which happens on that late re-clamp if the reader has scrolled — "above the term" clears the top and still ends far past the bottom. Guarding only the bottom then pushes tall notes off the top instead: the same bug wearing a different hat. `clampToViewport` now clamps into `[minTop, maxTop]`, and pins to `minTop` when the panel is taller than the viewport (it scrolls internally).

### 2. Annotation Engine (`annotation-engine.ts`)

Manages the "magazine-style" margin content:

- **Automatic DOM Mapping:** Dynamically parses `.hotspot` anchors in the DOM and automatically alternates left/right side assignments for marginalia (decoupling content creation from configuration).
- **Intersection Observation:** Rebuilds and positions margin annotations as hotspots scroll into view.
- **Overlap Resolution:** Algorithmic adjustment to prevent vertical collisions between adjacent annotations.
- **Cold-Start Intro Annotation:** When the engine initializes at wide screen and no hotspots are immediately in the viewport, a native-feeling introductory annotation is injected at the top of the margin. It sets the expectation for the interactive experience and dissolves the moment the first real annotation reveals. Cleaned up immediately on resize/teardown via `resetAnnotationState`.
- **Resize tier handling:** A debounced `resize` handler builds annotations on entering the wide tier (≥1420px) and tears them down on leaving it.
- **The threshold is derived, not chosen:** `BREAKPOINT_WIDE` = 880 (sheet) + 2 × (42 gutter + 220 column) = 1404, rounded to 1420. The original 1460 sat just above the 1440px logical width of a 13" MacBook Air, so the feature the entire reading experience is built around was unreachable on a very common laptop no matter how the window was sized. If any of `DOC_MAX_WIDTH`, `MARGIN_COL_WIDTH` or `MARGIN_COL_GUTTER` changes, the threshold must be recomputed.
- **Widening discovery:** `WidenPrompt.astro` is an in-flow publication header between 600px and the 1420px wide tier. It occupies its own row above the masthead so it pushes the name down rather than covering it. Its progress hairline responds continuously as the browser is widened; crossing the threshold briefly confirms that the marginalia have been revealed, then collapses the row. It is an invitation to the simultaneous reading mode, not a content-access warning: annotated terms and panels keep every note available below the threshold.
- **Lifecycle Safety:** `resetAnnotationState()` handles DOM/state cleanup without aborting the `resizeAbortController`, preserving the resize listener across intermediate resets. `cleanupAnnotations()` performs a full teardown including the controller.

### 3. Deterministic Type Scale

Every `font-size` is driven by semantic custom properties defined once in **`src/styles/tokens.css`**. They live there rather than in `global.css` because three surfaces consume the scale — the résumé, the case studies and the login gate — and only the first two import `global.css`. While the scale lived in `global.css` the gate resolved every `--type-*` to nothing, so its input silently inherited 16px and its title collapsed to body size.

| Variable               | Role                      | Desktop        | ≤600px         | ≤380px         |
| ---------------------- | ------------------------- | -------------- | -------------- | -------------- |
| `--type-editorial`     | Masthead name             | clamp(40–68px) | clamp(34–44px) | clamp(30–38px) |
| `--type-editorial-sub` | Masthead tagline          | clamp(20–32px) | 21px           | —              |
| `--type-h2`            | Company names             | 22px           | 18px           | 17px           |
| `--type-h3`            | Section marks (mono)      | 11px           | 10px           | —              |
| `--type-h4`            | Job title, degree         | 17px           | 16px           | —              |
| `--type-h5`            | School name               | 15px           | 14px           | —              |
| `--type-body-lg`       | Lead paragraph            | 19px           | 18px           | —              |
| `--type-body`          | Body copy                 | 17px           | 17px           | —              |
| `--type-body-sm`       | Quotes, margin-note prose | 14px           | 14px           | —              |
| `--type-meta`          | Mono labels               | 11px           | 11px           | —              |
| `--type-year`          | Date rail                 | 12px           | 12px           | —              |
| `--type-stat`          | Panel display numbers     | 34px           | 34px           | —              |
| `--type-stat-margin`   | Margin display numbers    | 26px           | 26px           | —              |

Body copy stays 17px at every viewport including 375px: the scale reduces the display, headline and title levels on small screens and deliberately does not touch the body, because reading size is not a responsive variable. The two stat steps are one role in two rooms — the panel is a fluid 480–560px focal surface, the margin a 220px aside, and the panel's 34px there out-shouted the 22px company headings beside it.

**The rule:** a breakpoint overrides the `:root` variables only, never an element's `font-size`.

**Shared tokens (`tokens.css`, `controls.css`).** The palette, the font stacks and the type scale live in `src/styles/tokens.css`, imported by `global.css`, `case-study.css` and `login.astro`, so no surface can drift. The floating theme toggle and the case-study back link live in `src/styles/controls.css`, shared the same way. The résumé's own layout metrics (`--doc-max-width`, `--sheet-inset`, `--margin-col-*`, `--popover-*`) and annotation state variables stay in `global.css`.

**Palette.** The résumé is achromatic and each case study is its client's environment. That doctrine, its tokens and its contrast maths are documented once in [DESIGN.md](./DESIGN.md) and are not restated here.

**Two families, one voice.** `Newsreader` sets both the masthead and the body copy — its optical-size axis lets one face be a 68px title and a 17px paragraph, which is what makes the page read as a single publication. `JetBrains Mono` is the annotation apparatus and never sets prose: section marks, margin labels, dates, and chrome. UI chrome takes the system UI stack; `Inter` was removed after it was found to be loading three weights while rendering zero elements.

**The sheet is a page, not a column.** `--doc-max-width` is 880px, but the text block inside is 704px (≈70 characters at 17px) — the remaining 176px is the sheet's own margin. That difference is what makes it read as a page rather than a strip. The margin is named `--sheet-inset` (`clamp(24px, 6vw, 88px)`) because three things must agree on it: `.doc-page` padding, `.masthead-inner` padding, and the year rail, which hangs in exactly that band.

**One identity, stated once.** The masthead is the title page and the sheet is the body. Identity appears once: the masthead carries display name, role, tagline, credentials and contact; the sheet opens straight into prose with no second identity block; the footer carries the © line. The earlier layout printed the name four times across two forms, the credentials twice and the contact line twice.

### 3b. The Time Axis

Experience sets its years in a mono rail that hangs in `--sheet-inset`, right-aligned against the text edge and baseline-aligned with the first line of the entry it dates. The rail is negative-margined by exactly the inset, so it costs the measure nothing and the prose keeps the single left edge the masthead and summary already use — an in-measure rail gave the document two left edges (summary at one x, every dated entry at another).

`src/utils/dates.ts` formats it. `yearSpan()` compresses an authored range ("September 2014 - March 2017") to "2014–2017", leaves an ongoing role open-ended ("2023–", the dash running into the text column), and collapses a role inside one year rather than printing "2019–2019". `startYear()` returns the start alone, shown below 1320px where the inset can no longer hold nine characters — sequence survives where duration will not fit. Below 600px the rail collapses and the year sets flush above its entry.

Month precision is never lost: `index.astro` renders the full authored string into a visually hidden span, so assistive technology still gets the exact range.

### 4. Semantic References (Annotated Terms)

An annotated term uses a hairline rule rather than a highlighter fill. The underline is sufficient for ordinary marginalia; a superscript Tabler Notes icon appears only when the note also leads to a deeper case study. The icon's hover/focus hint says “Case study,” and the hotspot's accessible label distinguishes “Case study available” from “Marginalia.” This preserves meaning without numbering every annotation or adding an icon that merely repeats what the underline already says.

- **`box-decoration-break: clone`** keeps the rule and wash correct when a term wraps across a line.
- **State variables** (`--hs-rule`, `--hs-rule-hover`, `--hs-wash-hover`, `--hs-wash-active`) are defined once in `global.css` and re-tuned for the night edition. They must stay genuinely distinct per state: the previous light theme set default and hover to the same 0.08 opacity, so hovering an annotated term produced no tint change at all.
- **Project awareness** comes from the server-side, feature-flagged popover map passed into `createHotspotRenderer()`. A case-study icon therefore appears only when the corresponding route is actually offered in that environment.
- The superscript icon is `aria-hidden`; the complete state is included in the hotspot's `aria-label`, while `role="button"` and `aria-expanded` carry the interaction.

### 4b. The Glance / Dig Ladder

The margin note and the popover are two rungs of one ladder. `buildContentNode()` takes `mediaMode` and `includeLink` to express their shared media behavior and different text depth:

|                 | Margin note (`sa`)                       | Popover (`popover`)         |
| --------------- | ---------------------------------------- | --------------------------- |
| Text            | 1 sentence (`ANNOTATION_TEXT_SENTENCES`) | full                        |
| Media           | every figure, full carousel              | every figure, full carousel |
| Case-study link | when authored                            | when authored               |

On wide screens the marginalia is the media experience, not a preview of it. Images and videos therefore remain scrollable in the default note; expansion adds the complete narrative without replacing or removing the carousel.

**The case-study control.** Project-backed notes expose one named destination in the collapsed and expanded margin note as well as the popover. Its placement follows the surface:

1. **Wide marginalia:** the destination is inserted directly after the media; when no media exists, it follows the label/stat and precedes the narrative. It stays in normal flow in the collapsed note, then becomes sticky at the top only when the expanded note is its own scrolling surface.
2. **Popover and mobile sheet:** the same destination order is used and the control is sticky at the top of `.popover-scroll`, so the reader encounters it early and it remains available while longer copy scrolls. Across all three responsive surfaces, the control uses a document-white field with a black boundary and action square, then inverts as one unit on hover/focus.

The collapsed note used to end in a bare `→` glyph cued on "the popover holds more", which fired for one extra sentence or one extra image as readily as for a case study. The arrow now belongs to a real link and lives in CSS rather than inside `linkText` in `popovers.json`.

At the wide tier the popover never opens: `popover-engine` defers to `toggleAnnotation(key)` first, so a marked term expands its note in the margin instead of throwing a panel over the document.

### 5. Case Study Template System

**Returning without losing context.** Project links are dynamically generated
on the résumé, so `return-to-resume.ts` listens for same-tab clicks on both
`.popover-link` and `.sa-link`. It passes a short-lived marker through
`sessionStorage`; the matching case-study history entry claims that marker.
The case-study Back control then calls `history.back()` instead of creating a
new `/` navigation, allowing the browser to restore the exact résumé scroll
position and any back-forward cached UI state. Before leaving, the résumé also
stores transient overlay state (note key, inner scroll, carousel slide, and
dragged position) on its own history entry; `restoreResumeReturnView()` rebuilds
that view if the browser did not retain the page in its back-forward cache.
Direct case-study visits retain the ordinary `href="/"` fallback. This
handshake is necessary because the site's `Referrer-Policy: no-referrer` header
deliberately makes `document.referrer` unavailable.

The case study system has three distinct layers. Each layer has a single responsibility, and a new agent should understand all three before making changes.

```
src/content/case-studies/
  manifest.json          ← ordered index of all published studies
  truist.json            ← self-contained data for one study
  upwave.json
  sparks-grove.json
  two-way-tv.json
  felix.json
  fusionfall.json
  magic-wall.json
  armchair-manager.json

src/pages/
  truist.astro           ← thin wrapper: imports JSON, renders <CaseStudyPage cs={cs} />
  upwave.astro
  sparks-grove.astro
  two-way-tv.astro
  felix.astro
  fusionfall.astro
  magic-wall.astro
  armchair-manager.astro

src/components/case-studies/
  CaseStudyPage.astro    ← validates a study (zod) and composes Layout + Hero + Context + Sections
  CaseStudySection.astro ← dispatcher: switches on section.type
  CaseStudyHero.astro    ← full-bleed or device-mockup hero
  ContextGrid.astro      ← challenge/role/scope/team grid
  ShowcaseSection.astro  ← section wrapper (light or dark)
  ShowcaseGrid.astro     ← 1/2/3-column CSS grid
  ShowcaseCard.astro     ← image + title + description card
  FeatureRow.astro       ← 50/50 image-beside-text row
  CaptionedImage.astro   ← full-width image + one caption line
  PhotoGrid.astro        ← contextual header + uncropped image grid
  StatRow.astro          ← typographic outcome numbers band

src/layouts/
  CaseStudyLayout.astro  ← HTML shell, fonts, back nav, accent theming
```

**Data flows like this:**

1. `manifest.json` — used by `verify-content.ts` to enumerate all studies and check image paths at build time. Also available for future nav/listing components.
2. `truist.json` (etc.) — imported directly by the page file. Contains `meta`, `hero`, `context`, and an ordered `sections` array.
3. `truist.astro` — imports its JSON and renders `<CaseStudyPage cs={cs} />`. Nothing else.
4. `CaseStudyPage.astro` — validates the study against `caseStudyDataSchema` (zod) at the boundary, then composes `CaseStudyLayout` (`meta` + `accent`), `CaseStudyHero` (spread `{...cs.hero}`, which subsumes both the image and background hero variants), `ContextGrid` (`cs.context`), and maps `cs.sections` through `CaseStudySection`.
5. `CaseStudySection.astro` — reads `section.type` and renders the correct component tree. Also handles `bg` (background color/gradient wrapper) and `darkBg` (`--case-study-dark` override).

#### Section Type Catalog

Every section in a study JSON file must have a `type` field. `CaseStudySection.astro` switches on this value.

| `type`           | What renders                                                             | Required JSON fields                        | Optional JSON fields                                                                                            |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `cardGrid`       | ShowcaseSection + ShowcaseGrid + ShowcaseCard[]                          | `cards[]`                                   | `columns` (1-3, default 2), `isDark`, `bg`, `darkBg`                                                            |
| `mixedGrid`      | ShowcaseSection + 1-col grid (primaryCard) + 2-col grid (secondaryCards) | `primaryCard`, `secondaryCards[]`           | `isDark`, `bg`, `darkBg`                                                                                        |
| `featureRow`     | FeatureRow (image beside text, optionally reversed)                      | `title`, `description`, `image`, `imageAlt` | `reverse`, `label`, `caption`, `link`, `linkText`, `bg`                                                         |
| `textOnly`       | ShowcaseSection with no child grid                                       | `title`, `description`                      | `label`, `isDark`, `bg`, `darkBg`                                                                               |
| `largeImage`     | ShowcaseSection + constrained full-width Image                           | `image`, `imageAlt`                         | `label`, `title`, `description`, `imageWidth`, `imageHeight`, `bg`                                              |
| `fullBleed`      | Full-viewport `<section>` + Image (no text)                              | `image`, `imageAlt`                         | `bg`                                                                                                            |
| `captionedImage` | Content-width image + single caption line                                | `image`, `imageAlt`                         | `caption` (one short sentence), `label`, `displayWidth` (maximum rendered width for supporting artifacts), `bg` |
| `photoGrid`      | Context header followed by a grid of uncropped images                    | `images[]` (each: `src`, `alt`)             | `columns` (1-3, default 2), `gap` (tight/normal/loose), `label`, `title`, `description`, `bg`, `isDark`         |
| `statRow`        | Horizontal band of large typographic outcome numbers                     | `stats[]` (each: `value`, `label`)          | `label`, `bg`, `isDark`                                                                                         |
| `video`          | ShowcaseSection + native video player + optional context caption         | `video`                                     | `poster`, `caption`, `label`, `title`, `description`, `bg`, `isDark`                                            |

**Shared optional fields on every section:** `key` (identifier, not rendered), `label` (eyebrow text), `bg` (any CSS color or gradient), `isDark` (dark variant), `darkBg` (overrides accent-derived dark background).

#### Brand Colour Theming

`CaseStudyLayout` accepts an `accent` prop (6-digit hex). It passes this to `src/utils/color.ts → buildAccentStyle()`, which validates the hex and emits four custom properties as an inline `style` on `<body>`:

```
--accent: #3b1a5a; --accent-rgb: 59, 26, 90; --accent-contrast: #FFFFFF; --accent-ink: #3b1a5a;
```

`--accent-ink` is the brand darkened only as far as readability requires — `accentInk()` mixes toward black until it clears 4.9:1 on white. A brand hex is chosen for logos and fields, not for 11px type; the target is 4.9 rather than AA's 4.5 because the surface the ink lands on is a 5% tint of the brand, not pure white. The current published accents are defined canonically in `manifest.json`; do not duplicate that changing inventory here.

**Anything derived from `--accent` must be declared on `<body>` or below, never on `:root`.** The brand hex arrives as an inline style on `<body>`; a mapping such as `--label-color: var(--accent)` sitting on `:root` resolves against the root's own `--accent` — the ink — and never sees the brand value one level down.

Inline styles take precedence over any stylesheet rule, so brand colours cannot bleed between pages regardless of CSS bundle order. If `accent` is omitted or malformed, `resolveHexColor()` falls back to `DEFAULT_ACCENT` (`#000000` — the ink, since a page naming no client has nothing to identify) and warns.

Dark sections (`isDark: true`) compute their background using `color-mix(in srgb, var(--accent) 80%, #000)`. When this produces an unsuitable result (e.g. Upwave's orange accent yields a dark orange, not the intended charcoal), set `darkBg` on the section to override it — this sets `--case-study-dark` on the wrapper div, which `ShowcaseSection` reads as a fallback before the color-mix computation.

#### How to add a new case study

1. Create `src/content/case-studies/<slug>.json` following the schema in `.vscode/case-study.schema.json`.
2. Add one entry to `src/content/case-studies/manifest.json` (slug, title, description, accent, ogImage).
3. Create `src/pages/<slug>.astro` — copy any existing page. The body is just `import cs from "../content/case-studies/<slug>.json"` and `<CaseStudyPage cs={cs} />`.
4. Add the new page's filename to the `fileMatch` list in `.vscode/settings.json` so the editor JSON schema activates.
5. Set `CASE_STUDY_LINKS=true` (or add the slug) in your `.env.local` to enable the popover link.
6. Run `npm run verify` — the script reads from `manifest.json` to discover and validate all image paths.

#### How to add a new section type

1. Add the new type string to `caseStudySectionTypeSchema` in `src/content/schema.ts`, and add any new fields to `caseStudySectionSchema`. This is the runtime + type source of truth; the TS types in `src/types/content.ts` are `z.infer`'d from it, so they update automatically.
2. Add a conditional branch in `src/components/case-studies/CaseStudySection.astro` (follow the existing pattern), plus any new props to its `Props` interface and destructuring block.
3. Add a row to the Section Type Catalog table above.
4. (Optional, editor autocomplete only) mirror the type's `enum`/required fields in `.vscode/case-study.schema.json`.

## Content Integrity & Performance

### 1. Content Integrity Suite (`scripts/verify-content.ts`)

A custom TypeScript-driven verification system that ensures 100% link safety:

- **Schema Validation:** Parses `resume.json`, `popovers.json`, `manifest.json`, and every case-study JSON against the shared **zod** schemas in `src/content/schema.ts` — the same schemas that back `content.config.ts` and the `z.infer`'d TS types in `src/types/content.ts`, so validation, runtime config, and compile-time types are one source of truth. A `try/catch` around `JSON.parse` turns malformed files into a clean error rather than a stack trace.
- **Hotspot Validation:** Cross-references `<hotspot>` tags in `resume.json` against `popovers.json` inventory, and enforces a strict 1:1 mapping by failing the build if any duplicate hotspots are used in the resume.
- **Media Validation:** Validates that every `img` path and every path within `media` arrays exists in the `public/` directory.
- **Case Study Validation:** Reads `src/content/case-studies/manifest.json` to enumerate all studies, then for each slug verifies that the individual `<slug>.json` file exists and that every image referenced in `meta`, `hero`, and all `sections` entries resolves to a real file in `public/`.
- **Build Guard:** Integrated into the `npm run build` process to prevent broken deployments.

### 2. Image Optimization Pipeline

Leverages Astro 7's Image Service for modern asset delivery:

- **Static Assets:** Automatic WebP conversion and resizing within case study components.
- **Dynamic Assets:** Build-time pre-optimization of all popover images in `index.astro`, ensuring even dynamically loaded content is hashed and optimized. Sized with `fit: "inside"` — 600×400 is a bounding box, not a mandate. As `cover` it hard-cropped every figure to 3:2 at build time, so a 1100×2070 portrait lost two thirds of itself before any stylesheet saw it.

#### Image geometry: two rules that must hold together

Case-study artwork lives in `public/`, which Astro does **not** process — `<Image>` there simply stamps whatever width and height it was handed onto the tag. The real files run from 0.47 to 2.36 in aspect ratio, so both of these are required:

1. **Declared dimensions must be true.** `src/utils/image-size.ts → publicImageSize()` reads the real pixel dimensions at build time via sharp (which ships with Astro's image service, so no new dependency) and memoises them. Components pass those instead of the per-component constants they used to hardcode — `800×600`, `800×500`, `800×1200`, `1920×800`, and a `1300×800` default buried in `CaseStudySection`'s props. Every one of those declared a ratio its picture did not have. A missing or unreadable file returns `null` and the caller falls back, matching the warn-and-degrade policy below.
2. **CSS must release the height.** An image rule that sets `width: 100%` without `height: auto` leaves the attribute height in force, so the picture is drawn at container-width × attribute-height and squashed. This is what distorted the case-study imagery even after the attributes were corrected.

`object-fit: cover` is reserved for surfaces that genuinely must fill — the hero background band and the full-bleed strip. Everywhere else, art fits inside a bounded box: `ShowcaseCard` caps height and lets width fall out of the ratio, so a portrait screenshot sits narrower on its card rather than being cropped to landscape or rendering 2443px tall. A full-width `mixedGrid` lead card holding portrait art turns sideways instead — image beside caption, the pair centred — because a tall artifact in a wide container can never fill it.

## Security

Authentication lives in `src/middleware.ts`; the session cookie name (`SESSION_COOKIE_NAME`) and security-header set (`SECURITY_HEADERS`) are defined once in `src/utils/auth.ts` and shared with the login page so they can't drift.

- **Fail-closed:** Returns `503` if `SITE_PASSWORD` is not configured (never accidentally open).
- **Constant-time comparison:** `safeEqual()` wraps Node's `crypto.timingSafeEqual`, short-circuiting on a length mismatch first (since `timingSafeEqual` throws on unequal-length buffers), to resist timing attacks on cookie validation.
- **Asset bypass:** the `ASSET_EXT` regex (its video extensions sourced from the shared `VIDEO_EXTENSIONS` constant) matches static file extensions, plus a `/_astro` prefix check — avoiding the overly broad `.includes('.')` approach.
- **Security headers:** every authenticated response applies the full `SECURITY_HEADERS` set — `X-Robots-Tag`, `Cache-Control`, `Pragma`, `Expires`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`.

## Error-Handling Convention

The codebase uses three deliberate strategies, chosen by failure context — not ad hoc:

- **Build-time content validators collect and fail loud.** `scripts/verify-content.ts` accumulates every problem into an `errors[]` array and `process.exit(1)` so a broken deploy is impossible. Schema parsing (`src/content/schema.ts`) throws on malformed data at the page boundary (`CaseStudyPage.astro`).
- **The request gate fails closed.** `src/middleware.ts` returns `503` if `SITE_PASSWORD` is absent and redirects on any auth failure — never an open default.
- **Render/build-time asset helpers warn and degrade.** `src/utils/images.ts`, `src/utils/color.ts` and `src/utils/image-size.ts` log a `console.warn` and fall back to the original/default value rather than throwing, so one bad asset never blanks a page. (A _legitimately absent_ value stays silent; only a malformed one warns.)

## Content Visibility

Nothing the reader must read is allowed to depend on an animation or a script completing.

- **The masthead animates from a visible default.** The name, tagline, credentials and contact previously sat at `opacity: 0` and became readable only because a keyframe with `forwards` ran. The entrance is now declared inside `@media (prefers-reduced-motion: no-preference)` with `backwards` fill, so anything that stops the animation leaves the title page legible rather than blank.
- **The sheet's hidden state is gated on JS having run.** `.reveal` carries the whole résumé. An unqualified `opacity: 0` meant a blocked or failed bundle served a blank page over fully server-rendered content. `main.ts` adds `js-reveal` to `<html>` synchronously and the hidden state is scoped to `.js-reveal .reveal`, so without the script the document is simply visible. The `prefers-reduced-motion: reduce` override matches that specificity, or the hidden state would outrank it.

## Case-Study Prop Vocabulary

The vocabulary difference between `CaseStudyHero` and the section components is intentional, not drift:

- **Hero** (`CaseStudyHero`): `subtitle` (lead paragraph), `background` (full-bleed hero image), `image` (device-mockup image).
- **Sections** (`ShowcaseSection`, `FeatureRow`, …): `description` (body copy), `bg` (CSS background color/gradient), `image` (content image).

`bg` is a section _color_; `background` is the hero _image_ — keep them distinct.

**`.hero` belongs to case studies; the résumé's title page is `.masthead`.** `CaseStudyLayout` imports `global.css`, so any unscoped selector there also lands on every case-study page. Both surfaces used to define `.hero`, and because `CaseStudyHero`'s scoped styles never set `max-width` or `margin`, the résumé's `.hero { max-width: 820px; margin: 0 auto }` won by default — clamping every full-bleed case-study hero to a centred 820px column with the page background showing as bars either side (692px of dead space at 1512px) while every section below it ran full width. Two different things had one name. Do not reintroduce a global `.hero` rule in `global.css`.

The same hazard applied to `theme-light`/`theme-dark`, which were simultaneously the document-level edition flag on `<html>` and the section wrapper classes emitted by `CaseStudySection`. The section variants are now `section-light`/`section-dark`.

## Testing Strategy

- **Vitest + JSDOM:** Core logic and utility functions are verified against a simulated browser environment.
- **Key Testable Units:**
  - `src/utils/color.ts`: Hex validation, RGB conversion, full `buildAccentStyle()` output, and `accentInk()` against representative published brand values.
  - `src/utils/validation.ts`: Logic for extracting and validating hotspots.
  - `src/utils/images.ts`: Pipeline for pre-optimizing dynamic image assets, including case-insensitive extension handling, forwarding of `IMAGE_OPTIMIZE_OPTIONS`, and that figures are sized with `fit: "inside"` — a bounding box, never a crop. Nothing else in the suite would catch a silent revert to `cover`.
  - `src/utils/image-size.ts`: `publicImageSize()` against real assets and real sharp — correct dimensions for portrait and landscape files, `null` (never a throw) for a missing or undecodable one, and the build-time memo.
  - `src/utils/dates.ts`: `yearSpan()` / `startYear()` across month-precision ranges, ongoing roles, single-year roles and yearless strings, plus a pass over the real `resume.json` asserting every entry yields a rail-shaped value and that the entries stay newest-first.
  - `src/utils/render.ts`: Hotspot-to-span transformation, project-aware case-study markers, accurate accessible labels for marginalia-only versus project-backed terms, and feature-flag-aware rendering.
  - `src/utils/feature-flags.ts`: Slug parsing, `isCaseStudyLinkEnabled`, and `applyFeatureFlags` immutability.
  - `src/content/schema.ts`: the zod content schemas, parsed against the real `resume.json`/`popovers.json`/`manifest.json`/case-study JSON plus negative (malformed) cases.
  - `src/middleware.ts`: the auth gate — `/login` and static-asset bypass, fail-closed `503`, redirect on missing/incorrect cookie, the length-mismatch guard around `timingSafeEqual`, and security-header injection.
  - `src/scripts/annotation-engine.ts`: side assignment, cold-start intro lifecycle, and the resize state machine (build on entering the wide tier, tear down on leaving; `resetAnnotationState` preserves the resize listener while `cleanupAnnotations` aborts it).
  - `src/scripts/popover-engine.ts`: above/below flip positioning and horizontal clamp, open/close lifecycle, focus trap, mobile swipe-to-dismiss, desktop drag clamping, and two regression cases pinning the two-sided viewport clamp (term below the fold, term above the fold).
  - `src/scripts/dom.ts`: DOM construction for popovers, carousels, and accessibility attributes; the glance/dig split (`mediaMode`, `includeLink`); placement of project controls after media or before no-media narrative; that the case-study link renders in collapsed marginalia; and per-figure media descriptions.
  - `src/scripts/constants.ts`: Structural invariants — breakpoint ordering, value ranges, `VIDEO_EXTENSIONS` contents, CSS class/selector format, and swipe-gesture thresholds (`SWIPE_DISMISS_THRESHOLD`, `SWIPE_DISMISS_VELOCITY`).
  - `src/scripts/return-to-resume.ts`: same-tab project tracking, true Back behavior, stale-context rejection, and reconstruction of the saved popover, inner scroll, carousel frame, and dragged position.
  - `src/scripts/password-visibility.ts`: concealed/visible state, canonical icon semantics, synchronized accessible labels, and focus retention.
  - `src/components/Icon.astro`: the curated Tabler registry and direct SVG import contract that avoids transforming the library's full component barrel.
