// ── Shared DOM Utilities ──────────────────────────────────────────────────────
// Single-definition helpers used across all three interactive engines.
// Centralises DOM access patterns, window global validation, and HTML assembly.

import type { PopoverData } from "../types/content.ts";
import {
  ANNOTATION_TEXT_SENTENCES,
  VIDEO_EXTENSIONS,
  POPOVER_IMAGE_WIDTH,
  POPOVER_IMAGE_HEIGHT,
} from "./constants.ts";

// ── Element access ─────────────────────────────────────────────────────────────

/**
 * Gets an element by ID and throws a descriptive error if not found.
 * Use instead of getElementById for any element the engine requires to exist.
 *
 * @param id      DOM element ID (without '#')
 * @param context Name of the calling module, included in the error message
 */
export function requireEl(id: string, context = "Unknown"): HTMLElement {
  const el = document.getElementById(id);
  if (!el)
    throw new Error(`[${context}] Required element #${id} not found in DOM`);
  return el;
}

declare global {
  interface Window {
    __POPOVERS__?: import("../types/content.ts").PopoverMap;
  }
}

/**
 * Reads a window global set by a <script define:vars> block.
 * Throws a diagnostic error if the global is absent, rather than silently
 * casting undefined through the type system.
 *
 * @param key     Property name on window (e.g. '__POPOVERS__')
 * @param context Name of the calling module
 */
export function requireGlobal<K extends keyof Window>(
  key: K,
  context = "Unknown",
): NonNullable<Window[K]> {
  const value = window[key];
  if (value === undefined) {
    throw new Error(
      `[${context}] window.${key} is not set. ` +
        `Check that <script define:vars> in index.astro runs before this module.`,
    );
  }
  return value as NonNullable<Window[K]>;
}

// ── HTML builder ───────────────────────────────────────────────────────────────

// Inline SVG markup for media controls and carousel navigation. Hoisted to
// module scope so the same glyph is defined exactly once.
const ICON_PLAY =
  '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="1.5" fill="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
const ICON_CHEVRON_PREV =
  '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
const ICON_CHEVRON_NEXT =
  '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';

/**
 * Clips text to at most `maxSentences` sentences. Splits on a period that is
 * NOT preceded by an uppercase letter (avoids breaking on abbreviations like
 * U.S., No., Inc.) and is followed by a capital letter (the start of the next
 * sentence). Returns the original text unchanged when it is already short enough.
 */
function truncateToSentences(text: string, maxSentences: number): string {
  const sentences = text.split(/(?<![A-Z])\.\s+(?=[A-Z])/);
  if (sentences.length <= maxSentences) return text;
  const clipped = sentences.slice(0, maxSentences).join(". ");
  return clipped.endsWith(".") ? clipped : `${clipped}.`;
}

function isVideoSrc(src: string): boolean {
  return VIDEO_EXTENSIONS.some((ext) => src.toLowerCase().endsWith(ext));
}

/**
 * Invokes `cb` once the media element has its intrinsic dimensions — immediately
 * if already loaded, otherwise on the relevant load event.
 *
 * Both engines need this for the same reason: none of these images carry
 * width/height attributes, so until the resource resolves they contribute zero
 * height to layout. Anything that measures a container holding them — margin
 * overlap resolution, popover viewport clamping — is measuring a box that is
 * about to grow.
 */
export function onMediaReady(media: Element, cb: () => void): void {
  const tag = media.tagName.toLowerCase();
  if (tag === "img") {
    const image = media as HTMLImageElement;
    if (image.complete) cb();
    else image.addEventListener("load", cb);
  } else if (tag === "video") {
    const video = media as HTMLVideoElement;
    if (video.readyState >= 1)
      cb(); // HAVE_METADATA
    else video.addEventListener("loadeddata", cb);
  }
}

/**
 * Describes one media item for assistive tech.
 *
 * Every image used to receive `data.label` verbatim, so a seven-image carousel
 * announced the same seven words seven times — a screen-reader user could not
 * tell the slides apart or track position. Position is at least derivable
 * without inventing prose. Genuinely descriptive alt text has to be authored
 * per image in popovers.json; this is the honest floor, not the ceiling.
 */
function describeMedia(
  data: PopoverData,
  index: number,
  total: number,
): string {
  return total > 1
    ? `${data.label} — figure ${index + 1} of ${total}`
    : data.label;
}

