import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initPopoverEngine, closePopover } from "./popover-engine";
import { initAnnotationEngine, cleanupAnnotations } from "./annotation-engine";
import type { PopoverMap } from "../types/content";
import {
  CLS_ACTIVE,
  CLS_OPEN,
  CLS_VISIBLE,
  DRAG_MIN_VISIBLE,
  POPOVER_MARGIN_MIN,
  POPOVER_MAX_WIDTH,
} from "./constants";

describe("PopoverEngine", () => {
  let hotspot: HTMLButtonElement;
  let annotation: HTMLElement;
  let overlay: HTMLElement;
  let popoverEl: HTMLElement;

  const mockData: PopoverMap = {
    testKey: {
      label: "Test Item",
      stat: "99%",
      text: "This is a test description sentence one. Sentence two.",
      quote: "A test quote.",
      link: "https://example.com",
      linkText: "Learn more",
    },
  };

  beforeEach(() => {
    // Set up DOM elements required by PopoverEngine
    overlay = document.createElement("div");
    overlay.id = "popover-overlay";
    overlay.className = "popover-overlay";
    document.body.appendChild(overlay);

    popoverEl = document.createElement("div");
    popoverEl.id = "popover";
    popoverEl.className = "popover";
    // Add minimal layout fields needed for measurements
    Object.defineProperty(popoverEl, "offsetHeight", {
      value: 300,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(popoverEl, "offsetWidth", {
      value: 380,
      writable: true,
      configurable: true,
    });
    document.body.appendChild(popoverEl);

    hotspot = document.createElement("button");
    hotspot.className = "hotspot";
    hotspot.dataset.popover = "testKey";
    hotspot.setAttribute("aria-expanded", "false");
    document.body.appendChild(hotspot);

    annotation = document.createElement("div");
    annotation.dataset.annotationKey = "testKey";
    document.body.appendChild(annotation);

    // Reset window dimensions
    window.innerWidth = 1440;
    window.innerHeight = 900;
    window.scrollY = 0;

    // Mock requestAnimationFrame to run immediately
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    );

    // Mock Date.now to control elapsed time for swipe velocity
    let currentTime = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      currentTime += 200;
      return currentTime;
    });

    // Initialize engine
    initPopoverEngine(mockData);
  });

  afterEach(() => {
    closePopover({ returnFocus: false });
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("Positioning (desktop vs mobile)", () => {
    it("returns empty position strings on mobile viewport", () => {
      window.innerWidth = 375; // mobile breakpoint is 768
      hotspot.click();
      expect(popoverEl.style.top).toBe("");
      expect(popoverEl.style.left).toBe("");
    });

    it("places popover below hotspot when space is available", () => {
      hotspot.getBoundingClientRect = () => ({
        left: 200,
        top: 100,
        width: 100,
        height: 30,
        right: 300,
        bottom: 130,
        x: 200,
        y: 100,
        toJSON: () => {},
      });

      hotspot.click();
      // hotspot bottom (130) + offset (10) = 140px
      expect(popoverEl.style.top).toBe("140px");
    });

    it("flips popover above hotspot when space is limited below", () => {
      hotspot.getBoundingClientRect = () => ({
        left: 200,
        top: 700, // Near bottom of 900px viewport
        width: 100,
        height: 30,
        right: 300,
        bottom: 730,
        x: 200,
        y: 700,
        toJSON: () => {},
      });

      hotspot.click();
      // worst case height is 0.8 * 900 = 720px. Space below is 900 - 730 - 10 = 160px (insufficient).
      // hotspot top (700) - worstCaseHeight (720) - offset (10) = -30px (negative, will clamp)
      // Post-render clamp aligns bottom of popover (actual height 300) above the hotspot if it fits:
      // hotspot top (700) - actual height (300) - offset (10) = 390px.
      // Since 390px >= 16px (min margin), it fits above hotspot perfectly.
      expect(popoverEl.style.top).toBe("390px");
    });

    it("keeps a tall note on screen when its term is below the fold", () => {
      // Regression. Two guards were one-sided and covered for each other's gap:
      // the flip only checked that the panel cleared the TOP margin, and the
      // clamp only checked the BOTTOM. When the term is outside the viewport —
      // which happens on the re-clamp that fires as a carousel's figures finish
      // loading, if the reader has scrolled in the meantime — "above the term"
      // clears the top margin and still ends far past the bottom of the screen.
      Object.defineProperty(popoverEl, "offsetHeight", {
        value: 700, // a media-heavy note
        writable: true,
        configurable: true,
      });

      hotspot.getBoundingClientRect = () => ({
        left: 200,
        top: 1100, // below a 900px viewport
        width: 100,
        height: 30,
        right: 300,
        bottom: 1130,
        x: 200,
        y: 1100,
        toJSON: () => {},
      });

      hotspot.click();

      const top = parseFloat(popoverEl.style.top);
      expect(top).toBeGreaterThanOrEqual(POPOVER_MARGIN_MIN);
      expect(top + 700).toBeLessThanOrEqual(
        window.innerHeight - POPOVER_MARGIN_MIN,
      );
    });

    it("keeps a note on screen when its term is above the fold", () => {
      // The mirror case: the old clamp returned early whenever the bottom edge
      // was fine, so a panel positioned off the TOP of the viewport was never
      // corrected at all.
      Object.defineProperty(popoverEl, "offsetHeight", {
        value: 400,
        writable: true,
        configurable: true,
      });

      hotspot.getBoundingClientRect = () => ({
        left: 200,
        top: -600, // scrolled well above the viewport
        width: 100,
        height: 30,
        right: 300,
        bottom: -570,
        x: 200,
        y: -600,
        toJSON: () => {},
      });

      hotspot.click();

      const top = parseFloat(popoverEl.style.top);
      expect(top).toBeGreaterThanOrEqual(POPOVER_MARGIN_MIN);
      expect(top + 400).toBeLessThanOrEqual(
        window.innerHeight - POPOVER_MARGIN_MIN,
      );
    });

    it("pins a note taller than the viewport to the top margin", () => {
      // Nothing can fit; the panel scrolls internally, so the guarantee is that
      // its top edge stays reachable rather than drifting above the fold.
      Object.defineProperty(popoverEl, "offsetHeight", {
        value: 1200, // taller than the 900px viewport
        writable: true,
        configurable: true,
      });

      hotspot.getBoundingClientRect = () => ({
        left: 200,
        top: 600,
        width: 100,
        height: 30,
        right: 300,
        bottom: 630,
        x: 200,
        y: 600,
        toJSON: () => {},
      });

      hotspot.click();
      expect(popoverEl.style.top).toBe(`${POPOVER_MARGIN_MIN}px`);
    });

    it("clamps popover to horizontal viewport margins", () => {
      hotspot.getBoundingClientRect = () => ({
        left: 10, // Near left edge
        top: 100,
        width: 50,
        height: 20,
        right: 60,
        bottom: 120,
        x: 10,
        y: 100,
        toJSON: () => {},
      });

      hotspot.click();
      // Center is (10 + 25) = 35. Center - 380/2 = -155.
      // Clamps to min margin (16px)
      expect(popoverEl.style.left).toBe("16px");
    });

    it("positions against the rendered fluid width rather than a stale constant", () => {
      window.innerWidth = 800;
      Object.defineProperty(popoverEl, "offsetWidth", {
        value: 520,
        writable: true,
        configurable: true,
      });
      hotspot.getBoundingClientRect = () => ({
        left: 760,
        top: 100,
        width: 40,
        height: 20,
        right: 800,
        bottom: 120,
        x: 760,
        y: 100,
        toJSON: () => {},
      });

      hotspot.click();

      expect(popoverEl.style.left).toBe("264px");
      expect(POPOVER_MAX_WIDTH).toBeGreaterThanOrEqual(520);
    });
  });

  describe("Lifecycle and State Changes", () => {
    it("manages hotspot and overlay classes and attributes on open/close", () => {
      expect(hotspot.classList.contains(CLS_ACTIVE)).toBe(false);
      expect(hotspot.getAttribute("aria-expanded")).toBe("false");

      hotspot.click();

      expect(hotspot.classList.contains(CLS_ACTIVE)).toBe(true);
      expect(hotspot.getAttribute("aria-expanded")).toBe("true");
      expect(overlay.classList.contains(CLS_OPEN)).toBe(true);
      expect(popoverEl.classList.contains(CLS_VISIBLE)).toBe(true);
      expect(popoverEl.dataset.popoverKey).toBe("testKey");
      expect(annotation.classList.contains("annotation-suppressed")).toBe(true);

      closePopover({ returnFocus: false });

      expect(hotspot.classList.contains(CLS_ACTIVE)).toBe(false);
      expect(hotspot.getAttribute("aria-expanded")).toBe("false");
      expect(overlay.classList.contains(CLS_OPEN)).toBe(false);
      expect(popoverEl.classList.contains(CLS_VISIBLE)).toBe(false);
      expect(popoverEl.dataset.popoverKey).toBeUndefined();
      expect(annotation.classList.contains("annotation-suppressed")).toBe(
        false,
      );
    });

    it("keeps the project link in the scrolling content before the narrative", () => {
      hotspot.click();

      const scrollRegion =
        popoverEl.querySelector<HTMLElement>(".popover-scroll");
      const projectLink =
        popoverEl.querySelector<HTMLAnchorElement>(".popover-link");

      expect(scrollRegion).not.toBeNull();
      expect(projectLink).not.toBeNull();
      expect(scrollRegion?.contains(projectLink)).toBe(true);
      expect(
        projectLink?.nextElementSibling?.classList.contains("popover-text"),
      ).toBe(true);
    });

    it("keeps the accessible close button outside the aria-hidden handle", () => {
      hotspot.click();

      const handle = popoverEl.querySelector(".popover-handle");
      const closeButton = popoverEl.querySelector(".popover-close");
      const scrollRegion = popoverEl.querySelector(".popover-scroll");

      expect(Array.from(popoverEl.children)).toEqual([
        handle,
        closeButton,
        scrollRegion,
      ]);
      expect(handle?.getAttribute("aria-hidden")).toBe("true");
      expect(closeButton?.parentElement).toBe(popoverEl);
    });

    it("returns focus to hotspot on close by default", async () => {
      const focusSpy = vi.spyOn(hotspot, "focus");
      hotspot.click();
      closePopover({ returnFocus: true });

      // Wait for requestAnimationFrame
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(focusSpy).toHaveBeenCalled();
    });

    it("does not return focus when returnFocus is false", async () => {
      const focusSpy = vi.spyOn(hotspot, "focus");
      hotspot.click();
      closePopover({ returnFocus: false });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(focusSpy).not.toHaveBeenCalled();
    });
  });

  describe("Focus Trap", () => {
    it("traps focus to rotate from last to first element when tabbing", () => {
      hotspot.click();

      const closeBtn = popoverEl.querySelector(".popover-close") as HTMLElement;
      const link = popoverEl.querySelector(".popover-link") as HTMLElement;

      expect(closeBtn).not.toBeNull();
      expect(link).not.toBeNull();

      // Set active element to link (last focusable element)
      link.focus();

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
      });
      popoverEl.dispatchEvent(tabEvent);

      expect(document.activeElement).toBe(closeBtn);
    });

    it("traps focus to rotate from first to last element when shift-tabbing", () => {
      hotspot.click();

      const closeBtn = popoverEl.querySelector(".popover-close") as HTMLElement;
      const link = popoverEl.querySelector(".popover-link") as HTMLElement;

      closeBtn.focus();

      const shiftTabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      });
      popoverEl.dispatchEvent(shiftTabEvent);

      expect(document.activeElement).toBe(link);
    });
  });

  describe("Desktop drag (viewport clamping)", () => {
    // Synthesises a pointer event jsdom won't construct natively, carrying the
    // coordinate fields the drag handler reads off the event.
    const pointerEvent = (
      type: string,
      props: Record<string, unknown>,
    ): Event => {
      const e = new Event(type, { bubbles: true });
      Object.assign(e, props);
      return e;
    };

    let handle: HTMLElement;

    beforeEach(() => {
      window.innerWidth = 1440;
      // jsdom does not implement pointer capture; stub it so drag can engage.
      popoverEl.setPointerCapture = vi.fn();
      popoverEl.releasePointerCapture = vi.fn();
      hotspot.click();
      handle = popoverEl.querySelector(".popover-handle") as HTMLElement;
      expect(handle).not.toBeNull();
      // Establish a known starting position before dragging.
      popoverEl.style.left = "100px";
      popoverEl.style.top = "100px";
    });

    it("clamps left so the panel cannot be dragged past the right edge", () => {
      handle.dispatchEvent(
        pointerEvent("pointerdown", {
          clientX: 100,
          clientY: 100,
          pointerId: 1,
        }),
      );
      popoverEl.dispatchEvent(
        pointerEvent("pointermove", {
          clientX: 99999,
          clientY: 100,
          pointerId: 1,
        }),
      );

      expect(popoverEl.style.left).toBe(
        `${window.innerWidth - DRAG_MIN_VISIBLE}px`,
      );
    });

    it("clamps left to the minimum margin at the left edge", () => {
      handle.dispatchEvent(
        pointerEvent("pointerdown", {
          clientX: 100,
          clientY: 100,
          pointerId: 1,
        }),
      );
      popoverEl.dispatchEvent(
        pointerEvent("pointermove", {
          clientX: -99999,
          clientY: 100,
          pointerId: 1,
        }),
      );

      expect(popoverEl.style.left).toBe(`${POPOVER_MARGIN_MIN}px`);
    });
  });

  describe("Swipe-to-dismiss (mobile only)", () => {
    let scrollRegion: HTMLElement;

    beforeEach(() => {
      window.innerWidth = 375; // engage mobile mode
      hotspot.click();
      scrollRegion = popoverEl.querySelector<HTMLElement>(".popover-scroll")!;
    });

    it("ignores swipe gestures when scrollTop is greater than 0", () => {
      Object.defineProperty(scrollRegion, "scrollTop", {
        value: 10,
        writable: true,
        configurable: true,
      });

      const touchstart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      const touchmove = new TouchEvent("touchmove", {
        touches: [{ clientY: 200 } as Touch],
      });

      popoverEl.dispatchEvent(touchstart);
      popoverEl.dispatchEvent(touchmove);

      // Style property shouldn't be set since swipe was ignored
      expect(popoverEl.style.getPropertyValue("--sheet-drag-offset")).toBe("");
    });

    it("tracks swipe downward when scrollTop is 0", () => {
      Object.defineProperty(scrollRegion, "scrollTop", {
        value: 0,
        writable: true,
        configurable: true,
      });

      const touchstart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      const touchmove = new TouchEvent("touchmove", {
        touches: [{ clientY: 200 } as Touch],
      });

      popoverEl.dispatchEvent(touchstart);
      popoverEl.dispatchEvent(touchmove);

      // delta is 100. Offset is 100 * 0.65 = 65px
      expect(popoverEl.style.getPropertyValue("--sheet-drag-offset")).toBe(
        "65px",
      );
    });

    it("snaps back when drag distance is insufficient", async () => {
      Object.defineProperty(scrollRegion, "scrollTop", {
        value: 0,
        writable: true,
        configurable: true,
      });

      const touchstart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      // Swipe down by 50px (less than threshold 120px)
      const touchmove = new TouchEvent("touchmove", {
        touches: [{ clientY: 150 } as Touch],
      });
      const touchend = new TouchEvent("touchend");

      popoverEl.dispatchEvent(touchstart);
      popoverEl.dispatchEvent(touchmove);
      popoverEl.dispatchEvent(touchend);

      expect(popoverEl.style.getPropertyValue("--sheet-drag-offset")).toBe(
        "0px",
      );
      expect(popoverEl.classList.contains(CLS_VISIBLE)).toBe(true);
    });

    it("closes popover when drag distance exceeds threshold", async () => {
      Object.defineProperty(scrollRegion, "scrollTop", {
        value: 0,
        writable: true,
        configurable: true,
      });

      const touchstart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      // Swipe down by 250px (greater than threshold 120px)
      const touchmove = new TouchEvent("touchmove", {
        touches: [{ clientY: 350 } as Touch],
      });
      const touchend = new TouchEvent("touchend");

      popoverEl.dispatchEvent(touchstart);
      popoverEl.dispatchEvent(touchmove);
      popoverEl.dispatchEvent(touchend);

      expect(popoverEl.style.getPropertyValue("--sheet-drag-offset")).toBe(
        "100vh",
      );

      // Wait for close timeout (300ms)
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(popoverEl.classList.contains(CLS_VISIBLE)).toBe(false);
    });
  });
});

