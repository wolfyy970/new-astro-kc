import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initPopoverEngine, closePopover } from "./popover-engine";
import type { PopoverMap } from "../types/content";
import {
  CLS_ACTIVE,
  CLS_OPEN,
  CLS_VISIBLE,
  CLS_POPOVER_OPEN,
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
      expect(annotation.classList.contains("annotation-suppressed")).toBe(true);

      closePopover({ returnFocus: false });

      expect(hotspot.classList.contains(CLS_ACTIVE)).toBe(false);
      expect(hotspot.getAttribute("aria-expanded")).toBe("false");
      expect(overlay.classList.contains(CLS_OPEN)).toBe(false);
      expect(popoverEl.classList.contains(CLS_VISIBLE)).toBe(false);
      expect(annotation.classList.contains("annotation-suppressed")).toBe(
        false,
      );
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

  describe("Swipe-to-dismiss (mobile only)", () => {
    beforeEach(() => {
      window.innerWidth = 375; // engage mobile mode
      hotspot.click();
    });

    it("ignores swipe gestures when scrollTop is greater than 0", () => {
      Object.defineProperty(popoverEl, "scrollTop", {
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
      Object.defineProperty(popoverEl, "scrollTop", {
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
      Object.defineProperty(popoverEl, "scrollTop", {
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
      Object.defineProperty(popoverEl, "scrollTop", {
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