/**
 * Builds a single media element: an image, an autoplaying muted video, or a
 * click-to-play video wrapped with an overlay play button (when autoPlay is
 * false, e.g. a standalone video or the first carousel slide).
 */
function buildMediaElement(
  data: PopoverData,
  prefix: string,
  src: string,
  { isCarouselItem = false, autoPlay = true, index = 0, total = 1 } = {},
): HTMLElement {
  const isVideo = isVideoSrc(src);
  const mediaEl = document.createElement(isVideo ? "video" : "img");
  const baseClass = isVideo ? `${prefix}-vid` : `${prefix}-img`;
  mediaEl.className = isCarouselItem
    ? `${baseClass} ${prefix}-carousel-item`
    : baseClass;

  const description = describeMedia(data, index, total);

  if (!isVideo) {
    const imgEl = mediaEl as HTMLImageElement;
    imgEl.src = src;
    imgEl.alt = description;
    imgEl.decoding = "async";
    // Reserve layout. Every popover image is pre-optimised to exactly these
    // dimensions, so the ratio is accurate rather than a guess, and the note
    // stops growing after it has been positioned.
    imgEl.width = POPOVER_IMAGE_WIDTH;
    imgEl.height = POPOVER_IMAGE_HEIGHT;
    // Only the first slide is on screen when a carousel opens; the rest are one
    // swipe away and have no business blocking it.
    if (index > 0) imgEl.loading = "lazy";
    return mediaEl;
  }

  const vid = mediaEl as HTMLVideoElement;
  vid.src = src;
  vid.autoplay = autoPlay;
  vid.loop = true;
  vid.muted = true;
  vid.playsInline = true;
  vid.setAttribute("aria-label", description);
  vid.setAttribute("title", description);
  vid.setAttribute("role", "img");

  if (autoPlay) return vid;

  // Paused video: wrap with an overlay play button and wire click-to-toggle.
  const wrap = document.createElement("div");
  wrap.className = `${prefix}-vid-wrap`;
  if (isCarouselItem) {
    wrap.classList.add(`${prefix}-carousel-item`);
    vid.classList.remove(`${prefix}-carousel-item`);
  }

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = `${prefix}-play-btn`;
  playBtn.setAttribute("aria-label", "Play video");
  playBtn.innerHTML = ICON_PLAY;

  const togglePlay = () => {
    if (vid.paused) {
      // Autoplay/gesture policies can reject play(); ignoring is intentional.
      void vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };
  vid.addEventListener("click", togglePlay);
  vid.style.cursor = "pointer";
  playBtn.addEventListener("click", togglePlay);
  vid.addEventListener("play", () => playBtn.classList.add("playing"));
  vid.addEventListener("pause", () => playBtn.classList.remove("playing"));

  wrap.appendChild(vid);
  wrap.appendChild(playBtn);
  return wrap;
}

/**
 * Builds a swipeable carousel for 2+ media items: scroll-snapping slides,
 * fading prev/next chevrons, pagination dots, and a scroll-spy that re-syncs
 * the active state after a native swipe.
 */
function buildCarousel(
  data: PopoverData,
  prefix: string,
  mediaList: string[],
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = `${prefix}-carousel-wrap`;

  const inner = document.createElement("div");
  inner.className = `${prefix}-carousel-inner`;
  wrap.appendChild(inner);

  const carousel = document.createElement("div");
  carousel.className = `${prefix}-carousel`;
  inner.appendChild(carousel);

  mediaList.forEach((src, i) => {
    const slide = document.createElement("div");
    slide.className = `${prefix}-carousel-slide`;
    // First slide starts paused (play button); the rest autoplay muted.
    slide.appendChild(
      buildMediaElement(data, prefix, src, {
        isCarouselItem: true,
        autoPlay: i !== 0,
        index: i,
        total: mediaList.length,
      }),
    );
    carousel.appendChild(slide);
  });

  // Track current index explicitly — avoids depending on offsetWidth at build time.
  let currentIdx = 0;

  const syncNavState = () => {
    btnPrev.style.opacity = currentIdx === 0 ? "0" : "1";
    btnPrev.style.pointerEvents = currentIdx === 0 ? "none" : "auto";
    btnNext.style.opacity = currentIdx === mediaList.length - 1 ? "0" : "1";
    btnNext.style.pointerEvents =
      currentIdx === mediaList.length - 1 ? "none" : "auto";
    const dots = dotsList.children;
    for (let j = 0; j < dots.length; j++) {
      dots[j].classList.toggle("active", j === currentIdx);
    }
  };

  const goToSlide = (idx: number) => {
    const clamped = Math.max(0, Math.min(mediaList.length - 1, idx));
    const firstSlide = carousel.children[0] as HTMLElement | undefined;
    const targetSlide = carousel.children[clamped] as HTMLElement;
    if (firstSlide && targetSlide) {
      // offsetLeft is relative to the positioned carousel wrapper, while
      // scrollLeft is relative to the carousel's own content box. Normalise
      // both slides to the same origin instead of feeding a page-relative
      // offset into the scroll container.
      const targetLeft = targetSlide.offsetLeft - firstSlide.offsetLeft;
      carousel.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
    currentIdx = clamped;
    syncNavState();
  };

  const createNavButton = (dir: "prev" | "next") => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `${prefix}-carousel-nav ${dir}`;
    btn.setAttribute(
      "aria-label",
      dir === "prev" ? "Previous slide" : "Next slide",
    );
    btn.innerHTML = dir === "prev" ? ICON_CHEVRON_PREV : ICON_CHEVRON_NEXT;
    btn.addEventListener("click", () => {
      goToSlide(dir === "prev" ? currentIdx - 1 : currentIdx + 1);
    });
    return btn;
  };

  const btnPrev = createNavButton("prev");
  const btnNext = createNavButton("next");
  inner.appendChild(btnPrev);
  inner.appendChild(btnNext);

  const dotsList = document.createElement("div");
  dotsList.className = `${prefix}-carousel-dots`;
  mediaList.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `${prefix}-carousel-dot` + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => goToSlide(i));
    dotsList.appendChild(dot);
  });
  wrap.appendChild(dotsList);

  // Scroll spy — re-syncs state after native swipe/scroll.
  const updateNav = () => {
    if (carousel.offsetWidth) {
      currentIdx = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    }
    syncNavState();
  };
  carousel.addEventListener("scroll", updateNav, { passive: true });

  // Initial state synchronously — index 0: prev hidden, next visible.
  syncNavState();

  return wrap;
}

