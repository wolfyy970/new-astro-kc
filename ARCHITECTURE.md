# Architecture & Technical Design

## System Overview

The portfolio is built on **Astro 7**, using server output through the Vercel adapter with minimal client JavaScript.

### Development Server Lifecycle

Astro 7 auto-backgrounds `astro dev` when it detects Codex. A detached process
outlives the invoking terminal and is reused through `.astro/dev.json`, which
made local verification vulnerable to an hours-old server. `npm run dev` routes
through `scripts/dev-server.ts`, which removes only Astro's Codex detector marker
from the child environment, keeps the server foreground-owned, forwards terminal
signals, and removes only its own dead lock. Recovery commands belong in
`USER_GUIDE.md`; this section records why the launcher exists.

## Component & Layout Strategy

### Layouts

- **BaseLayout.astro:** Used for the main interactive resume. Renders the shared `<BaseHead />` and sets up the popover overlay infrastructure.
- **CaseStudyLayout.astro:** Used for individual case study pages. Adds context-preserving back navigation and per-page accent theming, and renders the same `<BaseHead />`.
- **BaseHead.astro:** Shared `<head>` partial (charset/viewport/title, `robots: noindex`, Open Graph + Twitter tags, favicon, fonts via `<HeadFonts />`, and the theme `<ThemeScript />`) used by both layouts so the document head can't drift between them.
- **Theme wash:** `ThemeScript` wraps the edition flip in a View Transition when the API exists: it records the toggle's live centre into `--wash-x/-y`, and the THEME WASH block in `controls.css` reveals the new edition's snapshot through a growing SVG blob mask pinned to that point (keyframes move `mask-position` by exactly half of `mask-size` on the same easing, so the centre never drifts). The blob's paths carry embedded SMIL animations, so the edge undulates while it blooms; browsers that freeze SVG animation in masks get the same bloom with a static edge, reduced motion gets the API's default crossfade, and no API means the original instant switch.

### Content Flow

1. **JSON Files:** `resume.json` and `popovers.json` act as the "database."
2. **Feature Flags (`src/utils/feature-flags.ts`):** `applyFeatureFlags` strips `link`/`linkText` from any popover whose case study page is not enabled in `CASE_STUDY_LINKS`. This runs server-side in `index.astro` before data is serialised to `window.__POPOVERS__`, so the client never receives links to unpublished pages.
3. **Page Templates:** `src/pages/index.astro` reads the JSON data, optimizes popover images, then applies feature flags before serializing the final map to the client.
4. **Hotspot Processing:** one `createHotspotRenderer(popovers)` instance converts `<hotspot>` tags into interactive spans. Every term gets an underline; only an enabled project-backed term gets the superscript Tabler Notes icon and “Case study” hint.

## Interactive Systems

The interactive layer is decomposed into modular engines for maintainability and focus:

### 1. Note Engine (`popover-engine.ts`) + Bound-In Note (`inset-note.ts`)

**The document makes room — nothing floats on a desktop.** The old floating, draggable, viewport-clamped popover is gone, and with it every positioning constant, the drag subsystem, and both clamp passes. One click handler on every marked term routes to the tier-appropriate surface:

| Tier            | Surface                                   | Module                 |
| --------------- | ----------------------------------------- | ---------------------- |
| ≥1420px (wide)  | The margin note **continues** in place    | `annotation-engine.ts` |
| 601–1419px      | The note **binds into the document flow** | `inset-note.ts`        |
| ≤600px (mobile) | The note rises as a **bottom sheet**      | `popover-engine.ts`    |

`popover-engine.ts` remains the router and owns the one surface that still floats — the sheet:

- **Sheet lifecycle:** open with focus on the × close control, full focus trap (the sheet IS modal; the other two surfaces deliberately are not), Escape/overlay-tap/swipe to close, focus returned to the term.
- **Mobile Swipe-to-Dismiss:** `makeMobileSwipeable()` attaches touch event listeners once at init. It only engages when `isMobileScreen()` is true, the drag direction is downward, and `scrollTop === 0` (so in-sheet content scrolling is never hijacked). During the gesture, `CLS_IS_DRAGGING` disables CSS transitions and a `--sheet-drag-offset` CSS custom property drives the live transform. On release, a velocity check (`SWIPE_DISMISS_VELOCITY = 0.4 px/ms`) or distance check (`SWIPE_DISMISS_THRESHOLD = 80px`) decides dismiss vs. snap-back. `closePopover()` always resets the property so the next open starts clean.
- **Annotation Sync:** "Dissolves" (suppresses) the corresponding margin annotation when the sheet is open across a resize edge, so the same words are never on screen twice.
- **Shared close contract:** Escape and a click anywhere outside an open note close all three surfaces. Clicks INSIDE an open note never close it — it is a reading surface, and selecting a phrase or missing a chevron must not collapse the thing being read.

