import { describe, it, expect, beforeEach } from "vitest";
import { attachSmilePortrait } from "./smile-portrait";
import { CLS_SMILED } from "./constants";

describe("attachSmilePortrait", () => {
  let portrait: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    portrait = document.createElement("figure");
    document.body.appendChild(portrait);
    attachSmilePortrait(portrait);
  });

  it("smiles on the first pointer greeting and the smile stays", () => {
    portrait.dispatchEvent(new Event("pointerenter"));
    expect(portrait.classList.contains(CLS_SMILED)).toBe(true);

    // Leaving does not take the smile back.
    portrait.dispatchEvent(new Event("pointerleave"));
    expect(portrait.classList.contains(CLS_SMILED)).toBe(true);
  });

  it("smiles on a tap where hover never happens", () => {
    portrait.dispatchEvent(new Event("click"));
    expect(portrait.classList.contains(CLS_SMILED)).toBe(true);
  });

  it("tolerates a null root and a duplicate attachment", () => {
    expect(() => attachSmilePortrait(null)).not.toThrow();

    // A second bind (dev hot reload) is a no-op — the guard holds.
    attachSmilePortrait(portrait);
    expect(portrait.dataset.smileBound).toBe("true");
    portrait.dispatchEvent(new Event("pointerenter"));
    expect(portrait.classList.contains(CLS_SMILED)).toBe(true);
  });
});
