// Client-side Tabler icons — same ?raw pattern as Icon.astro, without pulling
// the full @tabler/icons-astro barrel into client bundles.

import chevronLeftSvg from "@tabler/icons/outline/chevron-left.svg?raw";
import chevronRightSvg from "@tabler/icons/outline/chevron-right.svg?raw";
import playerPlaySvg from "@tabler/icons/outline/player-play.svg?raw";
import xSvg from "@tabler/icons/outline/x.svg?raw";

function wrapIcon(svg: string, width: number, height: number): string {
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  return (
    `<svg viewBox="0 0 24 24" width="${width}" height="${height}" ` +
    `stroke="currentColor" stroke-width="1.5" fill="none" ` +
    `stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`
  );
}

export const ICON_X = wrapIcon(xSvg, 18, 18);

export const ICON_CHEVRON_PREV = wrapIcon(chevronLeftSvg, 18, 18);

export const ICON_CHEVRON_NEXT = wrapIcon(chevronRightSvg, 18, 18);

export const ICON_PLAYER_PLAY = playerPlaySvg
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .trim();
// Play button uses fill; wrap with the note-media dimensions.
export const ICON_PLAY = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON_PLAYER_PLAY}</svg>`;