**The bound-in note** (`inset-note.ts`) is the middle tier's surface. Clicking a term opens the full note in the document's own flow, directly after the term's block — appended inside its `<li>` (an `aside` is valid flow content there, and the indent reads as "a note on this line") or after its paragraph. Hairline above and below, the mono label row carrying a quiet fold control, the media plate at the full measure, and the narrative in two columns at the note size. The prose below makes room via a `grid-template-rows: 0fr → 1fr` unfold. It honours the same two courtesies as the margin note: the scroll assist aims at the note's FINAL unfolded extent (`.inset-inner.scrollHeight` while the row is still collapsed) and drifts the page until that end has `ASSIST_BOTTOM_GAP` of air above the fold — never carrying the note's top past `ASSIST_NOTE_TOP` or the clicked term off-screen — and the reader's first deliberate scroll folds the note behind them (input events, jitter-forgiving threshold, tall notes exempt until scrolled past). One flow-specific wrinkle: this note occupies document flow, so folding it while it sits above the viewport would pull the page up under the departing reader — an off-screen close is therefore instant, with the scroll position compensated in the same frame so nothing visible moves. Semantically it is a disclosure, not a dialog: `aria-expanded` on the term, `aria-controls` repointed at the note while open, no focus trap. There is no inner scrollbox anywhere on a desktop — the page is the document's only scroll surface.

### 2. Annotation Engine (`annotation-engine.ts`)

Manages the "magazine-style" margin content:

