# User & Contributor Guide

## Local Setup

1. **Clone the repository.**
2. **Install Node.js:** Version 18 or higher is recommended.
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

### Updating the Resume
The resume content is stored in `src/content/resume.json`.
- Modify `displayName`, `titleLine`, and `credentials`.
- Update `summary` and `experience` bullets.
- Use the `<hotspot key="key-name">text</hotspot>` tag within strings to create interactive elements.

### Configuring Popovers
Popover data is stored in `src/content/popovers.json`.
- Each key corresponds to a `hotspot` key used in the resume.
- Fields include `label`, `text`, `stat`, `img`, `quote`, `link`, and `linkText`.

### Controlling Scroll Annotations
The sequence and positioning of margin annotations are controlled in `resume.json` under the `scrollAnnotations` key:
```json
"scrollAnnotations": [
  { "key": "gpc-revenue", "side": "right" },
  { "key": "agentic",     "side": "left" }
]
```

## Adding Case Studies

1. **Create a new page:** Add a `.astro` file in `src/pages/`.
2. **Use CaseStudyLayout:** Import and use the `CaseStudyLayout` component.
3. **Add Images:** Place project-specific images in `public/images/[case-study-name]/`.
4. **Style:** Use a `<style>` block for theme-specific CSS (colors, hero styles).
