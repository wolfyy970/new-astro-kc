import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BREAKPOINT_MOBILE, BREAKPOINT_WIDE } from "./constants";
import {
  attachWidenPrompt,
  widenProgress,
  WIDEN_PROMPT_DONE_MS,
} from "./widen-prompt";

describe("widenProgress", () => {
  it("tracks the actual marginalia breakpoint", () => {
    expect(widenProgress(BREAKPOINT_MOBILE)).toBe(0);
    expect(widenProgress(BREAKPOINT_WIDE)).toBe(1);
    expect(widenProgress((BREAKPOINT_MOBILE + 1 + BREAKPOINT_WIDE) / 2)).toBe(
      0.5,
    );
  });
});

describe("attachWidenPrompt", () => {
  let element: HTMLElement;
  let desktopMatches = true;
  let mediaChange: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    desktopMatches = true;
    mediaChange = undefined;
    element = document.createElement("div");
    element.setAttribute("aria-hidden", "true");
    element.innerHTML = `
      <span class="widen-prompt-label" aria-hidden="false">Widen</span>
      <span class="widen-prompt-done" aria-hidden="true">Ready</span>
    `;
    document.body.appendChild(element);

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.stubGlobal(
      "matchMedia",
      vi.fn(
        () =>
          ({
            get matches() {
              return desktopMatches;
            },
            addEventListener: (_type: string, listener: () => void) => {
              mediaChange = listener;
            },
            removeEventListener: () => {
              mediaChange = undefined;
            },
          }) as unknown as MediaQueryList,
      ),
    );
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows only in a desktop window below the wide tier", () => {
    window.innerWidth = 1024;
    const dispose = attachWidenPrompt(element);

    expect(element.classList.contains("is-visible")).toBe(true);
    expect(element.getAttribute("aria-hidden")).toBe("false");
    expect(
      element.querySelector(".widen-prompt-done")?.getAttribute("aria-hidden"),
    ).toBe("true");

    dispose();
  });

  it("stays hidden on phones and coarse-pointer devices", () => {
    window.innerWidth = BREAKPOINT_MOBILE;
    let dispose = attachWidenPrompt(element);
    expect(element.classList.contains("is-visible")).toBe(false);
    dispose();

    window.innerWidth = 1024;
    desktopMatches = false;
    dispose = attachWidenPrompt(element);
    expect(element.classList.contains("is-visible")).toBe(false);
    expect(element.getAttribute("aria-hidden")).toBe("true");
    dispose();
  });

  it("confirms the reveal when the reader widens across 1420px", () => {
    window.innerWidth = BREAKPOINT_WIDE - 1;
    const dispose = attachWidenPrompt(element);

    window.innerWidth = BREAKPOINT_WIDE;
    window.dispatchEvent(new Event("resize"));
    expect(element.classList.contains("is-done")).toBe(true);
    expect(element.getAttribute("aria-hidden")).toBe("false");
    expect(
      element.querySelector(".widen-prompt-label")?.getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      element.querySelector(".widen-prompt-done")?.getAttribute("aria-hidden"),
    ).toBe("false");

    vi.advanceTimersByTime(WIDEN_PROMPT_DONE_MS);
    expect(element.classList.contains("is-complete")).toBe(true);
    expect(element.getAttribute("aria-hidden")).toBe("true");

    dispose();
  });

  it("responds when pointer capability changes and cleans up", () => {
    window.innerWidth = 1024;
    const dispose = attachWidenPrompt(element);
    expect(element.classList.contains("is-visible")).toBe(true);

    desktopMatches = false;
    mediaChange?.();
    expect(element.classList.contains("is-visible")).toBe(false);

    dispose();
    expect(mediaChange).toBeUndefined();
  });
});