- **Automatic DOM Mapping:** Dynamically parses `.hotspot` anchors in the DOM and automatically alternates left/right side assignments for marginalia (decoupling content creation from configuration).
- **Intersection Observation:** Rebuilds and positions margin annotations as hotspots scroll into view.
- **Overlap Resolution:** Algorithmic adjustment to prevent vertical collisions between adjacent annotations.
- **The note continues — expansion is a state, not a render.** Every note is rendered ONCE at build time carrying both lengths: the glance (label, media, one sentence) plus the remaining narrative and quote inside a collapsed `.sa-more` wrapper (`splitGlance` in `note-content.ts`). Clicking the term toggles `is-expanded` and the continuation unfolds in place via `grid-template-rows` — no re-render, no surface change (no stock, border, shadow, height cap, or inner scrollbar), and no repositioning of the note itself. A long note runs down the margin like a printed sidenote and the reader scrolls the page to follow it.
- **The margin re-typesets continuously.** While a continuation unfolds or folds, `animateReflow()` re-runs overlap resolution every animation frame for `UNFOLD_REFLOW_MS`, so the notes below ride the changing height instead of jumping to a precomputed position. Under `prefers-reduced-motion` this collapses to a single synchronous pass (the CSS transitions are off too).
- **Focus, not modality.** While one note is open, `.margin-focus` on the sheet recedes every other revealed note to 35% — the eye is answered, not shouted at — and they return under the pointer. The document itself never dims. The open note is marked by the same pen that marked its term: its stretched rule takes the family's highlighter ink (`sa-project` decides green vs yellow) and its label steps to full ink.
- **The assist aims at the final extent.** The continuation unfolds downward, so a note whose top is on screen can still do all of its unfolding below the fold. `assistIntoView` measures where the note will END (`.sa-more-inner.scrollHeight` while collapsed) and drifts the page until that end has `ASSIST_BOTTOM_GAP` of air above the fold — bounded so the note top never passes `ASSIST_NOTE_TOP` and the clicked term never leaves the viewport.
- **Scroll is the way out.** The first deliberate wheel or touch motion (`SCROLL_EXIT_THRESHOLD` of accumulated input, forgiving jitter) folds the open note behind the departing reader. Input events, never the scroll event, so the assist's own smooth scroll cannot close the note it just opened. A note taller than the viewport is exempt until the reader scrolls past its extent — scrolling is how such a note is read — and a touch drag starting inside the note (its carousel) never counts as leaving. Clicks inside an open note never collapse it; the term, Escape, scrolling away, and clicks elsewhere do.
- **Cold-Start Intro Annotation:** When the engine initializes at wide screen and no hotspots are immediately in the viewport, `margin-intro.ts` mounts an introductory annotation at the top of the margin — a working scale model of the system it introduces. Its own key phrase wears a genuine yellow specimen stroke, and clicking it continues the note in place via the same `.sa-more` unfold, revealing the two-pen rule with a green specimen carrying the real superscript marker from `render.ts`. Specimens are spans, never controls — the intro stays `aria-hidden`, so nothing inside it may take focus; keyboard and screen-reader users are taught by the genuinely accessible marked terms instead. The annotation engine owns when this vignette mounts and dissolves, while the vignette module owns its DOM and conversation.
- **The payoff conversation (`intro-payoff.ts`):** runs in the wide tier's margin intro only. The demo gateway's first click unfolds the authored payoff untyped; every later click is answered by the apparatus — typed at constant letters-per-second, always sub-second. A trailing debounce makes a click burst one utterance (the reply lands when the clicking stops), and a small state machine classifies each burst — rapid drumming, steady, or a contemplative single click after a long pause — into pools with their own wry voice. The conversation is hard-capped at `PAYOFF_MAX_REPLIES` (5) before the farewell, a bind guard on the gateway prevents a second attachment from ever double-answering (the source of any apparent looping), and at the finale the introduction leaves with a choreographed exit: content settles down to its rule, the rule retracts to its middle, and a small ink square blips out; then the element is removed. Reduced motion gets instant text and a plain fade.
- **Resize tier handling:** A debounced `resize` handler builds annotations on entering the wide tier (≥1420px) and tears them down on leaving it.
- **The threshold is derived, not chosen:** `BREAKPOINT_WIDE` = 880 (sheet) + 2 × (42 gutter + 220 column) = 1404, rounded to 1420. The original 1460 sat just above the 1440px logical width of a 13" MacBook Air, so the feature the entire reading experience is built around was unreachable on a very common laptop no matter how the window was sized. If any of `DOC_MAX_WIDTH`, `MARGIN_COL_WIDTH` or `MARGIN_COL_GUTTER` changes, the threshold must be recomputed.
- **Introduction below the wide tier:** `EditionNote.astro` — a static editor's note bound into the top of the sheet with the mono INTERACTIVE label and two note-size sentences wearing yellow/green specimens. It replaces the retired widen bar and best-on-desktop badge without duplicating the margin intro's staged ladder. The note hides at ≥1420px, where the margin performs the introduction instead.
- **The masthead portrait (`SmilePortrait.astro` + `smile-portrait.ts`):** the title page's engraving. `src/assets/smile-portrait.svg` is inlined via `?raw` so the line work takes `currentColor` (both editions ink it themselves) and the smile can be staged by class. The first pointerenter or tap adds `is-smiling` (bind-guarded, once per visit); three expression plates crossfade over 1.2s and settle forwards — the smile stays, and leaving never rewinds it. All presentation, including the two-column head grid that curtails the masthead rule, lives in global.css ("The author's portrait"). Reduced motion shows the settled smile statically.
- **Lifecycle Safety:** `resetAnnotationState()` handles DOM/state cleanup without aborting the `resizeAbortController`, preserving the resize listener across intermediate resets. `cleanupAnnotations()` performs a full teardown including the controller.

### 3. Deterministic Type Scale

Every `font-size` is driven by semantic custom properties defined once in **`src/styles/tokens.css`**. They live there rather than in `global.css` because three surfaces consume the scale — the résumé, the case studies and the login gate — and only the first two import `global.css`. While the scale lived in `global.css` the gate resolved every `--type-*` to nothing, so its input silently inherited 16px and its title collapsed to body size.

| Variable               | Role                      | Desktop        | ≤600px         | ≤380px         |
| ---------------------- | ------------------------- | -------------- | -------------- | -------------- |
| `--type-editorial`     | Masthead name             | clamp(40–68px) | clamp(34–44px) | clamp(30–38px) |
| `--type-editorial-sub` | Masthead tagline          | clamp(20–23px) | 21px           | —              |
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

**Palette.** The résumé is achromatic apart from the reader's two highlighter inks, and each case study is its client's environment. That doctrine, its tokens and its contrast maths are documented once in [DESIGN.md](./DESIGN.md) and are not restated here.

