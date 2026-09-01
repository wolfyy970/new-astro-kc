/**
 * Monitors Caps Lock state on the password input and toggles a situational
 * status notice.
 */
export function initCapsLockWarning(root: ParentNode = document): () => void {
  const input = root.querySelector("#password");
  const warning = root.querySelector("#caps-warning");

  if (
    !(input instanceof HTMLInputElement) ||
    !(warning instanceof HTMLElement)
  ) {
    return () => {};
  }

  const updateCapsWarning = (event: KeyboardEvent): void => {
    const isCaps =
      typeof event.getModifierState === "function" &&
      event.getModifierState("CapsLock");
    warning.dataset.active = isCaps ? "true" : "false";
  };

  const handleBlur = (): void => {
    warning.dataset.active = "false";
  };

  input.addEventListener("keydown", updateCapsWarning);
  input.addEventListener("keyup", updateCapsWarning);
  input.addEventListener("blur", handleBlur);

  return () => {
    input.removeEventListener("keydown", updateCapsWarning);
    input.removeEventListener("keyup", updateCapsWarning);
    input.removeEventListener("blur", handleBlur);
  };
}
