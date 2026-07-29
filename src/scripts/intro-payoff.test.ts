import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { attachIntroPayoff, classifyBurst } from "./intro-payoff";
import {
  PAYOFF_DEBOUNCE_MS,
  PAYOFF_RAPID_CLICKS,
  PAYOFF_SLOW_GAP_MS,
  PAYOFF_MAX_REPLIES,
  CLS_INTRO_DONE,
} from "./constants";

describe("classifyBurst", () => {
  it("reads a drumroll as rapid", () => {
    expect(classifyBurst(PAYOFF_RAPID_CLICKS, 100)).toBe("rapid");
    expect(classifyBurst(9, 10_000)).toBe("rapid");
  });

  it("reads a single click after a long pause as contemplative", () => {
    expect(classifyBurst(1, PAYOFF_SLOW_GAP_MS)).toBe("slow");
    expect(classifyBurst(1, PAYOFF_SLOW_GAP_MS * 3)).toBe("slow");
  });

  it("reads everything else as steady", () => {
    expect(classifyBurst(1, 500)).toBe("steady");
    expect(classifyBurst(3, PAYOFF_SLOW_GAP_MS * 2)).toBe("steady");
    expect(classifyBurst(PAYOFF_RAPID_CLICKS - 1, 100)).toBe("steady");
  });
});

describe("attachIntroPayoff", () => {
  let root: HTMLElement;
  let link: HTMLElement;
  let line: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    // The exit choreography schedules through rAF; run it inline.
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    );

    root = document.createElement("div");
    link = document.createElement("span");
    line = document.createElement("div");
    line.textContent = "You got it!";
    root.append(link, line);
    document.body.appendChild(root);

    attachIntroPayoff({ root, link, line, doneClass: CLS_INTRO_DONE });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /** Click once and settle the debounce plus the typing. */
  function clickAndSettle(times = 1): void {
    for (let i = 0; i < times; i += 1) {
      link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(40);
    }
    vi.advanceTimersByTime(PAYOFF_DEBOUNCE_MS + 1500);
  }

  it("keeps the authored first payoff untyped", () => {
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(root.classList.contains(CLS_INTRO_DONE)).toBe(true);
    expect(line.textContent).toBe("You got it!");
  });

  it("answers a burst exactly once, when it ends", () => {
    link.dispatchEvent(new MouseEvent("click", { bubbles: true })); // first payoff

    // Six rapid clicks — the reply must land once, after the burst, and in
    // the rapid voice.
    for (let i = 0; i < 6; i += 1) {
      link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      vi.advanceTimersByTime(40);
    }
    // Mid-burst: nothing has changed yet.
    expect(line.textContent).toBe("You got it!");

    vi.advanceTimersByTime(PAYOFF_DEBOUNCE_MS + 1500);
    expect(line.textContent).toBe("Again!?");
  });

  it("types replies to completion at settle time", () => {
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    clickAndSettle(2); // steady burst
    expect(line.textContent).toBe("Oh, hello again.");
  });

  it("caps the conversation, says goodbye, and removes the introduction", () => {
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Exactly PAYOFF_MAX_REPLIES conversational replies…
    for (let i = 0; i < PAYOFF_MAX_REPLIES; i += 1) clickAndSettle(2);
    expect(line.textContent).not.toBe("Okay, time to go!");

    // …then the very next burst is the goodbye, no matter how much of the
    // pools remains unsaid.
    clickAndSettle(2);
    expect(line.textContent).toBe("Okay, time to go!");

    // The exit choreography: finale hold, settle, retract, pop, removal.
    vi.advanceTimersByTime(4000);
    expect(document.body.contains(root)).toBe(false);

    // The conversation is over — further clicks change nothing.
    expect(() => clickAndSettle(3)).not.toThrow();
  });

  it("refuses a second attachment — one brain per button", () => {
    // A duplicate bind (dev hot reload, double init) must be a no-op:
    // otherwise two conversations answer each click and lines repeat.
    attachIntroPayoff({ root, link, line, doneClass: CLS_INTRO_DONE });

    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    clickAndSettle(1);

    // A single brain replies with the story's first line, not its second.
    expect(line.textContent).toBe("Oh, hello again.");
  });
});
