import { renderCaseStudyMarker } from "../utils/render.ts";
import {
  CLS_EXPANDED,
  CLS_INTRO_DONE,
  CLS_INTRO_GATEWAY,
  CLS_REVEALED,
  INTRO_DISMISS_MS,
  INTRO_REVEAL_MS,
  INTRO_TOP,
} from "./constants.ts";
import { attachIntroPayoff } from "./intro-payoff.ts";

function buildIntroSpecimen(text: string, project: boolean): HTMLElement {
  const term = document.createElement("span");
  term.className = project
    ? "intro-term intro-term--project hs-mark-6"
    : "intro-term hs-mark-3";
  const stroke = document.createElement("span");
  stroke.className = "hs-stroke";
  stroke.textContent = text;
  term.appendChild(stroke);
  if (project) term.insertAdjacentHTML("beforeend", renderCaseStudyMarker());
  return term;
}

function buildGateway(): {
  container: HTMLElement;
  link: HTMLElement;
} {
  const container = document.createElement("div");
  container.className = "intro-reveal intro-reveal--gateway";
  const inner = document.createElement("div");
  inner.className = "intro-reveal-inner";
  const link = document.createElement("span");
  link.className = "sa-link intro-demo-link";
  const label = document.createElement("span");
  label.className = "sa-link-label";
  label.textContent = "View project";
  link.appendChild(label);
  inner.appendChild(link);
  container.appendChild(inner);
  return { container, link };
}

function buildPayoffLine(): {
  container: HTMLElement;
  line: HTMLElement;
} {
  const container = document.createElement("div");
  container.className = "intro-reveal intro-reveal--done";
  const inner = document.createElement("div");
  inner.className = "intro-reveal-inner";
  const line = document.createElement("div");
  line.className = "intro-done";
  line.textContent = "You got it! Scroll away.";
  inner.appendChild(line);
  container.appendChild(inner);
  return { container, line };
}

/** Mounts the cold-start teaching note and returns its root for engine cleanup. */
export function mountMarginIntro(
  docPage: HTMLElement,
  onRemoved: (element: HTMLElement) => void,
): HTMLElement {
  const root = document.createElement("div");
  root.className = "scroll-annotation side-left";
  root.dataset.intro = "true";
  root.style.top = INTRO_TOP;

  const rule = document.createElement("div");
  rule.className = "sa-rule";
  const label = document.createElement("div");
  label.className = "sa-label";
  label.textContent = "Interactive";

  const text = document.createElement("div");
  text.className = "sa-text";
  text.append(
    "Scroll to reveal. As you read, ",
    buildIntroSpecimen("highlighted terms", false),
    " surface detail, data, and media here in the margin.",
  );

  const more = document.createElement("div");
  more.className = "sa-more";
  const moreInner = document.createElement("div");
  moreInner.className = "sa-more-inner";
  const moreText = document.createElement("div");
  moreText.className = "sa-text";
  const greenSpecimen = buildIntroSpecimen("green mark", true);
  moreText.append(
    "A yellow mark holds a note like this one; a ",
    greenSpecimen,
    " leads onward to a complete project.",
  );
  moreInner.appendChild(moreText);

  const gateway = buildGateway();
  const payoff = buildPayoffLine();
  moreInner.append(gateway.container, payoff.container);
  more.appendChild(moreInner);

  greenSpecimen.addEventListener("click", () =>
    root.classList.add(CLS_INTRO_GATEWAY),
  );
  attachIntroPayoff({
    root,
    link: gateway.link,
    line: payoff.line,
    doneClass: CLS_INTRO_DONE,
    onRemoved: () => onRemoved(root),
  });
  root.addEventListener("click", () => root.classList.add(CLS_EXPANDED));
  root.append(rule, label, text, more);

  docPage.appendChild(root);
  window.setTimeout(() => root.classList.add(CLS_REVEALED), INTRO_REVEAL_MS);
  return root;
}

export function dismissMarginIntro(element: HTMLElement): void {
  element.classList.remove(CLS_REVEALED);
  window.setTimeout(() => element.remove(), INTRO_DISMISS_MS);
}
