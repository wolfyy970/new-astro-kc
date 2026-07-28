# User & Contributor Guide

## Local Setup

1. **Clone the repository.**
2. **Install Node.js:** Version 22.12 or higher is required by Astro 7.
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The site will be available at `http://localhost:4321`.

The project uses **Vitest** with a **jsdom** environment for unit testing core logic and DOM utilities.

- **Run tests once:** `npm run test`
- **Run in watch mode:** `npx vitest`
- **Apply formatting:** `npm run format`
- **Verify formatting:** `npm run format:check`
- **Lint source:** `npm run lint`
- **Run Astro diagnostics:** `npm run check`

## Deployment

The project is configured for **manual production deployment** to Vercel via the CLI. Git-based auto-deployment is disabled to maintain strict release control.

1. **Production Manual Push:**

   ```bash
   vercel deploy --prod
   ```

2. **Integration Checks:**
   Run `npm run format:check`, `npm run lint`, `npm run check`, `npm run test`, and `npm run build` before pushing to production.

## Password Protection

The entire portfolio is protected by an elegant password gate powered by Astro middleware and server-side logic.

- **Environment Variable:** Set `SITE_PASSWORD` in your Vercel Dashboard or local `.env.local` file. The local file is intentionally ignored by Git.
- **Access:** Users are redirected to `/login` if not authenticated.
- **Visibility:** The password field uses canonical Tabler `eye-off`/`eye` icons, with synchronized accessible labels, to reveal or conceal the entered value.
- **Errors:** A failed attempt keeps feedback adjacent to the field, announces it with `role="alert"`, and marks the input invalid.
- **Privacy:** Crawler indexing is disabled project-wide via `X-Robots-Tag` headers and a global `robots.txt` exclusion.
- **Session:** A secure, `HttpOnly` cookie maintains the session for 7 days.

### 3. Content Verification & Integrity

To ensure that the resume and its interactive layers remain synchronized, use the built-in verification suite:

```bash
npm run verify
```

This script validates the content JSON against the shared Zod schemas (`src/content/schema.ts`), confirms that every `<hotspot>` in `resume.json` has a corresponding entry in `popovers.json`, that no hotspot is used more than once (enforcing a strict 1:1 mapping), and that all referenced image, video, poster, and brand-mark paths exist on disk. It runs automatically during `npm run build`.

### 4. Image Optimization

The project leverages Astro 7's Image Service for high-performance delivery:

- **Case Studies:** Use the standard `Image` component from `astro:assets`.
- **Popovers:** Images in `popovers.json` are automatically pre-optimized and hashed during the build process in `index.astro`.

## Managing Content

### Updating the Resume

The resume content is stored in `src/content/resume.json`.

- Hero positioning lives in `hero.tagline` and `hero.credentials` (rendered above the document on the home page). Edit those fields there — do not hardcode hero copy in page templates or docs.
- Use the `<hotspot key="key-name">text</hotspot>` tag within strings to create interactive elements.

### Configuring Popovers

Popover data is stored in `src/content/popovers.json`.

- Each key corresponds to a `hotspot` key used in the resume.
- Fields include `label`, `text`, `stat`, `quote`, `link`, and `linkText`.
- Media support:
  - `img` (string): For a single legacy image string payload.
  - `media` (array of strings): Use this for rich media (both `.jpg`/`.png` and `.mp4`/`.webm`). If multiple paths are provided, it creates an interactive swipeable carousel containing images and looping videos.
  - `brandMark` and `brandMarkAlt`: Optional supporting mark for an archival artifact that does not identify its issuer visually. It is composed only in the roomier popover, not in narrow marginalia.

## Feature Flags

### Case Study Links (`CASE_STUDY_LINKS`)

Controls which case study pages are linked from popover cards and margin annotations. Filtering is applied server-side — the client never receives links to pages that are not yet enabled.

Set the variable in your `.env` file or Vercel Dashboard:

```bash
# All links hidden (default when variable is absent — safe while authoring)
CASE_STUDY_LINKS=

# All links shown
CASE_STUDY_LINKS=true

# Only Truist is ready to show
CASE_STUDY_LINKS=truist

# Multiple specific studies
CASE_STUDY_LINKS=truist,sparks-grove
```

- **`true` (case-insensitive):** Show all case study links regardless of slug list.
- **Comma-separated slugs:** Show only the listed slugs (path segment after the leading `/`). Matching is case-insensitive.
- **Empty or absent:** All case study links are hidden (safe default while authoring).
- **Scope:** Affects the `link`/`linkText` fields in `popovers.json` entries only. The case study pages themselves remain accessible directly.
- **Adding a new slug:** When you add a new case study page at `/my-project`, either set `CASE_STUDY_LINKS=true` or append `my-project` to the list.

## CSS Type Scale

The résumé uses semantic CSS custom properties (`--type-editorial`, `--type-h2` through `--type-h5`, `--type-body`, `--type-meta`, `--type-year`, `--type-stat`, …) defined in `src/styles/tokens.css`, alongside the shared palette and font stacks — the login gate consumes the scale but does not import `global.css`, so it has to live in the shared layer. The case-study subsystem uses a parallel `--cs-*` scale in `src/styles/case-study.css`.

**The rule:** never write a `font-size` pixel value directly on an element — use the appropriate token, and override only the `:root` variables inside a breakpoint block. See `ARCHITECTURE.md` for the full scale table.

## Adding Case Studies

Case studies are data-driven: content lives in JSON files and a thin `.astro` page imports and renders them. See `ARCHITECTURE.md → Case Study Template System` for the full section type reference.

1. **Create `src/content/case-studies/<slug>.json`** following the schema in `.vscode/case-study.schema.json`. Include `meta`, `hero`, `context`, and a `sections` array where each item has a `type` field (e.g. `cardGrid`, `featureRow`, `textOnly`). Existing slugs are `truist`, `upwave`, `sparks-grove`, `two-way-tv`, `felix`, `fusionfall`, `magic-wall`, and `armchair-manager`.
2. **Add an entry to `src/content/case-studies/manifest.json`** with `slug`, `title`, `description`, `accent` (6-digit hex), and `ogImage`.
3. **Create `src/pages/<slug>.astro`** — copy any existing page. The whole body is:
   ```astro
   ---
   import CaseStudyPage from "../components/case-studies/CaseStudyPage.astro";
   import cs from "../content/case-studies/<slug>.json";
   ---

   <CaseStudyPage cs={cs} />
   ```
4. **Register the editor schema** — add the file path to the `fileMatch` list in `.vscode/settings.json` (autocomplete only; runtime validation comes from `src/content/schema.ts`).
5. **Add images** to `public/images/<slug>/`.
6. **Enable case study links** — set `CASE_STUDY_LINKS=true` or add the slug to the list in `.env.local` / Vercel Dashboard.
