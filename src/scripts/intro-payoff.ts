// ── The Intro Payoff ──────────────────────────────────────────────────────────
// Both introductions (the wide tier's margin note and the editor's note) end
// their staged ladder on an example project gateway. The first click pays off
// plainly. Every click after that is a small conversation with the apparatus:
// the payoff line answers — typed, as if someone behind the page is replying —
// and what it says depends on HOW the reader is clicking.
//
// Three rules keep it feeling like a response rather than a counter:
//
//   1. TRAILING DEBOUNCE. A burst of rapid clicks is one utterance, not many.
//      The reply lands when the burst ends; click-click-click-click earns one
//      reply, about the clicking.
//   2. A SMALL STATE MACHINE. Bursts are classified — rapid (≥5 clicks),
//      steady, or contemplative (a single click after a long pause) — and
//      each track has its own voice. The overall arc still progresses like a
//      story: acknowledge, explain, play, wind down.
//   3. AN ENDING. At the final message the apparatus says goodbye and the
//      introduction leaves the page with a choreographed exit: the note
//      settles down to its rule, the rule retracts to its middle, and it
//      pops out. An easter egg that outstays its welcome isn't one.
//
// Typing is constant-speed (same letters-per-second for every message, so
// longer lines simply take a touch longer) and always sub-second. Reduced
// motion gets instant text and a plain fade-out exit.

import {
  PAYOFF_DEBOUNCE_MS,
  PAYOFF_CHAR_MS,
  PAYOFF_SLOW_GAP_MS,
  PAYOFF_RAPID_CLICKS,
  PAYOFF_FINALE_HOLD_MS,
  PAYOFF_MAX_REPLIES,
  CLS_INTRO_LEAVING,
  CLS_INTRO_GOING,
  CLS_INTRO_POPPED,
} from "./constants.ts";
import { prefersReducedMotion } from "../utils/viewport.ts";

// Every line fits the narrow margin column (two short rows at most) — the
// apparatus never writes an essay. Track order within each pool is the story,
// and the voice is the author's: wry, tongue in cheek, warm. One law above
// all: NOTHING may read as reproach, however gentle. The apparatus is
// delighted by the reader — it plays along, it never manages. A drumroll is
// celebrated, a pause is kept company, and nobody is ever told off.
const STEADY: string[] = [
  "Oh, hello again.",
  "That one's a little demonstration.",
  "The real ones are yellow and green.",
  "They're scattered through the résumé.",
  "This one just likes the attention.",
  "Hello again.",
  "Thorough. I admire that.",
  "Thirty years of work waiting below.",
  "You've found my favourite button.",
  "Imagine what the real links do.",
  "Flattered, frankly.",
  "Somewhere, a case study waits for you.",
  "You might be my favourite reader.",
];

const RAPID: string[] = [
  "Again!?",
  "That's the spirit.",
  "Drumroll...",
  "You're making my day.",
  "Encore accepted.",
  "We could do this all day.",
];

const SLOW: string[] = [
  "Take all the time you like.",
  "A thoughtful pause. Lovely.",
  "Still here whenever you click.",
  "No hurry. The ink is dry.",
  "A careful reader. The best kind.",
];

const FINALE = "Okay, time to go!";

type Burst = "rapid" | "steady" | "slow";

/** Pure classification — exported for tests. */
export function classifyBurst(
  clicks: number,
  gapSinceLastReplyMs: number,
): Burst {
  if (clicks >= PAYOFF_RAPID_CLICKS) return "rapid";
  if (clicks === 1 && gapSinceLastReplyMs >= PAYOFF_SLOW_GAP_MS) return "slow";
  return "steady";
}

interface IntroPayoffOptions {
  /** The introduction's root (receives the stage/exit classes). */
  root: HTMLElement;
  /** The example gateway control. */
  link: HTMLElement;
  /** The payoff line whose text is retyped. */
  line: HTMLElement;
  /** Class that reveals the payoff row on the first click. */
  doneClass: string;
  /** Called after the exit choreography removes the introduction. */
  onRemoved?: () => void;
}

/**
 * Wires the whole conversation onto an introduction's demo gateway.
 * The first click keeps its existing behaviour — the payoff row unfolds with
 * its authored line, untyped — which is exactly why the second click's typed
 * reply lands as a surprise.
 */
