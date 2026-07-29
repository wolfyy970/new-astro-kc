# Asset Quarantine

This directory holds 29 tracked images moved out of `public/` on 2026-07-29
after repository-wide source, content, CSS, and manifest searches found no
references to their former URLs.

The project groupings are preserved so each move is reversible. Files here are
not deployed and must not be referenced by production code. Delete them only
after the complete quality gate and browser verification remain green.

Verification completed on 2026-07-29:

- `npm run quality` passed, including the content verifier and production build.
- The quarantine contributed zero files to `dist/` or `.vercel/output/`.
- Login, all eight case-study routes, and the résumé at mobile, middle, and wide
  breakpoints passed live browser checks with no broken images, console errors,
  server errors, or horizontal overflow.