describe("PopoverEngine and marginalia event boundaries", () => {
  beforeEach(() => {
    window.innerWidth = 1440;
    window.innerHeight = 900;
    window.scrollY = 0;

    document.body.innerHTML = `
      <div id="popover-overlay" class="popover-overlay"></div>
      <div id="popover" class="popover"></div>
      <div class="doc-page">
        <button class="hotspot" data-popover="testKey" aria-expanded="false">
          Test term
        </button>
      </div>
    `;

    window.HTMLElement.prototype.getBoundingClientRect = vi
      .fn()
      .mockReturnValue({
        top: 100,
        bottom: 130,
        height: 30,
        left: 200,
        right: 300,
        width: 100,
      });

    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    (window as any).IntersectionObserver = MockIntersectionObserver;

    const data: PopoverMap = {
      testKey: {
        label: "Test Item",
        text: "First sentence. Second sentence.",
      },
    };
    initAnnotationEngine(data);
    initPopoverEngine(data);
  });

  afterEach(() => {
    closePopover({ returnFocus: false });
    cleanupAnnotations();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("keeps a marginalia note expanded when its child content is clicked", () => {
    const annotation = document.querySelector<HTMLElement>(
      '[data-annotation-key="testKey"]',
    )!;
    annotation.querySelector<HTMLElement>(".sa-text")!.click();

    expect(annotation.classList.contains("is-expanded")).toBe(true);
    expect(
      document
        .querySelector<HTMLElement>('[data-popover="testKey"]')
        ?.getAttribute("aria-expanded"),
    ).toBe("true");
  });
});