**Two families, one voice.** `Newsreader` sets both the masthead and the body copy — its optical-size axis lets one face be a 68px title and a 17px paragraph, which is what makes the page read as a single publication. `JetBrains Mono` is the annotation apparatus and never sets prose: section marks, margin labels, dates, and chrome. UI chrome takes the system UI stack; `Inter` was removed after it was found to be loading three weights while rendering zero elements.

**The sheet is a page, not a column.** `--doc-max-width` is 880px, but the text block inside is 704px (≈70 characters at 17px) — the remaining 176px is the sheet's own margin. That difference is what makes it read as a page rather than a strip. The margin is named `--sheet-inset` (`clamp(24px, 6vw, 88px)`) because three things must agree on it: `.doc-page` padding, `.masthead-inner` padding, and the year rail, which hangs in exactly that band.

**One identity, stated once.** The masthead is the title page and the sheet is the body. Identity appears once: the masthead carries display name, role, tagline, credentials and contact; the sheet opens straight into prose with no second identity block; the footer carries the © line. The earlier layout printed the name four times across two forms, the credentials twice and the contact line twice.

### 3b. The Time Axis

Experience sets its years in a mono rail that hangs in `--sheet-inset`, right-aligned against the text edge and baseline-aligned with the first line of the entry it dates. The rail is negative-margined by exactly the inset, so it costs the measure nothing and the prose keeps the single left edge the masthead and summary already use — an in-measure rail gave the document two left edges (summary at one x, every dated entry at another).

`src/utils/dates.ts` formats it via `dateRangeLines()`: abbreviated months on two stacked lines (start above, end below; ongoing roles end with an en dash). The rail column uses `--exp-rail: max(4.5rem, var(--sheet-inset))` so short lines never collide with company names. Below 600px the rail collapses and the dates set flush above each entry.

Month precision is never lost: `index.astro` renders the full authored string into a visually hidden span, so assistive technology still gets the exact range.

### 4. Semantic References (Annotated Terms)

An annotated term wears a translucent highlighter stroke — the reader's pen, not the typographer's fill. Yellow ink says marginalia exists; green ink says the note also leads to a deeper case study. A superscript Tabler Notes icon appears only on green terms; its hover/focus hint says “Case study,” and the hotspot's accessible label distinguishes “Case study available” from “Marginalia,” so colour is never the only channel.

- **Structure:** `render.ts` emits `<span class="hotspot hs-mark-N [hs-project]">` for interaction (aria, focus ring, hit area) with an inner `<span class="hs-stroke">` that holds only the letters and wears the paint — the ink covers the words, never the icon.
- **The stroke is two staggered bands**, each a hard-stop gradient: flat matte ink, end cuts a few degrees off vertical (the chisel tip), the band overlap providing the only density variation. No rounded caps, no shading, no radius — a 0.04em fade inside each gradient does the anti-aliasing.
- **Ink under the letterpress.** The stroke overshoots into word gaps and may nick a neighbouring glyph, so `.hs-stroke` carries `z-index: -1` and escapes into `.doc-page`'s isolated stacking context — painting above the stock but under every glyph, before and after. A marker never sits on top of the print; without this, the night edition's opaque ink blocked the tail of the preceding word. `.doc-page` must keep `isolation: isolate`.
- **Uniqueness is deterministic.** `markVariant()` (djb2 hash of the popover key, mod 6) picks one of six hand-tuned band geometries in `global.css`. Every mark is unique against its neighbours, but the document never redraws itself between visits.
- **Ink state is one knob.** Pigments are RGB triplets (`--mark-note-rgb`, `--mark-project-rgb`); the state ladder moves a single knob (`--hs-a`: 0.6 → 0.72 hover → 0.84 open/margin-revealed), and per-theme formulas on `.hotspot` derive the two band colours from it. Light stock composes translucent `rgba()` so the band overlap deepens like double-passed ink; the night edition (loads 0.26/0.36/0.48) pre-composites via `color-mix` into opaque ink, because the same additive overlap that reads as density on white glows as a stripe against near-black. The composed colours live in `@property`-registered custom properties so the gradient inks can transition.
- **`box-decoration-break: clone`** gives each wrapped line fragment its own complete stroke — entry cut, bands, exit cut — which is what a human hand does on the second line.
- **Project awareness** comes from the server-side, feature-flagged popover map passed into `createHotspotRenderer()`. The green pen and its icon therefore appear only when the corresponding route is actually offered in that environment.
- The superscript icon is `aria-hidden`; the complete state is included in the hotspot's `aria-label`, while `role="button"` and `aria-expanded` carry the interaction.

