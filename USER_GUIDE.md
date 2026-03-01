# User & Contributor Guide

## Local Setup

1. **Clone the repository.**
2. **Install Node.js:** Version 18 or higher is recommended.
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **(Optional) Reset Demo Content:**
   ```bash
   npm run setup
   ```
   This clears example data from the JSON files so you can start fresh.
5. **Run the development server:**
   ```bash
   npm run dev
   ```
   The site will be available at `http://localhost:4321`.

The project uses **Vitest** with a **jsdom** environment for unit testing core logic and DOM utilities.
- **Run tests once:** `npm run test`
- **Run in watch mode:** `npx vitest`

## Deployment

The project is configured for **manual production deployment** to Vercel via the CLI. Git-based auto-deployment is disabled to maintain strict release control.

1. **Production Manual Push:**
   ```bash
   vercel deploy --prod
   ```

2. **Integration Checks:**
   Always run `npm run build` locally before pushing to production to ensure TypeScript and Astro validation passes.

## Password Protection

The entire portfolio is protected by an elegant password gate powered by Astro middleware and server-side logic.

- **Environment Variable:** Set `SITE_PASSWORD` in your Vercel Dashboard or local `.env` file.
- **Access:** Users are redirected to `/login` if not authenticated.
- **Privacy:** Crawler indexing is disabled project-wide via `X-Robots-Tag` headers and a global `robots.txt` exclusion.
- **Session:** A secure, `HttpOnly` cookie maintains the session for 7 days.

### 3. Content Verification & Integrity
To ensure that the resume and its interactive layers remain synchronized, use the built-in verification suite:
```bash
npm run verify
```
This script validates that every `<hotspot>` in `resume.json` has a corresponding entry in `popovers.json`, that no hotspots are used more than once (enforcing a strict 1:1 mapping mapping), and that all referenced image paths exist on disk. It runs automatically during `npm run build`.

### 4. Image Optimization
The project leverages Astro 5.0's Image Service for high-performance delivery:
- **Case Studies:** Use the standard `Image` component from `astro:assets`.
- **Popovers:** Images in `popovers.json` are automatically pre-optimized and hashed during the build process in `index.astro`.

## Managing Content

### Updating the Resume
The resume content is stored in `src/content/resume.json`.
- Use the `<hotspot key="key-name">text</hotspot>` tag within strings to create interactive elements.

### Configuring Popovers
Popover data is stored in `src/content/popovers.json`.
- Each key corresponds to a `hotspot` key used in the resume.
- Fields include `label`, `text`, `stat`, `quote`, `link`, and `linkText`.
- Media support:
  - `img` (string): For a single legacy image string payload.
  - `media` (array of strings): Use this for rich media (both `.jpg`/`.png` and `.mp4`/`.webm`). If multiple paths are provided, it automatically creates an interactive swipeable carousel natively rendering images natively alongside looping videos.

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

All font sizes are driven by semantic CSS custom properties (`--type-editorial`, `--type-h1` through `--type-h5`, `--type-body`, `--type-meta`, etc.) defined in `src/styles/global.css`.

**The rule:** never write a `font-size` pixel value directly on an element. Override only the `:root` variables inside a breakpoint block. See `ARCHITECTURE.md` for the full scale table.

## Adding Case Studies

Case studies are data-driven: content lives in JSON files and a thin `.astro` page imports and renders them. See `ARCHITECTURE.md → Case Study Template System` for the full section type reference.

1. **Create `src/content/case-studies/<slug>.json`** following the schema in `.vscode/case-study.schema.json`. Include `meta`, `hero`, `context`, and a `sections` array where each item has a `type` field (e.g. `cardGrid`, `featureRow`, `textOnly`).
2. **Add an entry to `src/content/case-studies/manifest.json`** with `slug`, `title`, `description`, `accent` (6-digit hex), and `ogImage`.
3. **Create `src/pages/<slug>.astro`** — copy any existing page as a template. The body is always:
   ```astro
   import cs from '../content/case-studies/<slug>.json';
   import CaseStudySection from '../components/case-studies/CaseStudySection.astro';
   // ...
   cs.sections.map(s => <CaseStudySection {...s} />)
   ```
4. **Register the schema** — add the file path to the `fileMatch` list in `.vscode/settings.json`.
5. **Add images** to `public/images/<slug>/`.
6. **Enable case study links** — set `CASE_STUDY_LINKS=true` or add the slug to the list in `.env.local` / Vercel Dashboard.