function buildProjectLink(
  data: PopoverData,
  prefix: string,
): HTMLAnchorElement | null {
  if (!data.link || !data.linkText) return null;

  const link = document.createElement("a");
  link.className = `${prefix}-link`;
  link.href = data.link;

  const label = document.createElement("span");
  label.className = `${prefix}-link-label`;
  label.textContent = data.linkText;
  link.appendChild(label);

  return link;
}

/** Appends the textual fields (label, stat, text, quote, link) to a container. */
function appendBodyFields(
  container: Node,
  data: PopoverData,
  prefix: string,
  text: string,
  options: {
    projectLink?: HTMLAnchorElement | null;
    linkPlacement?: "before-text" | "after-text";
  } = {},
): void {
  const { projectLink = null, linkPlacement = "after-text" } = options;

  const appendField = (
    tag: string,
    className: string,
    content: string,
    href?: string,
  ) => {
    const el = document.createElement(tag);
    el.className = className;
    el.textContent = content; // Safely escapes HTML
    if (href && tag === "a") {
      (el as HTMLAnchorElement).href = href;
    }
    container.appendChild(el);
  };

  const head = document.createElement("div");
  head.className = `${prefix}-head`;

  const labelEl = document.createElement("span");
  labelEl.className = `${prefix}-label`;
  labelEl.textContent = data.label;
  head.appendChild(labelEl);
  container.appendChild(head);

  // The stat slot holds two different kinds of thing. "$32.8M" and "2000" are
  // figures and earn display scale; "Zero to one product." is a sentence, and
  // setting a sentence at 34px in a 220px margin column made an aside shout
  // louder than the company headings in the document beside it. Long values
  // step down to prose scale, which is what they actually are.
  if (data.stat) {
    const statEl = document.createElement("div");
    statEl.className =
      data.stat.length > 10
        ? `${prefix}-stat ${prefix}-stat--phrase`
        : `${prefix}-stat`;
    statEl.textContent = data.stat;
    container.appendChild(statEl);
  }

  // A no-media popover needs enough context to explain the destination before
  // offering it. Place the project route after the label/stat but before the
  // long narrative. Media popovers place the same link directly after the
  // figure in buildContentNode.
  if (projectLink && linkPlacement === "before-text") {
    container.appendChild(projectLink);
  }

  appendField("div", `${prefix}-text`, text);
  if (data.quote) appendField("div", `${prefix}-quote`, data.quote);

  if (projectLink && linkPlacement === "after-text") {
    container.appendChild(projectLink);
  }
}