### 4b. The Glance / Dig Ladder

The margin note and the popover are two rungs of one ladder. `buildContentNode()` takes `mediaMode` and `includeLink` to express their shared media behavior and different text depth:

|                 | Margin note (`sa`)                       | Popover (`popover`)         |
| --------------- | ---------------------------------------- | --------------------------- |
| Text            | 1 sentence (`ANNOTATION_TEXT_SENTENCES`) | full                        |
| Media           | every figure, full carousel              | every figure, full carousel |
| Case-study link | when authored                            | when authored               |

On wide screens the marginalia is the media experience, not a preview of it. Images and videos therefore remain scrollable in the default note; expansion adds the complete narrative without replacing or removing the carousel.

**The case-study control.** Project-backed notes expose one named destination on every surface, always in the same position: directly after the media, or after the label/stat and before the narrative when no media exists. Nothing is sticky any more — the margin note and the bound-in note live in normal document flow with no inner scroll region, and the sheet's content is short enough that the early placement does the job alone. Across all three surfaces the control uses a document-white field with a black boundary and action square, then inverts as one unit on hover/focus.

The collapsed note used to end in a bare `→` glyph cued on "the popover holds more", which fired for one extra sentence or one extra image as readily as for a case study. The arrow now belongs to a real link and lives in CSS rather than inside `linkText` in `popovers.json`.

At the wide tier `popover-engine` defers to `toggleAnnotation(key)` first, so a marked term continues its note in the margin; on the middle tier the click binds the note into the flow instead. No tier throws a panel over the document.

### 5. Case Study Template System

**Returning without losing context.** Project links are dynamically generated
on the résumé, so `return-to-resume.ts` listens for same-tab clicks on both
`.popover-link` and `.sa-link`. It passes a short-lived marker through
`sessionStorage`; the matching case-study history entry claims that marker.
The case-study Back control then calls `history.back()` instead of creating a
new `/` navigation, allowing the browser to restore the exact résumé scroll
position and any back-forward cached UI state. Before leaving, the résumé also
stores which note surface was open (margin, bound-in, or sheet), its key, its
carousel slide and — for the sheet — its inner scroll on its own history
entry; `restoreResumeReturnView()` reopens the note by clicking the stored
term and letting the CURRENT tier route it, if the browser did not retain the
page in its back-forward cache.
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
  LargeImageSection.astro ← constrained full-width image section
  FullBleedSection.astro ← full-viewport image section
  CaptionedImage.astro   ← full-width image + one caption line
  PhotoGrid.astro        ← contextual header + uncropped image grid
  StatRow.astro          ← typographic outcome numbers band
  VideoSection.astro     ← native video with contextual heading/caption

src/layouts/
  CaseStudyLayout.astro  ← HTML shell, fonts, back nav, accent theming
