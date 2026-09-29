import { afterEach, describe, expect, it, vi } from "vitest";
import { initCaseStudyLightbox } from "./case-study-lightbox";

describe("case-study image lightbox", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.innerHTML = "";
  });

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
          <img src="/images/example-preview.webp" alt="A detailed product design">
          <span>View larger</span>
        </button>
      </main>
      <dialog data-case-study-lightbox aria-label="Enlarged project image">
        <button type="button" data-case-study-image-close>Close</button>
        <figure>
          <img data-case-study-lightbox-image alt="">
          <figcaption data-case-study-lightbox-caption></figcaption>
        </figure>
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

    return {
      dialog,
      showModal,
      closeDialog: close,
      trigger: document.querySelector<HTMLButtonElement>(
        "[data-case-study-image-trigger]",
      )!,
      close: document.querySelector<HTMLButtonElement>(
        "[data-case-study-image-close]",
      )!,
      image: document.querySelector<HTMLImageElement>(
        "[data-case-study-lightbox-image]",
      )!,
      caption: document.querySelector<HTMLElement>(
        "[data-case-study-lightbox-caption]",
      )!,
    };
  }

  it("opens the original image, exposes its description, and focuses Close", () => {
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
    const { dialog, trigger, close, image, caption, closeDialog } = setup();
    trigger.click();

    close.click();

    expect(dialog.open).toBe(false);
    expect(closeDialog).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
    expect(image.hasAttribute("src")).toBe(false);
    expect(caption.textContent).toBe("");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const { dialog, trigger } = setup();
    trigger.click();
    const escape = new Event("cancel", { cancelable: true });

    dialog.dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the backdrop is clicked, but not when the image is clicked", () => {
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
});