/**
 * Builds a DocumentFragment containing DOM elements for a popover card or margin annotation.
 * Both surfaces use the same data shape but differ in class prefix, text length,
 * structural wrapper, and leading rule element. This is a thin orchestrator over
 * truncateToSentences / buildMediaElement / buildCarousel / appendBodyFields.
 *
 * @param data         The popover entry (from popovers.json)
 * @param prefix       CSS class prefix: 'popover' | 'sa'
 * @param options
 *   truncateText  — clip body text to ANNOTATION_TEXT_SENTENCES sentences (for annotations)
 *   wrapBody      — wrap content fields in <div class="{prefix}-body"> (for popovers)
 *   prependRule   — prepend <div class="{prefix}-rule"></div> (for annotations)
 */
export function buildContentNode(
  data: PopoverData,
  prefix: string,
  options: {
    truncateText?: boolean;
    wrapBody?: boolean;
    prependRule?: boolean;
    mediaMode?: "full" | "thumb" | "none";
    includeLink?: boolean;
  } = {},
): DocumentFragment {
  const {
    truncateText = false,
    wrapBody = false,
    prependRule = false,
    mediaMode = "full",
    includeLink = true,
  } = options;
  const fragment = document.createDocumentFragment();

  const text = truncateText
    ? truncateToSentences(data.text, ANNOTATION_TEXT_SENTENCES)
    : data.text;

  if (prependRule) {
    const rule = document.createElement("div");
    rule.className = `${prefix}-rule`;
    fragment.appendChild(rule);
  }

  const allMedia =
    data.media && data.media.length > 0
      ? data.media
      : data.img
        ? [data.img]
        : [];

  // 'thumb' shows the first figure only, with no carousel machinery. The margin
  // says "there is something to see here"; the popover is where you actually
  // see all of it. Running the full carousel in a 250px column duplicated the
  // popover's payload and left the click with nothing to deliver.
  const mediaList =
    mediaMode === "none"
      ? []
      : mediaMode === "thumb"
        ? allMedia.slice(0, 1)
        : allMedia;
  const projectLink = includeLink ? buildProjectLink(data, prefix) : null;

  if (mediaList.length === 1) {
    const media = buildMediaElement(data, prefix, mediaList[0], {
      isCarouselItem: false,
      autoPlay: false,
      index: 0,
      total: 1,
    });

    if (mediaMode === "full") {
      // The popover insets its figures; the margin note runs them flush.
      const mediaWrap = document.createElement("div");
      mediaWrap.className = `${prefix}-media`;
      mediaWrap.appendChild(media);

      // Some archival artifacts do not visually identify the organization that
      // issued them. A period-correct brand mark can sit beside the evidence in
      // the popover, where there is enough room for both. It stays out of the
      // narrow marginalia so the supporting mark never displaces the artifact.
      if (prefix === "popover" && data.brandMark) {
        mediaWrap.classList.add(`${prefix}-media--with-brand`);
        const brandMark = document.createElement("img");
        brandMark.className = `${prefix}-brand-mark`;
        brandMark.src = data.brandMark;
        brandMark.alt = data.brandMarkAlt ?? "";
        brandMark.decoding = "async";
        brandMark.width = 120;
        brandMark.height = 140;
        mediaWrap.insertBefore(brandMark, media);
      }

      fragment.appendChild(mediaWrap);
    } else {
      fragment.appendChild(media);
    }
  } else if (mediaList.length > 1) {
    fragment.appendChild(buildCarousel(data, prefix, mediaList));
  }

  // In the overlay, the project destination belongs immediately after the
  // visual evidence. It starts in the natural reading order and can then stick
  // within the scroll region. Wide marginalia keeps its existing link at the
  // end of the note.
  const linkFollowsMedia =
    prefix === "popover" && mediaList.length > 0 && projectLink;
  if (linkFollowsMedia) {
    fragment.appendChild(projectLink);
  }

  const bodyContainer: Node = wrapBody
    ? document.createElement("div")
    : fragment;
  if (wrapBody) {
    (bodyContainer as HTMLElement).className = `${prefix}-body`;
  }

  appendBodyFields(bodyContainer, data, prefix, text, {
    projectLink: linkFollowsMedia ? null : projectLink,
    linkPlacement: prefix === "popover" ? "before-text" : "after-text",
  });

  if (wrapBody) {
    fragment.appendChild(bodyContainer as HTMLElement);
  }

  return fragment;
}
