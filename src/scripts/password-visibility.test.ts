import { beforeEach, describe, expect, it } from "vitest";
import { initPasswordVisibilityToggle } from "./password-visibility";

describe("password visibility control", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="password" type="password" />
      <button
        class="password-toggle"
        type="button"
        aria-label="Show password"
        aria-pressed="false"
        data-visible="false"
      ></button>
    `;
  });

  it("keeps the initial concealed state synchronized", () => {
    initPasswordVisibilityToggle();

    const input = document.querySelector<HTMLInputElement>("#password")!;
    const toggle =
      document.querySelector<HTMLButtonElement>(".password-toggle")!;

    expect(input.type).toBe("password");
    expect(toggle.getAttribute("aria-label")).toBe("Show password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.dataset.visible).toBe("false");
  });

  it("toggles visibility, accessible state, and focus in both directions", () => {
    initPasswordVisibilityToggle();

    const input = document.querySelector<HTMLInputElement>("#password")!;
    const toggle =
      document.querySelector<HTMLButtonElement>(".password-toggle")!;

    toggle.click();
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-label")).toBe("Hide password");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.dataset.visible).toBe("true");
    expect(document.activeElement).toBe(input);

    toggle.click();
    expect(input.type).toBe("password");
    expect(toggle.getAttribute("aria-label")).toBe("Show password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.dataset.visible).toBe("false");
    expect(document.activeElement).toBe(input);
  });

  it("is a no-op when the login control is absent", () => {
    document.body.innerHTML = "";
    const cleanup = initPasswordVisibilityToggle();

    expect(() => cleanup()).not.toThrow();
  });
});