```

**Data flows like this:**

1. `manifest.json` — used by `verify-content.ts` to enumerate all studies and check image paths at build time. Also available for future nav/listing components.
2. `truist.json` (etc.) — imported directly by the page file. Contains `meta`, `hero`, `context`, and an ordered `sections` array.
3. `truist.astro` — imports its JSON and renders `<CaseStudyPage cs={cs} />`. Nothing else.
4. `CaseStudyPage.astro` — validates the study against `caseStudyDataSchema` (zod) at the boundary, then composes `CaseStudyLayout` (`meta` + `accent`), `CaseStudyHero` (spread `{...cs.hero}`, which subsumes both the image and background hero variants), `ContextGrid` (`cs.context`), and maps `cs.sections` through `CaseStudySection`.
5. `CaseStudySection.astro` — reads `section.type`, applies the shared `bg`/`darkBg` wrapper, and delegates specialized variants to their focused renderer components.

#### Section Type Catalog

Every section in a study JSON file must have a `type` field. `CaseStudySection.astro` switches on this value.

| `type`           | What renders                                                             | Required JSON fields                        | Optional JSON fields                                                                                                        |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `cardGrid`       | ShowcaseSection + ShowcaseGrid + ShowcaseCard[]                          | `cards[]`                                   | `columns` (1-3, default 2), `isDark`, `bg`, `darkBg`                                                                        |
| `mixedGrid`      | ShowcaseSection + 1-col grid (primaryCard) + 2-col grid (secondaryCards) | `primaryCard`, `secondaryCards[]`           | `isDark`, `bg`, `darkBg`                                                                                                    |
| `featureRow`     | FeatureRow (image beside text, optionally reversed)                      | `title`, `description`, `image`, `imageAlt` | `reverse`, `label`, `caption`, `link`, `linkText`, `bg`                                                                     |
| `textOnly`       | ShowcaseSection with no child grid                                       | `title`, `description`                      | `label`, `isDark`, `bg`, `darkBg`                                                                                           |
| `largeImage`     | ShowcaseSection + constrained full-width Image                           | `image`, `imageAlt`                         | `label`, `title`, `description`, `imageWidth`, `imageHeight`, `bg`                                                          |
| `fullBleed`      | Full-viewport `<section>` + Image (no text)                              | `image`, `imageAlt`                         | `bg`                                                                                                                        |
| `captionedImage` | Content-width image + single caption line                                | `image`, `imageAlt`                         | `caption` (one short sentence), `label`, `isMobile`, `displayWidth` (maximum rendered width for supporting artifacts), `bg` |
| `photoGrid`      | Context header followed by a grid of uncropped images                    | `images[]` (each: `src`, `alt`)             | `columns` (1-3, default 2), `gap` (tight/normal/loose), `label`, `title`, `description`, `bg`, `isDark`                     |
| `statRow`        | Horizontal band of large typographic outcome numbers                     | `stats[]` (each: `value`, `label`)          | `label`, `bg`, `isDark`                                                                                                     |
| `video`          | ShowcaseSection + native video player + optional context caption         | `video`, `title`                            | `poster`, `caption`, `label`, `description`, `bg`, `isDark`                                                                 |
| `externalVideo`  | ShowcaseSection + approved external video embed + source link            | `embedUrl`, `sourceUrl`, `title`            | `caption`, `label`, `description`, `bg`, `isDark`                                                                           |

**Shared fields on every section:** `key` is a required unique identifier. `label` (eyebrow text), `bg` (any CSS color or gradient), `isDark` (dark variant), and `darkBg` (overrides the dark background) are optional. Section objects are strict discriminated unions: unsupported or misspelled fields fail validation instead of being discarded.

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
2. Add a focused renderer component when the variant has its own logic, then map the discriminated variant to it in `src/components/case-studies/CaseStudySection.astro`.
3. Add a row to the Section Type Catalog table above.
4. (Optional, editor autocomplete only) mirror the type's `enum`/required fields in `.vscode/case-study.schema.json`.

## Content Integrity & Performance

### 1. Content Integrity Suite (`scripts/verify-content.ts`)

A custom TypeScript-driven verification system that ensures 100% link safety:

- **Schema Validation:** Parses `resume.json`, `popovers.json`, `manifest.json`, and every case-study JSON against the shared **zod** schemas in `src/content/schema.ts` — the same schemas that back `content.config.ts` and the `z.infer`'d TS types in `src/types/content.ts`, so validation, runtime config, and compile-time types are one source of truth. A `try/catch` around `JSON.parse` turns malformed files into a clean error rather than a stack trace.
- **Hotspot Validation:** Cross-references `<hotspot>` tags in `resume.json` against `popovers.json` inventory, and enforces a strict 1:1 mapping by failing the build if any duplicate hotspots are used in the resume.
- **Media Validation:** Validates that every popover `img`, `brandMark`, and `media` path exists in the `public/` directory.
- **Case Study Validation:** Reads `src/content/case-studies/manifest.json` to enumerate all studies, then for each slug verifies that the individual `<slug>.json` file exists and that every image referenced in `meta`, `hero`, and all `sections` entries resolves to a real file in `public/`.
- **Build Guard:** Integrated into the `npm run build` process to prevent broken deployments.

### 2. Image Delivery Pipeline

Image delivery is explicit rather than uniform:

- **Case-study assets:** Files live under `public/`. Every renderer emits real
  source dimensions; components using Astro's `<Image>` additionally request
  WebP output, while `CaptionedImage` and `PhotoGrid` deliberately serve the
  original public file.
- **Popover assets:** In server output, `index.astro` calls `getImage()` before
  serializing note data to the client. It requests WebP constrained with
  `fit: "inside"` — 600×400 is a bounding box, not a crop — and carries the
  returned width and height with the URL so notes reserve the correct geometry.

#### Image geometry: two rules that must hold together

Case-study artwork lives in `public/`, so no transformation happens merely
because a file is present there. The real files run from 0.47 to 2.36 in aspect
ratio, so both of these are required:

1. **Declared dimensions must be true.** `src/utils/image-size.ts → publicImageSize()` reads the real pixel dimensions at build time through the project's direct `sharp` dependency and memoises them. Components pass those instead of the per-component constants they used to hardcode — `800×600`, `800×500`, `800×1200`, `1920×800`, and a `1300×800` default buried in `CaseStudySection`'s props. Every one of those declared a ratio its picture did not have. A missing or unreadable file returns `null` and the caller falls back, matching the warn-and-degrade policy below.
2. **CSS must release the height.** An image rule that sets `width: 100%` without `height: auto` leaves the attribute height in force, so the picture is drawn at container-width × attribute-height and squashed. This is what distorted the case-study imagery even after the attributes were corrected.

`object-fit: cover` is reserved for surfaces that genuinely must fill — the hero background band and the full-bleed strip. Everywhere else, art fits inside a bounded box: `ShowcaseCard` caps height and lets width fall out of the ratio, so a portrait screenshot sits narrower on its card rather than being cropped to landscape or rendering 2443px tall. A full-width `mixedGrid` lead card holding portrait art turns sideways instead — image beside caption, the pair centred — because a tall artifact in a wide container can never fill it.

## Security

Authentication lives in `src/middleware.ts`; the session cookie name (`SESSION_COOKIE_NAME`) and security-header set (`SECURITY_HEADERS`) are defined once in `src/utils/auth.ts` and shared with the login page so they can't drift.

- **Fail-closed:** Returns `503` if `SITE_PASSWORD` is not configured (never accidentally open).
- **Constant-time comparison:** `safeEqual()` wraps Node's `crypto.timingSafeEqual`, short-circuiting on a length mismatch first (since `timingSafeEqual` throws on unequal-length buffers), to resist timing attacks on cookie validation.
- **Asset bypass:** the `ASSET_EXT` regex (its video extensions sourced from the shared `VIDEO_EXTENSIONS` constant) matches static file extensions, plus a `/_astro` prefix check — avoiding the overly broad `.includes('.')` approach.
- **Security headers:** every authenticated response applies the full `SECURITY_HEADERS` set — `X-Robots-Tag`, `Cache-Control`, `Pragma`, `Expires`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: no-referrer`.
- **Origin check deployment exception:** Astro's built-in form-origin check is disabled because Vercel's proxy host/origin combination rejected the same-origin login POST in production. This site has no authenticated state-changing endpoint beyond that login, and its cookie is `SameSite=Strict`; re-enable the framework check if the deployment topology changes.

