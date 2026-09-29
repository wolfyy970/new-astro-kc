/**
 * Accessible, fit-to-viewport image viewer for case-study media.
 * Images stay at the size that fits the screen; this is an enlargement, not a
 * zoom/pan tool. The native dialog supplies modal focus containment and the
 * trigger regains focus after the viewer closes.
 */

export function initCaseStudyLightbox(root: ParentNode = document): () => void {
  const dialog = root.querySelector<HTMLDialogElement>(
    "[data-case-study-lightbox]",
  );
  const image = root.querySelector<HTMLImageElement>(
    "[data-case-study-lightbox-image]",
  );
  const caption = root.querySelector<HTMLElement>(
    "[data-case-study-lightbox-caption]",
  );
  const closeButton = root.querySelector<HTMLButtonElement>(
    "[data-case-study-image-close]",
  );

  if (!dialog || !image || !caption || !closeButton) return () => {};

  let lastTrigger: HTMLButtonElement | null = null;

  const openForTrigger = (event: Event) => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) return;

    const trigger = eventTarget.closest<HTMLButtonElement>(
      "[data-case-study-image-trigger]",
    );
    if (!trigger || !root.contains(trigger)) return;

    const src = trigger.dataset.fullSrc;
    if (!src) return;

    const alt =
      trigger.dataset.imageAlt ?? trigger.querySelector("img")?.alt ?? "";
    lastTrigger = trigger;
    image.src = src;
    image.alt = alt;
    caption.textContent = alt;

    if (!dialog.open) dialog.showModal();
    closeButton.focus();
  };

  const closeOnBackdrop = (event: Event) => {
    if (event.target === dialog && dialog.open) dialog.close();
  };

  const closeOnEscape = (event: Event) => {
    event.preventDefault();
    if (dialog.open) dialog.close();
  };

  const restoreTriggerFocus = () => {
    image.removeAttribute("src");
    image.alt = "";
    caption.textContent = "";
    lastTrigger?.focus();
    lastTrigger = null;
  };

  const closeFromButton = () => {
    if (dialog.open) dialog.close();
  };

  root.addEventListener("click", openForTrigger);
  dialog.addEventListener("click", closeOnBackdrop);
  dialog.addEventListener("cancel", closeOnEscape);
  dialog.addEventListener("close", restoreTriggerFocus);
  closeButton.addEventListener("click", closeFromButton);

  return () => {
    root.removeEventListener("click", openForTrigger);
    dialog.removeEventListener("click", closeOnBackdrop);
    dialog.removeEventListener("cancel", closeOnEscape);
    dialog.removeEventListener("close", restoreTriggerFocus);
    closeButton.removeEventListener("click", closeFromButton);
  };
}
