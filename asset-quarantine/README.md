# Asset Quarantine

This directory holds tracked images moved out of `public/` after they were found
to be unused or unsuitable for the portfolio's documented work. The original 29
unreferenced images were quarantined on 2026-07-29. The CNN Hurricane Idalia
still was added on 2026-07-30 when the Magic Wall case study was corrected:
the 2023 broadcast image was anachronistic to the 2006–2008 project.

The project groupings are preserved so each move is reversible. Files here are
not deployed and must not be referenced by production code. Delete them only
after the complete quality gate and browser verification remain green.

Verification completed on 2026-07-29:

- `npm run quality` passed, including the content verifier and production build.
- The quarantine contributed zero files to `dist/` or `.vercel/output/`.
- Login, all eight case-study routes, and the résumé at mobile, middle, and wide
  breakpoints passed live browser checks with no broken images, console errors,
  server errors, or horizontal overflow.