## Error-Handling Convention

The codebase uses three deliberate strategies, chosen by failure context — not ad hoc:

- **Build-time content validators collect and fail loud.** `scripts/content-verifier.ts` accumulates every problem into an `errors[]` array; the thin `scripts/verify-content.ts` CLI reports them and sets a failing exit code so a broken deploy is impossible. Schema parsing (`src/content/schema.ts`) rejects malformed data at the page boundary.
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

**`.hero` belongs to case studies; the résumé's title page is `.masthead`.** The two page families share only `base.css` (tokens, controls, reset, and document defaults). `global.css` is résumé-only and `case-study.css` is case-study-only, so their layout selectors cannot leak across surfaces.

The same hazard applied to `theme-light`/`theme-dark`, which were simultaneously the document-level edition flag on `<html>` and the section wrapper classes emitted by `CaseStudySection`. The section variants are now `section-light`/`section-dark`.

## Testing Strategy

- **Vitest + JSDOM:** Core logic and utility functions are verified against a simulated browser environment.
- **Key Testable Units:**
  - `src/utils/color.ts`: Hex validation, RGB conversion, full `buildAccentStyle()` output, and `accentInk()` against representative published brand values.
  - `src/utils/validation.ts`: Logic for extracting and validating hotspots.
  - `src/utils/images.ts`: Pipeline for pre-optimizing dynamic image assets, including case-insensitive extension handling, forwarding of `IMAGE_OPTIMIZE_OPTIONS`, and that figures are sized with `fit: "inside"` — a bounding box, never a crop. Nothing else in the suite would catch a silent revert to `cover`.
  - `src/utils/image-size.ts`: `publicImageSize()` against real assets and real sharp — correct dimensions for portrait and landscape files, `null` (never a throw) for a missing or undecodable one, and the build-time memo.
  - `src/utils/dates.ts`: `dateRangeLines()` across month-precision ranges, ongoing roles, single-line matches, and yearless strings, plus a pass over the real `resume.json` asserting every entry yields two short rail lines and that the entries stay newest-first.
  - `src/scripts/icons.ts`: client-side Tabler SVG wrappers for note chrome (close, carousel, play).
  - `src/utils/render.ts`: Hotspot-to-span transformation, project-aware case-study markers, accurate accessible labels for marginalia-only versus project-backed terms, and feature-flag-aware rendering.
  - `src/utils/feature-flags.ts`: Slug parsing, `isCaseStudyLinkEnabled`, and `applyFeatureFlags` immutability.
  - `src/content/schema.ts`: the zod content schemas, parsed against the real `resume.json`/`popovers.json`/`manifest.json`/case-study JSON plus negative (malformed) cases.
  - `src/middleware.ts`: the auth gate — `/login` and static-asset bypass, fail-closed `503`, redirect on missing/incorrect cookie, the length-mismatch guard around `timingSafeEqual`, and security-header injection.
  - `src/scripts/annotation-engine.ts`: side assignment, intro mount/dismiss timing, margin carousels surviving expansion without a rebuild, and the resize state machine (build on entering the wide tier, tear down on leaving; `resetAnnotationState` preserves the resize listener while `cleanupAnnotations` aborts it).
  - `src/scripts/margin-intro.ts`: cold-start demonstration DOM and the full ladder (mark → note → gateway → payoff), composed with `intro-payoff.ts`.
  - `src/scripts/popover-engine.ts`: the three-tier routing (margin unfold, bound-in note, sheet — nothing floats on desktop) and, through it, `inset-note.ts`: binding into flow and inside bullets, single-click swap between terms, scroll-away fold with jitter forgiveness and a per-open exit accumulator, Escape/outside-click/fold-control closes, sheet lifecycle with focus trap and swipe-to-dismiss (the non-modal bound-in note is exempt from trapping), and the wide tier's margin expand with wheel exit.
  - `src/scripts/note-content.ts`: shared note construction, the glance/dig split (`mediaMode`, `includeLink`), project-control placement, and accessible prose/quote structure.
  - `src/scripts/note-media.ts`: image/video construction, intrinsic media dimensions, circular carousel navigation, and nearest-slide scroll tracking.
  - `src/scripts/dom.ts`: small DOM and media-readiness primitives shared by the interaction engines.
  - `src/scripts/constants.ts`: Structural invariants — breakpoint ordering, value ranges, `VIDEO_EXTENSIONS` contents, CSS class/selector format, and swipe-gesture thresholds (`SWIPE_DISMISS_THRESHOLD`, `SWIPE_DISMISS_VELOCITY`).
  - `src/scripts/return-to-resume.ts`: same-tab project tracking, true Back behavior, stale-context rejection, and reconstruction of the saved note on whichever surface the current tier routes to (margin, bound-in, or sheet), including inner scroll and carousel frame.
  - `src/scripts/intro-payoff.ts`: burst classification (rapid/steady/contemplative), the untyped first payoff, one reply per burst, typed completion, the reply cap and choreographed goodbye, and the one-brain-per-button bind guard.
  - `src/scripts/password-visibility.ts`: concealed/visible state, canonical icon semantics, synchronized accessible labels, and focus retention.
  - `src/scripts/smile-portrait.ts`: the masthead portrait's one-time greeting — smiles on first pointerenter or tap, the smile survives pointerleave, and a duplicate attachment (dev hot reload) is a guarded no-op.
  - `src/components/Icon.astro`: the curated Tabler registry and direct SVG import contract that avoids transforming the library's full component barrel.
  - `scripts/content-verifier.ts`: valid fixtures plus malformed schemas, bidirectional hotspot/note parity, manifest/JSON/page inventory drift, and public-path traversal.
  - `scripts/dev-server.ts`: Codex marker isolation and lock cleanup boundaries — owned/dead locks are removed, while live or foreign locks are preserved.
