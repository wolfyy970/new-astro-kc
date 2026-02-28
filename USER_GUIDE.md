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

# Only Truist is ready to show
CASE_STUDY_LINKS=truist

# All current case studies enabled
CASE_STUDY_LINKS=truist,sparks-grove,upwave,two-way-tv
```

- **Value:** Comma-separated list of case study slugs (the path segment after the leading `/`). Matching is case-insensitive.
- **Default:** When the variable is absent or empty, all case study links are hidden.
- **Scope:** Affects the `link`/`linkText` fields in `popovers.json` entries only. The case study pages themselves remain accessible directly.
- **Adding a new slug:** When you add a new case study page at `/my-project`, add `my-project` to the list to enable its links.

## Adding Case Studies

The portfolio includes a modular suite of components to ensure consistent, high-performance case study authoring:

1. **Create a new page:** Add a `.astro` file in `src/pages/`.
2. **Use Case Study Components:**
   - `CaseStudyHero`: For the main title, subtitle, and background.
   - `ContextGrid`: For standardized challenge, role, and scope metadata.
   - `ShowcaseSection`, `ShowcaseGrid`, and `ShowcaseCard`: For flexible image galleries.
   - `FeatureRow`: For asymmetric text/image layouts.
3. **Add Images:** Place project-specific images in `public/images/[case-study-name]/`.
