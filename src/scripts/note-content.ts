import type { PopoverData, PopoverMedia } from "../types/content.ts";
import { ANNOTATION_TEXT_SENTENCES } from "./constants.ts";
import { buildMediaContent } from "./note-media.ts";

const STAT_PHRASE_CHAR_THRESHOLD = 10;

interface NoteContentOptions {
  includeLink?: boolean;
  mediaMode?: "full" | "thumb" | "none";
  prependRule?: boolean;
  splitGlance?: boolean;
  wrapBody?: boolean;
}

export function splitAtSentences(
  text: string,
  maxSentences: number,
): { lead: string; rest: string } {
  const sentences = text.split(/(?<![A-Z])\.\s+(?=[A-Z])/);
  if (sentences.length <= maxSentences) return { lead: text, rest: "" };
  const clipped = sentences.slice(0, maxSentences).join(". ");
  const lead = clipped.endsWith(".") ? clipped : `${clipped}.`;
  return { lead, rest: sentences.slice(maxSentences).join(". ") };
}

function appendText(
  parent: Node,
  tag: string,
  className: string,
  content: string,
): void {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = content;
  parent.appendChild(element);
}

function buildBrandMark(data: PopoverData, prefix: string): HTMLImageElement {
  const mark = document.createElement("img");
  mark.className = `${prefix}-brand-mark`;
  mark.src = data.brandMark ?? "";
  mark.alt = data.brandMarkAlt ?? "";
  mark.decoding = "async";
  mark.width = 15;
  mark.height = 18;
  return mark;
}

function appendHeader(
  container: Node,
  data: PopoverData,
  prefix: string,
): void {
  const header = document.createElement("div");
  header.className = `${prefix}-head`;
  appendText(header, "span", `${prefix}-label`, data.label);
  if (data.brandMark && !data.stat) {
    header.appendChild(buildBrandMark(data, prefix));
  }
  container.appendChild(header);
}

function appendStat(container: Node, data: PopoverData, prefix: string): void {
  if (!data.stat) return;
  const stat = document.createElement("div");
  stat.className =
    data.stat.length > STAT_PHRASE_CHAR_THRESHOLD
      ? `${prefix}-stat ${prefix}-stat--phrase`
      : `${prefix}-stat`;

  if (data.brandMark) {
    stat.classList.add(`${prefix}-stat--device`);
    stat.append(buildBrandMark(data, prefix), data.stat);
  } else {
    stat.textContent = data.stat;
  }
  container.appendChild(stat);
}

function appendNarrative(
  container: Node,
  data: PopoverData,
  prefix: string,
  splitGlance: boolean,
): void {
  if (!splitGlance) {
    appendText(container, "div", `${prefix}-text`, data.text);
    if (data.quote) {
      appendText(container, "div", `${prefix}-quote`, data.quote);
    }
    return;
  }

  const { lead, rest } = splitAtSentences(data.text, ANNOTATION_TEXT_SENTENCES);
  appendText(container, "div", `${prefix}-text`, lead);
  if (!rest && !data.quote) return;

  const more = document.createElement("div");
  more.className = `${prefix}-more`;
  const inner = document.createElement("div");
  inner.className = `${prefix}-more-inner`;
  if (rest) appendText(inner, "div", `${prefix}-text`, rest);
  if (data.quote) appendText(inner, "div", `${prefix}-quote`, data.quote);
  more.appendChild(inner);
  container.appendChild(more);
}

function buildProjectLink(
  data: PopoverData,
  prefix: string,
): HTMLAnchorElement | null {
  if (!data.link || !data.linkText) return null;
  const link = document.createElement("a");
  const surface = prefix === "sa" ? "margin" : "sheet";
  link.className = `gateway-link gateway-link--invert gateway-link--${surface} ${prefix}-link`;
  link.href = data.link;
  appendText(
    link,
    "span",
    `gateway-link__label ${prefix}-link-label`,
    data.linkText,
  );
  return link;
}

function allMedia(data: PopoverData): PopoverMedia[] {
  if (data.media?.length) return data.media;
  return data.img ? [data.img] : [];
}

function selectMedia(
  data: PopoverData,
  mode: NonNullable<NoteContentOptions["mediaMode"]>,
): PopoverMedia[] {
  if (mode === "none") return [];
  const media = allMedia(data);
  return mode === "thumb" ? media.slice(0, 1) : media;
}

function appendRule(fragment: DocumentFragment, prefix: string): void {
  const rule = document.createElement("div");
  rule.className = `${prefix}-rule`;
  fragment.appendChild(rule);
}

function appendBody(
  fragment: DocumentFragment,
  data: PopoverData,
  prefix: string,
  projectLink: HTMLAnchorElement | null,
  hasMedia: boolean,
  splitGlance: boolean,
  wrapBody: boolean,
): void {
  const body = wrapBody ? document.createElement("div") : fragment;
  if (body instanceof HTMLElement) body.className = `${prefix}-body`;
  appendHeader(body, data, prefix);
  appendStat(body, data, prefix);
  if (!hasMedia && projectLink) body.appendChild(projectLink);
  appendNarrative(body, data, prefix, splitGlance);
  if (body instanceof HTMLElement) fragment.appendChild(body);
}

export function buildContentNode(
  data: PopoverData,
  prefix: string,
  {
    includeLink = true,
    mediaMode = "full",
    prependRule = false,
    splitGlance = false,
    wrapBody = false,
  }: NoteContentOptions = {},
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  if (prependRule) appendRule(fragment, prefix);

  const media = selectMedia(data, mediaMode);
  const mediaContent = buildMediaContent(
    data,
    prefix,
    media,
    mediaMode === "full",
  );
  if (mediaContent) fragment.appendChild(mediaContent);

  const projectLink = includeLink ? buildProjectLink(data, prefix) : null;
  if (mediaContent && projectLink) fragment.appendChild(projectLink);

  appendBody(
    fragment,
    data,
    prefix,
    projectLink,
    Boolean(mediaContent),
    splitGlance,
    wrapBody,
  );

  return fragment;
}
