import {
  INTERACTIVE_LEAD_CLICK,
  INTERACTIVE_PENS,
} from "../content/instructions.ts";
import {
  CLS_REVEALED,
  INTRO_DISMISS_MS,
  INTRO_REVEAL_MS,
  INTRO_TOP,
} from "./constants.ts";

function buildSpecimen(text: string, project: boolean): HTMLSpanElement {
  const specimen = document.createElement("span");
  specimen.className = project
    ? "edition-specimen edition-specimen--project hs-mark-6"
    : "edition-specimen edition-specimen--note hs-mark-3";
  const stroke = document.createElement("span");
  stroke.className = "hs-stroke";
  stroke.textContent = text;
  specimen.appendChild(stroke);
  return specimen;
}

/** Mounts the cold-start teaching note and returns its root for engine cleanup. */
export function mountMarginIntro(docPage: HTMLElement): HTMLElement {
  const root = document.createElement("div");
  root.className = "scroll-annotation side-left margin-intro";
  root.dataset.intro = "true";
  root.style.top = INTRO_TOP;
  root.setAttribute("aria-hidden", "true");

  const rule = document.createElement("div");
  rule.className = "sa-rule";
  const label = document.createElement("div");
  label.className = "sa-label";
  label.textContent = "Interactive";

  const lead = document.createElement("div");
  lead.className = "sa-text";
  lead.textContent = INTERACTIVE_LEAD_CLICK;

  const pens = document.createElement("div");
  pens.className = "sa-text sa-text--pens";
  pens.append(
    buildSpecimen(INTERACTIVE_PENS.yellowWord, false),
    document.createTextNode(INTERACTIVE_PENS.betweenYellow),
    buildSpecimen(INTERACTIVE_PENS.greenWord, true),
    document.createTextNode(INTERACTIVE_PENS.afterGreen),
  );

  root.append(rule, label, lead, pens);
  docPage.appendChild(root);
  window.setTimeout(() => root.classList.add(CLS_REVEALED), INTRO_REVEAL_MS);
  return root;
}

export function dismissMarginIntro(element: HTMLElement): void {
  element.classList.remove(CLS_REVEALED);
  window.setTimeout(() => element.remove(), INTRO_DISMISS_MS);
}
