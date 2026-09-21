import { BREAKPOINT_MOBILE, BREAKPOINT_WIDE } from "./constants.ts";

export const WIDEN_PROMPT_ID = "widen-prompt";
export const WIDEN_PROMPT_DONE_MS = 1200;
export const DESKTOP_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

type PromptWindow = Pick<
  Window,
  | "innerWidth"
  | "matchMedia"
  | "requestAnimationFrame"
  | "cancelAnimationFrame"
  | "setTimeout"
  | "clearTimeout"
  | "addEventListener"
  | "removeEventListener"
>;

export function widenProgress(width: number): number {
  const visibleMin = BREAKPOINT_MOBILE + 1;
  const progress = (width - visibleMin) / (BREAKPOINT_WIDE - visibleMin);
  return Math.max(0, Math.min(1, progress));
}

export function attachWidenPrompt(
  element: HTMLElement,
  targetWindow: PromptWindow = window,
): () => void {
  const pointerQuery = targetWindow.matchMedia(DESKTOP_POINTER_QUERY);
  let armed = false;
  let beating = false;
  let frame = 0;
  let beatTimer = 0;
  const label = element.querySelector<HTMLElement>(".widen-prompt-label");
  const done = element.querySelector<HTMLElement>(".widen-prompt-done");

  const setHidden = (hidden: boolean) =>
    element.setAttribute("aria-hidden", String(hidden));

  const setDoneMessage = (isDone: boolean) => {
    label?.setAttribute("aria-hidden", String(isDone));
    done?.setAttribute("aria-hidden", String(!isDone));
  };

  const hide = () => {
    element.classList.remove("is-visible", "is-done", "is-complete");
    setDoneMessage(false);
    setHidden(true);
  };

  const apply = () => {
    frame = 0;
    const width = targetWindow.innerWidth;
    element.style.setProperty("--widen-progress", String(widenProgress(width)));

    if (!pointerQuery.matches || width <= BREAKPOINT_MOBILE) {
      armed = false;
      beating = false;
      targetWindow.clearTimeout(beatTimer);
      hide();
      return;
    }

    if (width < BREAKPOINT_WIDE) {
      armed = true;
      beating = false;
      targetWindow.clearTimeout(beatTimer);
      element.classList.remove("is-done", "is-complete");
      element.classList.add("is-visible");
      setDoneMessage(false);
      setHidden(false);
      return;
    }

    if (beating) return;
    if (!armed) {
      hide();
      return;
    }

    armed = false;
    beating = true;
    element.classList.remove("is-complete");
    element.classList.add("is-visible", "is-done");
    setDoneMessage(true);
    setHidden(false);
    targetWindow.clearTimeout(beatTimer);
    beatTimer = targetWindow.setTimeout(() => {
      beating = false;
      element.classList.add("is-complete");
      setHidden(true);
    }, WIDEN_PROMPT_DONE_MS);
  };

  const schedule = () => {
    if (frame) targetWindow.cancelAnimationFrame(frame);
    frame = targetWindow.requestAnimationFrame(apply);
  };

  apply();
  targetWindow.addEventListener("resize", schedule);
  pointerQuery.addEventListener("change", schedule);

  return () => {
    if (frame) targetWindow.cancelAnimationFrame(frame);
    targetWindow.clearTimeout(beatTimer);
    targetWindow.removeEventListener("resize", schedule);
    pointerQuery.removeEventListener("change", schedule);
    hide();
  };
}

export function initWidenPrompt(): () => void {
  const element = document.getElementById(WIDEN_PROMPT_ID);
  return element ? attachWidenPrompt(element) : () => {};
}
