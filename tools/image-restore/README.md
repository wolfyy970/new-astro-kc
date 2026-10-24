# image-restore

Pipeline used to regenerate the Bolt case-study images at 4K with Nano Banana 2.1 while keeping every colour, label and layout exactly as in the source. Local tooling only; the site never imports it.

Needs `pip install numpy pillow opencv-python-headless`. Scratch files go to `$WORK` (default `.tmp/image-restore`, git-ignored); the originals are read from `$SRC` (default `public/images/bolt`).

## Status

The Bolt (14) and Upwave (6) case-study images are regenerated at 4K+. The tall pages (`bolt-color`, `bolt-typography`, `bolt-depth`, `bolt-grid`) were tiled, generated tile by tile, and stitched at 3840 px wide.

## Workflow for the tall pages

1. `python3 tools/image-restore/prep_tiles.py` cuts each page into ~3:2 tiles at whitespace rows and pads each to a supported aspect ratio. Send `$WORK/in/<tile>.png`; `meta.json` has each tile's `ratio`.
2. Generate each tile with Nano Banana 2.1 (`resolution` 4K, thinking high). With the optional OpenRouter MCP: `openrouter_generate_image` with `reference_images: [".tmp/image-restore/in/<tile>.png"]`, `aspect_ratio` from `meta.json`, and `output_path: ".tmp/image-restore/raw/<tile>.png"`. Use the prompt below.
3. `python3 tools/image-restore/restore.py <tile> ...` registers each result onto the original's geometry (affine, then dense optical flow), keeps the model only for thin structure (text, hairlines) and takes large shapes and flat fills from the original, then colour-locks it. It prints a correlation report; `0 low blocks` is the goal.
4. The model sometimes changes a digit or smudges a glyph (it turned `#4A4A4A` into `#444444`). For any tile with flagged blocks, generate two more seeds, run `restore.py` on them in separate `$WORK` folders, then `python3 tools/image-restore/ensemble.py <tile> <alt_work_dir> ...` to patch only the bad spots from the best-matching alternative.
5. `python3 tools/image-restore/stitch_tiles.py bolt-color bolt-typography bolt-depth bolt-grid` writes `$WORK/final3/<page>.webp`.
6. Check by eye at 100%: every hex code, label and number against the original (the "TBD" panels stay as they are).
7. Copy the WebPs over `public/images/bolt/`, run `npm run images:display`, then `npm run quality`.

## UI mockups with tiny text and icons: tile into a 2x2 grid first

Whole-image generation at ~3x lets the model misread tiny text and icons (an ad that read "TROCKIIK" instead of "450kCal.", swapped nav icons, a changed share icon). A 2x2 grid reads them at ~6x and fixes it. `prep_grid.py <name> 2 2` cuts overlapping tiles (seams on quiet rows and columns), `restore.py` registers each one, `stitch_grid.py <name>` blends them back, and `screen.py` lists clusters that disagree with the original for a by-eye check (photo texture also flags: it is added detail, not a change).

Notes from the Upwave pass: photos came back faithful (same faces and scenes, more detail). A dimmed or blurred backdrop (the Trackit modal) must not be tiled: the model re-lit the dim rail, so use the whole-image result there. Prompts must repeat the source's spelling exactly (the source says "Healthy Recipies"; a prompt that "corrected" it produced a broken glyph). Where the model completes a clipped edge with a torn shape, paste the original's pixels back over that strip.

## Prompt (per tile)

> This is a faithful restoration and upscale of a design-system documentation page. Reproduce the supplied image exactly: same layout, positions, sizes, proportions, colours and text, only sharper, cleaner and higher resolution. Clean-up only: remove compression noise, blur and ringing. Do NOT add, remove, restyle, move, resize, re-crop, re-frame or re-balance anything, and do not zoom in. COLOUR must be exact: solid areas stay perfectly flat with no gradient, tint, vignette, grain or banding. TEXT must be character-for-character identical, including every hex code, label, number and symbol; do not re-word, re-space or re-case anything. The flat padding around the content stays plain.

## Lessons

- Never ship raw model output. It tints flat fills, adds halos around text and drifts geometry; `restore.py` keeps the model only near real detail and takes flat colour from the source.
- Sparse images get zoomed or recomposed. Crop tightly to the content first (as done for the checkboxes), then paste the result back.
- Photos and small icons get re-invented. Keep the original pixels for those.
- The model only sees a flattened copy of transparent images, so keep the original alpha and the original colour of semi-transparent pixels (shadows).
