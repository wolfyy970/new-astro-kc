/**
 * Monitors Caps Lock state on the password input and toggles a situational
 * status notice, wired into the field's aria-describedby when active.
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

  const syncDescribedBy = (isCaps: boolean): void => {
    const ids: string[] = [];
    const error = root.querySelector("#password-error");
    if (error instanceof HTMLElement) ids.push(error.id);
    if (isCaps) ids.push(warning.id);
    if (ids.length) input.setAttribute("aria-describedby", ids.join(" "));
    else input.removeAttribute("aria-describedby");
  };

  const updateCapsWarning = (event: KeyboardEvent): void => {
    const isCaps =
      typeof event.getModifierState === "function" &&
      event.getModifierState("CapsLock");
    warning.dataset.active = isCaps ? "true" : "false";
    syncDescribedBy(isCaps);
  };

  const handleBlur = (): void => {
    warning.dataset.active = "false";
    syncDescribedBy(false);
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