export function attachIntroPayoff(options: IntroPayoffOptions): void {
  const { root, link, line, doneClass, onRemoved } = options;

  // One conversation per gateway, ever. A second attachment (dev hot reload,
  // an accidental double init) would put two brains behind one button —
  // replies out of order, lines apparently repeating.
  if (link.dataset.payoffBound === "true") return;
  link.dataset.payoffBound = "true";

  const pools: Record<Burst, string[]> = {
    steady: [...STEADY],
    rapid: [...RAPID],
    slow: [...SLOW],
  };

  let started = false; // first click delivered?
  let finished = false; // finale delivered — conversation over
  let replies = 0; // conversational replies so far — capped by PAYOFF_MAX_REPLIES
  let burstClicks = 0;
  let burstTimer = 0;
  let lastReplyAt = 0;
  let typeTimer = 0;

  function typeInto(text: string, onDone?: () => void): void {
    window.clearInterval(typeTimer);
    if (prefersReducedMotion()) {
      line.textContent = text;
      onDone?.();
      return;
    }
    let i = 0;
    line.textContent = "";
    typeTimer = window.setInterval(() => {
      i += 1;
      line.textContent = text.slice(0, i);
      if (i >= text.length) {
        window.clearInterval(typeTimer);
        onDone?.();
      }
    }, PAYOFF_CHAR_MS);
  }

  function nextMessage(kind: Burst): string | null {
    // The classified pool speaks first; when it runs dry the story continues
    // from the remaining pools; when everything is said, it is time to go.
    const order: Burst[] =
      kind === "steady"
        ? ["steady", "slow", "rapid"]
        : [kind, "steady", "slow", "rapid"];
    for (const pool of order) {
      const next = pools[pool].shift();
      if (next) return next;
    }
    return null;
  }

  function exit(): void {
    if (prefersReducedMotion()) {
      root.style.transition = "opacity 0.2s ease";
      root.style.opacity = "0";
      window.setTimeout(() => {
        root.remove();
        onRemoved?.();
      }, 220);
      return;
    }

    // The farewell is unhurried — each beat gets read before the next one
    // begins. Settle (0.65s), a breath, retract (0.55s), a breath, pop.
    const SETTLE_MS = 650;
    const RETRACT_AT = SETTLE_MS + 150;
    const POP_AT = RETRACT_AT + 550 + 120;
    const REMOVE_AT = POP_AT + 330;

    // Stage 1 — the note settles down to a single line: everything but the
    // rule fades while the box collapses to the rule's band.
    const height = root.offsetHeight;
    root.style.height = `${height}px`;
    root.style.overflow = "hidden";
    root.classList.add(CLS_INTRO_LEAVING);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        root.style.height = "14px";
      }),
    );

    // Stage 2 — the line retracts toward its middle…
    window.setTimeout(() => root.classList.add(CLS_INTRO_GOING), RETRACT_AT);
    // Stage 3 — …and pops out.
    window.setTimeout(() => root.classList.add(CLS_INTRO_POPPED), POP_AT);
    window.setTimeout(() => {
      root.remove();
      onRemoved?.();
    }, REMOVE_AT);
  }

  function reply(): void {
    const clicks = burstClicks;
    burstClicks = 0;
    const now = performance.now();
    const gap = lastReplyAt === 0 ? 0 : now - lastReplyAt;
    lastReplyAt = now;

    // The conversation ends on whichever comes first: the reply cap or the
    // pools running dry. Either way the goodbye is guaranteed — the egg
    // cannot loop and cannot outstay its welcome.
    const message =
      replies < PAYOFF_MAX_REPLIES
        ? nextMessage(classifyBurst(clicks, gap))
        : null;
    if (message !== null) {
      replies += 1;
      typeInto(message);
      return;
    }

    finished = true;
    typeInto(FINALE, () => {
      window.setTimeout(exit, PAYOFF_FINALE_HOLD_MS);
    });
  }

  link.addEventListener("click", () => {
    if (finished) return;

    if (!started) {
      // The plain first payoff — unfolds exactly as authored, untyped.
      started = true;
      lastReplyAt = performance.now();
      root.classList.add(doneClass);
      return;
    }

    // Every later click joins the current burst; the reply lands only when
    // the burst ends.
    burstClicks += 1;
    window.clearTimeout(burstTimer);
    burstTimer = window.setTimeout(reply, PAYOFF_DEBOUNCE_MS);
  });
}
