import { beforeEach, describe, expect, it } from "vitest";
import { initCapsLockWarning } from "./caps-lock";

describe("caps lock warning control", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="password" type="password" />
      <p id="caps-warning" data-active="false">Caps Lock is on</p>
    `;
  });

  it("activates when CapsLock modifier is true on keyboard events", () => {
    initCapsLockWarning();

    const input = document.querySelector<HTMLInputElement>("#password")!;
    const warning = document.querySelector<HTMLElement>("#caps-warning")!;

    expect(warning.dataset.active).toBe("false");

    const keyEventWithCaps = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "A",
      modifierCapsLock: true,
    });
    // In jsdom KeyboardEvent modifierCapsLock may not be fully wired to getModifierState, so mock getModifierState if needed
    keyEventWithCaps.getModifierState = (key: string) => key === "CapsLock";

    input.dispatchEvent(keyEventWithCaps);
    expect(warning.dataset.active).toBe("true");

    const keyEventWithoutCaps = new KeyboardEvent("keyup", {
      bubbles: true,
      cancelable: true,
      key: "a",
    });
    keyEventWithoutCaps.getModifierState = (_key: string) => false;

    input.dispatchEvent(keyEventWithoutCaps);
    expect(warning.dataset.active).toBe("false");
  });

  it("clears the warning on blur", () => {
    initCapsLockWarning();

    const input = document.querySelector<HTMLInputElement>("#password")!;
    const warning = document.querySelector<HTMLElement>("#caps-warning")!;

    warning.dataset.active = "true";
    input.setAttribute("aria-describedby", "caps-warning");
    input.dispatchEvent(new FocusEvent("blur"));
    expect(warning.dataset.active).toBe("false");
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("adds caps-warning to aria-describedby when Caps Lock is on", () => {
    initCapsLockWarning();

    const input = document.querySelector<HTMLInputElement>("#password")!;
    const warning = document.querySelector<HTMLElement>("#caps-warning")!;

    const keyEvent = new KeyboardEvent("keydown", { bubbles: true });
    keyEvent.getModifierState = () => true;

    input.dispatchEvent(keyEvent);
    expect(warning.dataset.active).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("caps-warning");
  });

  it("cleans up listeners when invoking returned teardown function", () => {
    const cleanup = initCapsLockWarning();

    const input = document.querySelector<HTMLInputElement>("#password")!;
    const warning = document.querySelector<HTMLElement>("#caps-warning")!;

    cleanup();

    const keyEvent = new KeyboardEvent("keydown", { bubbles: true });
    keyEvent.getModifierState = () => true;

    input.dispatchEvent(keyEvent);
    expect(warning.dataset.active).toBe("false");
  });

  it("is a no-op when elements are absent", () => {
    document.body.innerHTML = "";
    const cleanup = initCapsLockWarning();
    expect(() => cleanup()).not.toThrow();
  });
});
