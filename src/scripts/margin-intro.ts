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

function buildIntroSpecimen(
  text: string,
  project: boolean,
  controlsId: string,
): HTMLButtonElement {
  const term = document.createElement("button");
  term.type = "button";
  term.className = project
    ? "intro-term intro-term--project hs-mark-6"
    : "intro-term hs-mark-3";
  term.setAttribute("aria-expanded", "false");
  term.setAttribute("aria-controls", controlsId);
  const stroke = document.createElement("span");
  stroke.className = "hs-stroke";
  stroke.textContent = text;
  term.appendChild(stroke);
  if (project) term.insertAdjacentHTML("beforeend", renderCaseStudyMarker());
  return term;
}

function buildGateway(): {
  container: HTMLElement;
  link: HTMLButtonElement;
} {
  const container = document.createElement("div");
  container.id = "margin-intro-gateway";
  container.className = "intro-reveal intro-reveal--gateway";
  container.hidden = true;
  const inner = document.createElement("div");
  inner.className = "intro-reveal-inner";
  const link = document.createElement("button");
  link.type = "button";
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
  container.hidden = true;
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
  const yellowSpecimen = buildIntroSpecimen(
    "highlighted terms",
    false,
    "margin-intro-more",
  );
  text.append(
    "Scroll to reveal. As you read, ",
    yellowSpecimen,
    " surface detail, data, and media here in the margin.",
  );

  const more = document.createElement("div");
  more.id = "margin-intro-more";
  more.className = "sa-more";
  more.hidden = true;
  const moreInner = document.createElement("div");
  moreInner.className = "sa-more-inner";
  const moreText = document.createElement("div");
  moreText.className = "sa-text";
  const greenSpecimen = buildIntroSpecimen(
    "green mark",
    true,
    "margin-intro-gateway",
  );
  moreText.append(
    "A yellow mark holds a note like this one; a ",
    greenSpecimen,
    " navigates to the project detail.",
  );
  moreInner.appendChild(moreText);

  const gateway = buildGateway();
  const payoff = buildPayoffLine();
  moreInner.append(gateway.container, payoff.container);
  more.appendChild(moreInner);

  const expandIntro = (): void => {
    root.classList.add(CLS_EXPANDED);
    more.hidden = false;
  };

  yellowSpecimen.addEventListener("click", (event) => {
    event.stopPropagation();
    expandIntro();
    yellowSpecimen.setAttribute("aria-expanded", "true");
  });

  greenSpecimen.addEventListener("click", (event) => {
    event.stopPropagation();
    expandIntro();
    root.classList.add(CLS_INTRO_GATEWAY);
    gateway.container.hidden = false;
    greenSpecimen.setAttribute("aria-expanded", "true");
  });

  attachIntroPayoff({
    root,
    link: gateway.link,
    line: payoff.line,
    doneClass: CLS_INTRO_DONE,
    onRemoved: () => onRemoved(root),
    onStageReveal: () => {
      payoff.container.hidden = false;
    },
  });

  root.append(rule, label, text, more);

  docPage.appendChild(root);
  window.setTimeout(() => root.classList.add(CLS_REVEALED), INTRO_REVEAL_MS);
  return root;
}

export function dismissMarginIntro(element: HTMLElement): void {
  element.classList.remove(CLS_REVEALED);
  window.setTimeout(() => element.remove(), INTRO_DISMISS_MS);
}
