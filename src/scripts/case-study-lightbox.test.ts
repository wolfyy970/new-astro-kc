import { afterEach, describe, expect, it, vi } from "vitest";
import { initCaseStudyLightbox } from "./case-study-lightbox";

const RECT = { left: 100, top: 50, width: 1000, height: 600 };

function rect(box: typeof RECT): DOMRect {
  return {
    ...box,
    x: box.left,
    y: box.top,
    right: box.left + box.width,
    bottom: box.top + box.height,
    toJSON: () => box,
  };
}

describe("case-study image lightbox", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, "matchMedia");
  });

  function stubPointer(fine: boolean) {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: fine })),
    });
  }

  function setup() {
    document.body.innerHTML = `
      <main>
        <button
          type="button"
          data-case-study-image-trigger
          data-full-src="/images/example-full.png"
          data-image-alt="A detailed product design"
          aria-label="View larger image: A detailed product design"
        >
          <img src="/images/example-preview.webp" alt="A detailed product design" width="2000" height="1200">
          <span>View larger</span>
        </button>
      </main>
      <dialog data-case-study-lightbox aria-label="Enlarged project image">
        <header>
          <p data-case-study-lightbox-caption></p>
          <button type="button" data-case-study-zoom-out aria-label="Zoom out"></button>
          <output data-case-study-zoom-level>2.5×</output>
          <button type="button" data-case-study-zoom-in aria-label="Zoom in"></button>
          <button type="button" data-case-study-magnifier-toggle aria-pressed="true">Magnifier</button>
          <button type="button" data-case-study-image-close>Close</button>
        </header>
        <div data-case-study-stage tabindex="0">
          <figure data-case-study-figure>
            <img data-case-study-lightbox-image alt="">
            <div data-case-study-lens aria-hidden="true"></div>
          </figure>
        </div>
        <p aria-live="polite" data-case-study-live></p>
      </dialog>
    `;

    const dialog = document.querySelector<HTMLDialogElement>(
      "[data-case-study-lightbox]",
    );
    if (!dialog) throw new Error("Missing lightbox dialog in test fixture");

    const showModal = vi.fn(() => dialog.setAttribute("open", ""));
    const close = vi.fn(() => {
      dialog.removeAttribute("open");
      dialog.dispatchEvent(new Event("close"));
    });
    Object.defineProperties(dialog, {
      showModal: { configurable: true, value: showModal },
      close: { configurable: true, value: close },
    });

    cleanup = initCaseStudyLightbox(document);

    const q = <T extends Element>(selector: string) =>
      document.querySelector<T>(selector)!;
    const image = q<HTMLImageElement>("[data-case-study-lightbox-image]");
    const figure = q<HTMLElement>("[data-case-study-figure]");
    const stage = q<HTMLElement>("[data-case-study-stage]");
    image.getBoundingClientRect = () => rect(RECT);
    figure.getBoundingClientRect = () => rect(RECT);
    stage.getBoundingClientRect = () => rect({ ...RECT, top: 0, height: 700 });

    return {
      dialog,
      showModal,
      closeDialog: close,
      trigger: q<HTMLButtonElement>("[data-case-study-image-trigger]"),
      close: q<HTMLButtonElement>("[data-case-study-image-close]"),
      image,
      figure,
      stage,
      lens: q<HTMLElement>("[data-case-study-lens]"),
      caption: q<HTMLElement>("[data-case-study-lightbox-caption]"),
      zoomIn: q<HTMLButtonElement>("[data-case-study-zoom-in]"),
      zoomOut: q<HTMLButtonElement>("[data-case-study-zoom-out]"),
      zoomLevel: q<HTMLElement>("[data-case-study-zoom-level]"),
      toggle: q<HTMLButtonElement>("[data-case-study-magnifier-toggle]"),
      live: q<HTMLElement>("[data-case-study-live]"),
    };
  }

  /** Opens the dialog and finishes "loading" a full-resolution file. */
  function open(
    ui: ReturnType<typeof setup>,
    natural: [number, number] = [4000, 2400],
  ) {
    ui.trigger.click();
    Object.defineProperties(ui.image, {
      naturalWidth: { configurable: true, value: natural[0] },
      naturalHeight: { configurable: true, value: natural[1] },
    });
    ui.image.dispatchEvent(new Event("load"));
  }

  const move = (target: Element, x: number, y: number, type = "mouse") => {
    const event = new MouseEvent("pointermove", {
      bubbles: true,
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(event, "pointerType", { value: type });
    target.dispatchEvent(event);
  };

  it("opens the original image, exposes its description, and focuses Close", () => {
    stubPointer(true);
    const { dialog, trigger, close, image, caption, showModal } = setup();

    trigger.querySelector("img")?.click();

    expect(dialog.open).toBe(true);
    expect(showModal).toHaveBeenCalledOnce();
    expect(image.getAttribute("src")).toBe("/images/example-full.png");
    expect(image.alt).toBe("A detailed product design");
    expect(caption.textContent).toBe("A detailed product design");
    expect(document.activeElement).toBe(close);
  });

  it("closes with its control and restores focus to the image that opened it", () => {
    stubPointer(true);
    const ui = setup();
    open(ui);

    ui.close.click();

    expect(ui.dialog.open).toBe(false);
    expect(ui.closeDialog).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(ui.trigger);
    expect(ui.image.hasAttribute("src")).toBe(false);
    expect(ui.caption.textContent).toBe("");
    expect(ui.lens.dataset.visible).toBe("false");
    expect(ui.dialog.hasAttribute("data-orientation")).toBe(false);
  });

  it("closes on Escape and returns focus to the trigger", () => {
    stubPointer(true);
    const { dialog, trigger } = setup();
    trigger.click();
    const escape = new Event("cancel", { cancelable: true });

    dialog.dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the backdrop is clicked, but not when the image is clicked", () => {
    stubPointer(true);
    const { dialog, trigger, image } = setup();
    trigger.click();
    image.click();
    expect(dialog.open).toBe(true);

    dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("does not intercept ordinary images or links", () => {
    const { dialog, showModal } = setup();
    const main = document.querySelector("main");
    if (!main) throw new Error("Missing test main");
    main.insertAdjacentHTML(
      "beforeend",
      '<img src="/images/ordinary.png" alt="Ordinary image"><a href="/next">Next page</a>',
    );
    const link = main.querySelector("a");
    link?.addEventListener("click", (event) => event.preventDefault());
    link?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    main
      .querySelector("img[alt='Ordinary image']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(dialog.open).toBe(false);
    expect(showModal).not.toHaveBeenCalled();
  });

  describe("magnifier lens", () => {
    it("is on by default for a fine pointer and stays hidden until the image has loaded", () => {
      stubPointer(true);
      const ui = setup();
      ui.trigger.click();

      expect(ui.toggle.getAttribute("aria-pressed")).toBe("true");
      move(ui.figure, 600, 350);
      expect(ui.lens.dataset.visible).toBe("false");

      Object.defineProperties(ui.image, {
        naturalWidth: { configurable: true, value: 4000 },
        naturalHeight: { configurable: true, value: 2400 },
      });
      ui.image.dispatchEvent(new Event("load"));
      move(ui.figure, 600, 350);
      expect(ui.lens.dataset.visible).toBe("true");
    });

    it("centres on the pointer at 2.5× and aims the full-resolution image under it", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);

      move(ui.figure, 600, 350); // image-relative (500, 300)

      expect(ui.lens.style.left).toBe("360px");
      expect(ui.lens.style.top).toBe("200px");
      expect(ui.lens.style.width).toBe("280px");
      expect(ui.lens.style.height).toBe("200px");
      expect(ui.lens.style.backgroundSize).toBe("2500px 1500px");
      expect(ui.lens.style.backgroundPosition).toContain("-1110px");
      expect(ui.lens.style.backgroundPosition).toContain("-650px");
      expect(ui.lens.style.backgroundImage).toContain(
        "/images/example-full.png",
      );
      expect(ui.lens.dataset.zoom).toBe("2.5×");
    });

    it("stays inside the image near a corner", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);

      move(ui.figure, 101, 51);

      expect(ui.lens.style.left).toBe("0px");
      expect(ui.lens.style.top).toBe("0px");
    });

    it("hides when the pointer leaves the image or the image box", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);
      move(ui.figure, 600, 350);
      expect(ui.lens.dataset.visible).toBe("true");

      move(ui.figure, 10, 10); // outside the rendered image
      expect(ui.lens.dataset.visible).toBe("false");

      move(ui.figure, 600, 350);
      ui.figure.dispatchEvent(new MouseEvent("pointerleave"));
      expect(ui.lens.dataset.visible).toBe("false");
    });

    it("zooms with the buttons, announces the level, and disables at the bounds", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);
      move(ui.figure, 600, 350);

      ui.zoomIn.click();
      expect(ui.zoomLevel.textContent).toBe("3×");
      expect(ui.live.textContent).toBe("Zoom 3×");
      expect(ui.lens.style.backgroundSize).toBe("3000px 1800px");

      for (let i = 0; i < 6; i++) ui.zoomIn.click();
      expect(ui.zoomLevel.textContent).toBe("5×");
      expect(ui.zoomIn.getAttribute("aria-disabled")).toBe("true");

      for (let i = 0; i < 10; i++) ui.zoomOut.click();
      expect(ui.zoomLevel.textContent).toBe("1.5×");
      expect(ui.zoomOut.getAttribute("aria-disabled")).toBe("true");
      expect(ui.zoomIn.getAttribute("aria-disabled")).toBe("false");
    });

    it("zooms with the + and - keys and toggles with M", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);

      ui.dialog.dispatchEvent(
        new KeyboardEvent("keydown", { key: "+", bubbles: true }),
      );
      expect(ui.zoomLevel.textContent).toBe("3×");
      ui.dialog.dispatchEvent(
        new KeyboardEvent("keydown", { key: "-", bubbles: true }),
      );
      ui.dialog.dispatchEvent(
        new KeyboardEvent("keydown", { key: "-", bubbles: true }),
      );
      expect(ui.zoomLevel.textContent).toBe("2×");

      ui.dialog.dispatchEvent(
        new KeyboardEvent("keydown", { key: "m", bubbles: true }),
      );
      expect(ui.toggle.getAttribute("aria-pressed")).toBe("false");
      expect(ui.live.textContent).toBe("Magnifier off");
    });

    it("toggles with its button and with a mouse click on the image, never closing the dialog", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);
      move(ui.figure, 600, 350);

      ui.toggle.click();
      expect(ui.toggle.getAttribute("aria-pressed")).toBe("false");
      expect(ui.lens.dataset.visible).toBe("false");

      ui.image.click();
      expect(ui.toggle.getAttribute("aria-pressed")).toBe("true");
      expect(ui.lens.dataset.visible).toBe("true");
      expect(ui.dialog.open).toBe(true);
    });

    it("zooms with the wheel only while the lens is showing, and leaves Ctrl+wheel to the browser", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);

      const idle = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -120,
      });
      ui.figure.dispatchEvent(idle);
      expect(idle.defaultPrevented).toBe(false);

      move(ui.figure, 600, 350);
      const ctrl = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -120,
        ctrlKey: true,
      });
      ui.figure.dispatchEvent(ctrl);
      expect(ctrl.defaultPrevented).toBe(false);

      const wheel = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -120,
      });
      ui.figure.dispatchEvent(wheel);
      expect(wheel.defaultPrevented).toBe(true);
      expect(
        Number.parseFloat(ui.zoomLevel.textContent ?? "0"),
      ).toBeGreaterThan(2.5);
    });

    it("moves with the arrow keys from the centre, and Shift moves further", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);

      const press = (key: string, shiftKey = false) => {
        const event = new KeyboardEvent("keydown", {
          key,
          shiftKey,
          bubbles: true,
          cancelable: true,
        });
        ui.stage.dispatchEvent(event);
        return event;
      };

      const first = press("ArrowRight");
      expect(first.defaultPrevented).toBe(true);
      expect(ui.lens.dataset.visible).toBe("true");
      const afterOne = Number.parseFloat(ui.lens.style.left);
      press("ArrowRight", true);
      expect(Number.parseFloat(ui.lens.style.left)).toBe(afterOne + 96);

      ui.stage.dispatchEvent(new Event("blur"));
      expect(ui.lens.dataset.visible).toBe("false");
    });

    it("lets arrow keys scroll natively when the magnifier is off", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);
      ui.toggle.click();

      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      ui.stage.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });

    it("starts off for touch screens, and a press-and-drag moves a lens that floats above the finger", () => {
      stubPointer(false);
      const ui = setup();
      open(ui);
      expect(ui.toggle.getAttribute("aria-pressed")).toBe("false");

      ui.toggle.click();
      move(ui.figure, 600, 350, "touch");
      expect(ui.lens.dataset.visible).toBe("false"); // not pressed yet

      const down = new MouseEvent("pointerdown", {
        bubbles: true,
        clientX: 600,
        clientY: 450,
      });
      Object.defineProperty(down, "pointerType", { value: "touch" });
      ui.figure.dispatchEvent(down);
      expect(ui.lens.dataset.visible).toBe("true");
      // Floats above the finger: the lens bottom sits above the touch point.
      const lensBottom =
        Number.parseFloat(ui.lens.style.top) +
        Number.parseFloat(ui.lens.style.height);
      expect(lensBottom).toBeLessThan(450 - RECT.top);

      const up = new MouseEvent("pointerup", { bubbles: true });
      Object.defineProperty(up, "pointerType", { value: "touch" });
      ui.figure.dispatchEvent(up);
      expect(ui.lens.dataset.visible).toBe("false");
    });

    it("does not let a touch tap toggle the magnifier", () => {
      stubPointer(false);
      const ui = setup();
      open(ui);
      ui.toggle.click();
      expect(ui.toggle.getAttribute("aria-pressed")).toBe("true");

      const tap = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(tap, "pointerType", { value: "touch" });
      ui.image.dispatchEvent(tap);
      expect(ui.toggle.getAttribute("aria-pressed")).toBe("true");
    });

    it("marks tall images so the stage scrolls, and leaves the wheel to scrolling", () => {
      stubPointer(true);
      const ui = setup();
      open(ui, [1500, 3700]);
      expect(ui.dialog.dataset.orientation).toBe("tall");

      move(ui.figure, 600, 350);
      const wheel = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -120,
      });
      ui.figure.dispatchEvent(wheel);
      expect(wheel.defaultPrevented).toBe(false);
      expect(ui.zoomLevel.textContent).toBe("2.5×");
    });

    it("re-aims the lens when a tall page scrolls under a stationary pointer", () => {
      stubPointer(true);
      const ui = setup();
      open(ui, [1500, 3700]);
      move(ui.figure, 600, 350);
      expect(ui.lens.style.top).toBe("200px");

      // Scrolled 120px: the image box moved up, the pointer did not.
      ui.image.getBoundingClientRect = () =>
        rect({ ...RECT, top: RECT.top - 120 });
      ui.figure.getBoundingClientRect = ui.image.getBoundingClientRect;
      ui.stage.dispatchEvent(new Event("scroll"));

      expect(ui.lens.style.top).toBe("320px");
    });

    it("uses a stand-in box from the inline display variant while the full file loads", () => {
      stubPointer(true);
      const ui = setup();
      ui.trigger.click();

      expect(ui.figure.dataset.loading).toBe("true");
      expect(ui.figure.style.getPropertyValue("--lightbox-aspect")).toBe(
        String(2000 / 1200),
      );
      expect(ui.dialog.dataset.orientation).toBe("regular");

      Object.defineProperties(ui.image, {
        naturalWidth: { configurable: true, value: 4000 },
        naturalHeight: { configurable: true, value: 2400 },
      });
      ui.image.dispatchEvent(new Event("load"));
      expect(ui.figure.hasAttribute("data-loading")).toBe(false);
    });

    it("forgets everything on close: no lens, no listeners, default zoom next time", () => {
      stubPointer(true);
      const ui = setup();
      open(ui);
      ui.zoomIn.click();
      move(ui.figure, 600, 350);
      ui.close.click();

      move(ui.figure, 600, 350);
      expect(ui.lens.dataset.visible).toBe("false");

      open(ui);
      expect(ui.zoomLevel.textContent).toBe("2.5×");
    });
  });
});
