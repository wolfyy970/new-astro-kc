import {
  ASSIST_BOTTOM_GAP,
  ASSIST_NOTE_TOP,
  ASSIST_TERM_MIN,
} from "./constants.ts";
import { prefersReducedMotion } from "../utils/viewport.ts";

interface AssistMeasurements {
  growth: number;
  noteHeight: number;
  noteTop: number;
  termTop: number;
  viewportHeight: number;
}

/** Calculates the downward scroll needed to reveal a note's final extent. */
export function calculateAssistDelta({
  growth,
  noteHeight,
  noteTop,
  termTop,
  viewportHeight,
}: AssistMeasurements): number {
  const finalBottom = noteTop + noteHeight + growth;
  const wanted = finalBottom - (viewportHeight - ASSIST_BOTTOM_GAP);
  return Math.min(wanted, noteTop - ASSIST_NOTE_TOP, termTop - ASSIST_TERM_MIN);
}

/**
 * Measures a collapsed note's eventual height and applies the shared scroll
 * assist used by both the margin and bound-in surfaces.
 */
export function assistNoteIntoView(
  note: HTMLElement,
  term: HTMLElement,
  expandingInnerSelector: string,
): void {
  const noteRect = note.getBoundingClientRect();
  const inner = note.querySelector<HTMLElement>(expandingInnerSelector);
  const delta = calculateAssistDelta({
    growth: inner ? inner.scrollHeight - inner.offsetHeight : 0,
    noteHeight: note.offsetHeight,
    noteTop: noteRect.top,
    termTop: term.getBoundingClientRect().top,
    viewportHeight: window.innerHeight,
  });

  if (delta > 0) {
    window.scrollBy({
      top: delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }
}
