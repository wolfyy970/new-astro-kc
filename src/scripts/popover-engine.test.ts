import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initPopoverEngine, closePopover } from "./popover-engine";
import { closeInset } from "./inset-note";
import { initAnnotationEngine, cleanupAnnotations } from "./annotation-engine";
import type { PopoverMap } from "../types/content";
import { CLS_ACTIVE, CLS_OPEN, CLS_VISIBLE, ID_INSET } from "./constants";

describe("NoteEngine", () => {
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
    // Set up DOM elements required by the engine
    overlay = document.createElement("div");
    overlay.id = "popover-overlay";
    overlay.className = "popover-overlay";
    document.body.appendChild(overlay);

    popoverEl = document.createElement("div");
    popoverEl.id = "popover";
    popoverEl.className = "popover";
    document.body.appendChild(popoverEl);

    // A summary paragraph hosts the term — the shape the inset binds after.
    const summary = document.createElement("p");
    summary.className = "doc-summary";
    hotspot = document.createElement("button");
    hotspot.className = "hotspot";
    hotspot.dataset.popover = "testKey";
    hotspot.setAttribute("aria-expanded", "false");
    hotspot.setAttribute("aria-controls", "popover");
    summary.appendChild(hotspot);
    document.body.appendChild(summary);

    annotation = document.createElement("div");
    annotation.dataset.annotationKey = "testKey";
    document.body.appendChild(annotation);

    // Middle tier by default; individual suites move to mobile.
    window.innerWidth = 1024;
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
    closeInset({ instant: true });
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("Tier routing", () => {
    it("binds a note into the flow on the middle tier — nothing floats", () => {
      hotspot.click();

      const inset = document.getElementById(ID_INSET);
      expect(inset).not.toBeNull();
      expect(inset?.classList.contains("inset-note")).toBe(true);
      // In the flow, directly after the term's paragraph — not in the sheet.
      expect(inset?.previousElementSibling?.classList.contains("doc-summary")) //
        .toBe(true);
      expect(popoverEl.classList.contains(CLS_VISIBLE)).toBe(false);
      expect(overlay.classList.contains(CLS_OPEN)).toBe(false);
    });

    it("opens the sheet on the mobile tier", () => {
      window.innerWidth = 375;
      hotspot.click();

      expect(document.getElementById(ID_INSET)).toBeNull();
      expect(popoverEl.classList.contains(CLS_VISIBLE)).toBe(true);
      expect(overlay.classList.contains(CLS_OPEN)).toBe(true);
    });
  });

  describe("Bound-in note (middle tier)", () => {
    it("carries the full note content and the fold control", () => {
      hotspot.click();
      const inset = document.getElementById(ID_INSET)!;

      expect(inset.querySelector(".popover-label")?.textContent).toBe(
        "Test Item",
      );
      expect(inset.textContent).toContain("Sentence two.");
      expect(inset.textContent).toContain("A test quote.");
      expect(inset.querySelector(".popover-link")).not.toBeNull();
      expect(inset.querySelector(".popover-head .inset-fold")).not.toBeNull();
    });

    it("manages term state and aria while open", () => {
      hotspot.click();

      expect(hotspot.classList.contains(CLS_ACTIVE)).toBe(true);
      expect(hotspot.getAttribute("aria-expanded")).toBe("true");
      expect(hotspot.getAttribute("aria-controls")).toBe(ID_INSET);

      hotspot.click(); // toggle closed

      expect(hotspot.classList.contains(CLS_ACTIVE)).toBe(false);
      expect(hotspot.getAttribute("aria-expanded")).toBe("false");
      expect(hotspot.getAttribute("aria-controls")).toBe("popover");
      // The dying note loses the id immediately, so the trigger never points
      // at a corpse while it folds away.
      expect(document.getElementById(ID_INSET)).toBeNull();
    });

    it("binds inside a bullet when the term lives in one", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      const bulletTerm = document.createElement("button");
      bulletTerm.className = "hotspot";
      bulletTerm.dataset.popover = "testKey";
      li.appendChild(bulletTerm);
      ul.appendChild(li);
      document.body.appendChild(ul);
      initPopoverEngine(mockData); // rebind to pick up the new term

      bulletTerm.click();

      const inset = document.getElementById(ID_INSET)!;
      expect(inset.parentElement).toBe(li);
    });

    it("closes on Escape", () => {
      hotspot.click();
      expect(document.getElementById(ID_INSET)).not.toBeNull();

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      expect(document.getElementById(ID_INSET)).toBeNull();
    });

    it("closes on a click elsewhere but never on a click inside itself", () => {
      hotspot.click();
      const inset = document.getElementById(ID_INSET)!;

      inset.querySelector<HTMLElement>(".popover-text")!.click();
      expect(document.getElementById(ID_INSET)).not.toBeNull();

      document.body.click();
      expect(document.getElementById(ID_INSET)).toBeNull();
    });

    it("closes via the fold control", () => {
      hotspot.click();
      const inset = document.getElementById(ID_INSET)!;

      inset.querySelector<HTMLButtonElement>(".inset-fold")!.click();
      expect(document.getElementById(ID_INSET)).toBeNull();
      expect(hotspot.getAttribute("aria-expanded")).toBe("false");
    });

    it("folds when the reader scrolls away, forgiving jitter", () => {
      hotspot.click();
      expect(document.getElementById(ID_INSET)).not.toBeNull();

      // Below the exit threshold: still reading.
      document.dispatchEvent(new WheelEvent("wheel", { deltaY: 6 }));
      document.dispatchEvent(new WheelEvent("wheel", { deltaY: 6 }));
      expect(document.getElementById(ID_INSET)).not.toBeNull();

      // A deliberate motion is the exit gesture.
      document.dispatchEvent(new WheelEvent("wheel", { deltaY: 40 }));
      expect(document.getElementById(ID_INSET)).toBeNull();
      expect(hotspot.getAttribute("aria-expanded")).toBe("false");
    });

    it("resets the exit accumulator on each open", () => {
      hotspot.click();
      document.dispatchEvent(new WheelEvent("wheel", { deltaY: 20 }));
      hotspot.click(); // close
      hotspot.click(); // reopen — accumulated 20 must not carry over

      document.dispatchEvent(new WheelEvent("wheel", { deltaY: 20 }));
      expect(document.getElementById(ID_INSET)).not.toBeNull();
    });

    it("swaps to another term's note in a single click", () => {
      const second = document.createElement("button");
      second.className = "hotspot";
      second.dataset.popover = "testKey";
      const para = document.createElement("p");
      para.className = "doc-summary";
      para.appendChild(second);
      document.body.appendChild(para);
      initPopoverEngine(mockData);

      hotspot.click();
      second.click();

      const inset = document.getElementById(ID_INSET)!;
      expect(inset.previousElementSibling).toBe(para);
      expect(second.classList.contains(CLS_ACTIVE)).toBe(true);
      expect(hotspot.classList.contains(CLS_ACTIVE)).toBe(false);
    });
  });

  describe("Sheet lifecycle (mobile)", () => {
    beforeEach(() => {
      window.innerWidth = 375;
    });

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

  describe("Focus trap (sheet only — the one modal surface)", () => {
    beforeEach(() => {
      window.innerWidth = 375;
    });

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

    it("does not trap focus in the non-modal bound-in note", () => {
      window.innerWidth = 1024;
      hotspot.click();

      const inset = document.getElementById(ID_INSET)!;
      const fold = inset.querySelector<HTMLElement>(".inset-fold")!;
      fold.focus();

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
      });
      inset.dispatchEvent(tabEvent);

      // A disclosure lets Tab continue into the document beyond it.
      expect(document.activeElement).toBe(fold);
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
      // Swipe down by 50px (less than the dismiss threshold)
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

    it("closes the sheet when drag distance exceeds threshold", async () => {
      Object.defineProperty(scrollRegion, "scrollTop", {
        value: 0,
        writable: true,
        configurable: true,
      });

      const touchstart = new TouchEvent("touchstart", {
        touches: [{ clientY: 100 } as Touch],
      });
      // Swipe down by 250px (well past the threshold)
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

describe("NoteEngine and marginalia event boundaries", () => {
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

  it("expands the margin note on the wide tier — no inset, no sheet", () => {
    document.querySelector<HTMLElement>('[data-popover="testKey"]')!.click();

    const annotation = document.querySelector<HTMLElement>(
      '[data-annotation-key="testKey"]',
    )!;
    expect(annotation.classList.contains("is-expanded")).toBe(true);
    expect(document.getElementById(ID_INSET)).toBeNull();
    expect(
      document.getElementById("popover")?.classList.contains(CLS_VISIBLE),
    ).toBe(false);
    // The rest of the margin recedes behind the open note.
    expect(
      document.querySelector(".doc-page")?.classList.contains("margin-focus"),
    ).toBe(true);
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

  it("folds the note when the reader scrolls away", () => {
    document.querySelector<HTMLElement>('[data-popover="testKey"]')!.click();
    const annotation = document.querySelector<HTMLElement>(
      '[data-annotation-key="testKey"]',
    )!;
    expect(annotation.classList.contains("is-expanded")).toBe(true);

    // A deliberate wheel motion is the exit gesture.
    document.dispatchEvent(new WheelEvent("wheel", { deltaY: 40 }));

    expect(annotation.classList.contains("is-expanded")).toBe(false);
    expect(
      document.querySelector(".doc-page")?.classList.contains("margin-focus"),
    ).toBe(false);
  });

  it("forgives trackpad jitter below the exit threshold", () => {
    document.querySelector<HTMLElement>('[data-popover="testKey"]')!.click();
    const annotation = document.querySelector<HTMLElement>(
      '[data-annotation-key="testKey"]',
    )!;

    document.dispatchEvent(new WheelEvent("wheel", { deltaY: 6 }));
    document.dispatchEvent(new WheelEvent("wheel", { deltaY: 6 }));

    expect(annotation.classList.contains("is-expanded")).toBe(true);
  });

  it("collapses on Escape and releases the margin focus", () => {
    document.querySelector<HTMLElement>('[data-popover="testKey"]')!.click();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    const annotation = document.querySelector<HTMLElement>(
      '[data-annotation-key="testKey"]',
    )!;
    expect(annotation.classList.contains("is-expanded")).toBe(false);
    expect(
      document.querySelector(".doc-page")?.classList.contains("margin-focus"),
    ).toBe(false);
  });
});
