import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initCaseStudyBackNavigation,
  initResumeReturnTracking,
  rememberResumeReturn,
  restoreResumeReturnView,
  resumeReturnInternals,
} from "./return-to-resume";

const NOW = 1_800_000_000_000;

function makeEnvironment(overrides: Record<string, unknown> = {}) {
  const storage = window.sessionStorage;
  const history = {
    length: 2,
    state: null as unknown,
    replaceState: vi.fn((state: unknown) => {
      history.state = state;
    }),
    back: vi.fn(),
  };
  const location = {
    href: "https://portfolio.test/upwave",
    origin: "https://portfolio.test",
    pathname: "/upwave",
  };

  return {
    document,
    history,
    location,
    storage,
    now: () => NOW,
    ...overrides,
  };
}

describe("context-preserving case-study return", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.sessionStorage.clear();
  });

  it("records delegated same-tab project-link navigation", () => {
    document.body.innerHTML =
      '<a class="popover-link" href="/upwave"><span>View Upwave project</span></a>';
    const environment = makeEnvironment({
      location: {
        href: "https://portfolio.test/",
        origin: "https://portfolio.test",
        pathname: "/",
      },
    });
    const cleanup = initResumeReturnTracking(environment);
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    event.preventDefault();
    document.querySelector("span")?.dispatchEvent(event);

    expect(
      JSON.parse(
        window.sessionStorage.getItem(resumeReturnInternals.STORAGE_KEY) ?? "",
      ),
    ).toEqual({
      destinationPath: "/upwave",
      createdAt: NOW,
    });
    cleanup();
  });

  it("does not claim modified clicks that may open another tab", () => {
    document.body.innerHTML =
      '<a class="sa-link" href="/upwave">View Upwave project</a>';
    const cleanup = initResumeReturnTracking(
      makeEnvironment({
        location: {
          href: "https://portfolio.test/",
          origin: "https://portfolio.test",
          pathname: "/",
        },
      }),
    );
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      metaKey: true,
    });
    event.preventDefault();
    document.querySelector("a")?.dispatchEvent(event);

    expect(
      window.sessionStorage.getItem(resumeReturnInternals.STORAGE_KEY),
    ).toBeNull();
    cleanup();
  });

  it("records the exact overlay state on the résumé history entry", () => {
    document.body.innerHTML = `
      <div
        class="popover visible"
        data-popover-key="truist"
        style="top: 420px; left: 690px"
      >
        <div class="popover-scroll"></div>
        <button class="popover-carousel-dot"></button>
        <button class="popover-carousel-dot active"></button>
        <a class="popover-link" href="/truist">
          <span>View Truist project</span>
        </a>
      </div>
    `;
    const scrollRegion = document.querySelector<HTMLElement>(".popover-scroll");
    if (scrollRegion) scrollRegion.scrollTop = 240;

    const environment = makeEnvironment({
      location: {
        href: "https://portfolio.test/",
        origin: "https://portfolio.test",
        pathname: "/",
      },
    });
    const cleanup = initResumeReturnTracking(environment);
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    event.preventDefault();
    document.querySelector(".popover-link span")?.dispatchEvent(event);

    expect(environment.history.state).toMatchObject({
      [resumeReturnInternals.VIEW_STATE_KEY]: {
        surface: "popover",
        popoverKey: "truist",
        popoverScrollTop: 240,
        carouselIndex: 1,
        top: "420px",
        left: "690px",
      },
    });
    cleanup();
  });

  it("marks a matching case-study history entry and returns through history", () => {
    document.body.innerHTML = '<a data-resume-back href="/">Back to resume</a>';
    rememberResumeReturn(
      new URL("https://portfolio.test/upwave"),
      window.sessionStorage,
      NOW,
    );
    const environment = makeEnvironment();
    const cleanup = initCaseStudyBackNavigation(environment);

    expect(environment.history.replaceState).toHaveBeenCalledOnce();
    expect(environment.history.state).toMatchObject({
      [resumeReturnInternals.HISTORY_STATE_KEY]: true,
    });

    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    document.querySelector("a")?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(environment.history.back).toHaveBeenCalledOnce();
    cleanup();
  });

  it("keeps the ordinary resume link for direct case-study visits", () => {
    document.body.innerHTML =
      '<a data-resume-back href="#resume">Back to resume</a>';
    const environment = makeEnvironment();
    const cleanup = initCaseStudyBackNavigation(environment);

    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    document.querySelector("a")?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(environment.history.back).not.toHaveBeenCalled();
    cleanup();
  });

  it("rejects stale return context", () => {
    document.body.innerHTML = '<a data-resume-back href="/">Back to resume</a>';
    rememberResumeReturn(
      new URL("https://portfolio.test/upwave"),
      window.sessionStorage,
      NOW - resumeReturnInternals.MAX_CONTEXT_AGE_MS - 1,
    );
    const environment = makeEnvironment();

    initCaseStudyBackNavigation(environment);

    expect(environment.history.replaceState).not.toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem(resumeReturnInternals.STORAGE_KEY),
    ).toBeNull();
  });

  it("reconstructs the saved popover, carousel frame, and scroll position", () => {
    document.body.innerHTML = `
      <button class="hotspot" data-popover="truist">Open Truist</button>
    `;
    const hotspot = document.querySelector<HTMLElement>(".hotspot");
    hotspot?.addEventListener("click", () => {
      document.body.insertAdjacentHTML(
        "beforeend",
        `
          <div class="popover visible">
            <div class="popover-scroll"></div>
            <button class="popover-carousel-dot active"></button>
            <button class="popover-carousel-dot"></button>
          </div>
        `,
      );
    });
    const secondDotClick = vi.fn();
    hotspot?.addEventListener("click", () => {
      document
        .querySelectorAll<HTMLButtonElement>(".popover-carousel-dot")[1]
        ?.addEventListener("click", secondDotClick);
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    const history = {
      length: 2,
      state: {
        [resumeReturnInternals.VIEW_STATE_KEY]: {
          surface: "popover",
          popoverKey: "truist",
          popoverScrollTop: 240,
          carouselIndex: 1,
          top: "420px",
          left: "690px",
        },
      },
      replaceState: vi.fn(),
      back: vi.fn(),
    };

    restoreResumeReturnView({ document, history });

    const popover = document.querySelector<HTMLElement>(".popover.visible");
    expect(popover).not.toBeNull();
    expect(
      popover?.querySelector<HTMLElement>(".popover-scroll")?.scrollTop,
    ).toBe(240);
    expect(secondDotClick).toHaveBeenCalledOnce();
    expect(popover?.style.top).toBe("420px");
    expect(popover?.style.left).toBe("690px");
    vi.unstubAllGlobals();
  });

  it("does not force an overlay when responsive marginalia is present", () => {
    document.body.innerHTML = `
      <aside class="scroll-annotation"></aside>
      <button class="hotspot" data-popover="truist">Open Truist</button>
    `;
    const hotspot = document.querySelector<HTMLElement>(".hotspot");
    const clickSpy = vi.spyOn(hotspot as HTMLElement, "click");
    const history = {
      length: 2,
      state: {
        [resumeReturnInternals.VIEW_STATE_KEY]: {
          surface: "popover",
          popoverKey: "truist",
        },
      },
      replaceState: vi.fn(),
      back: vi.fn(),
    };

    restoreResumeReturnView({ document, history });

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
