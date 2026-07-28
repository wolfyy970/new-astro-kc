/**
 * Wires the password visibility control without coupling the behavior to the
 * login page's inline script. Keeping the state transition here makes the
 * icon/label relationship testable: crossed-out eye means concealed text;
 * plain eye means visible text.
 */
export function initPasswordVisibilityToggle(
  root: ParentNode = document,
): () => void {
  const input = root.querySelector("#password");
  const toggle = root.querySelector(".password-toggle");

  if (
    !(input instanceof HTMLInputElement) ||
    !(toggle instanceof HTMLButtonElement)
  ) {
    return () => {};
  }

  const setVisible = (visible: boolean): void => {
    input.type = visible ? "text" : "password";
    toggle.setAttribute(
      "aria-label",
      visible ? "Hide password" : "Show password",
    );
    toggle.setAttribute("aria-pressed", String(visible));
    toggle.dataset.visible = String(visible);
  };

  const handleClick = (): void => {
    setVisible(input.type !== "text");
    input.focus({ preventScroll: true });
  };

  setVisible(input.type === "text");
  toggle.addEventListener("click", handleClick);

  return () => toggle.removeEventListener("click", handleClick);
}
