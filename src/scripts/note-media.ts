import type { PopoverData, PopoverMedia } from "../types/content.ts";
import {
  POPOVER_IMAGE_HEIGHT,
  POPOVER_IMAGE_WIDTH,
  VIDEO_EXTENSIONS,
} from "./constants.ts";

import { ICON_CHEVRON_NEXT, ICON_CHEVRON_PREV, ICON_PLAY } from "./icons.ts";

interface MediaElementOptions {
  autoPlay?: boolean;
  index?: number;
  isCarouselItem?: boolean;
  total?: number;
}

function mediaSource(media: PopoverMedia): string {
  return typeof media === "string" ? media : media.src;
}

function isVideo(media: PopoverMedia): boolean {
  const src = mediaSource(media).toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => src.endsWith(extension));
}

function describeMedia(
  data: PopoverData,
  index: number,
  total: number,
): string {
  return total > 1
    ? `${data.label} — figure ${index + 1} of ${total}`
    : data.label;
}

function buildImage(
  description: string,
  media: PopoverMedia,
  className: string,
  index: number,
): HTMLImageElement {
  const image = document.createElement("img");
  image.className = className;
  image.src = mediaSource(media);
  image.alt = description;
  image.decoding = "async";
  image.width = typeof media === "string" ? POPOVER_IMAGE_WIDTH : media.width;
  image.height =
    typeof media === "string" ? POPOVER_IMAGE_HEIGHT : media.height;
  if (index > 0) image.loading = "lazy";
  return image;
}

function buildVideo(
  description: string,
  src: string,
  className: string,
  prefix: string,
  autoPlay: boolean,
  isCarouselItem: boolean,
): HTMLElement {
  const video = document.createElement("video");
  video.className = className;
  video.src = src;
  video.autoplay = autoPlay;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("aria-label", description);
  video.setAttribute("title", description);
  video.setAttribute("role", "img");
  if (autoPlay) return video;

  const wrapper = document.createElement("div");
  wrapper.className = `${prefix}-vid-wrap`;
  if (isCarouselItem) {
    wrapper.classList.add(`${prefix}-carousel-item`);
    video.classList.remove(`${prefix}-carousel-item`);
  }

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.className = `${prefix}-play-btn`;
  playButton.setAttribute("aria-label", "Play video");
  playButton.innerHTML = ICON_PLAY;

  const togglePlay = (): void => {
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };
  video.addEventListener("click", togglePlay);
  video.style.cursor = "pointer";
  playButton.addEventListener("click", togglePlay);
  video.addEventListener("play", () => playButton.classList.add("playing"));
  video.addEventListener("pause", () => playButton.classList.remove("playing"));

  wrapper.append(video, playButton);
  return wrapper;
}

function buildMediaElement(
  data: PopoverData,
  prefix: string,
  media: PopoverMedia,
  {
    autoPlay = true,
    index = 0,
    isCarouselItem = false,
    total = 1,
  }: MediaElementOptions = {},
): HTMLElement {
  const video = isVideo(media);
  const baseClass = video ? `${prefix}-vid` : `${prefix}-img`;
  const className = isCarouselItem
    ? `${baseClass} ${prefix}-carousel-item`
    : baseClass;
  const description = describeMedia(data, index, total);

  return video
    ? buildVideo(
        description,
        mediaSource(media),
        className,
        prefix,
        autoPlay,
        isCarouselItem,
      )
    : buildImage(description, media, className, index);
}

export function nearestSlideIndex(
  scrollLeft: number,
  slideOffsets: readonly number[],
): number {
  if (slideOffsets.length === 0) return 0;
  const origin = slideOffsets[0];
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  slideOffsets.forEach((offset, index) => {
    const distance = Math.abs(scrollLeft - (offset - origin));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function buildCarousel(
  data: PopoverData,
  prefix: string,
  mediaList: PopoverMedia[],
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `${prefix}-carousel-wrap`;

  const inner = document.createElement("div");
  inner.className = `${prefix}-carousel-inner`;
  const carousel = document.createElement("div");
  carousel.className = `${prefix}-carousel`;
  inner.appendChild(carousel);
  wrapper.appendChild(inner);

  mediaList.forEach((media, index) => {
    const slide = document.createElement("div");
    slide.className = `${prefix}-carousel-slide`;
    slide.appendChild(
      buildMediaElement(data, prefix, media, {
        autoPlay: index !== 0,
        index,
        isCarouselItem: true,
        total: mediaList.length,
      }),
    );
    carousel.appendChild(slide);
  });

  let currentIndex = 0;
  const dots = document.createElement("div");
  dots.className = `${prefix}-carousel-dots`;

  const syncDots = (): void => {
    Array.from(dots.children).forEach((dot, index) => {
      dot.classList.toggle("active", index === currentIndex);
    });
  };

  const setActiveIndex = (index: number, scroll: boolean): void => {
    currentIndex = Math.max(0, Math.min(mediaList.length - 1, index));
    if (scroll) {
      const slides = Array.from(carousel.children) as HTMLElement[];
      const first = slides[0];
      const target = slides[currentIndex];
      if (first && target) {
        carousel.scrollTo({
          left: target.offsetLeft - first.offsetLeft,
          behavior: "smooth",
        });
      }
    }
    syncDots();
  };

  const createNavButton = (direction: "prev" | "next"): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${prefix}-carousel-nav ${direction}`;
    button.setAttribute(
      "aria-label",
      direction === "prev" ? "Previous slide" : "Next slide",
    );
    button.innerHTML =
      direction === "prev" ? ICON_CHEVRON_PREV : ICON_CHEVRON_NEXT;
    button.addEventListener("click", () => {
      const step = direction === "prev" ? -1 : 1;
      const count = mediaList.length;
      setActiveIndex((currentIndex + step + count) % count, true);
    });
    return button;
  };

  inner.append(createNavButton("prev"), createNavButton("next"));

  mediaList.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `${prefix}-carousel-dot` + (index === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
    dot.addEventListener("click", () => setActiveIndex(index, true));
    dots.appendChild(dot);
  });
  wrapper.appendChild(dots);

  carousel.addEventListener(
    "scroll",
    () => {
      const offsets = Array.from(
        carousel.children,
        (slide) => (slide as HTMLElement).offsetLeft,
      );
      setActiveIndex(nearestSlideIndex(carousel.scrollLeft, offsets), false);
    },
    { passive: true },
  );

  return wrapper;
}

export function buildMediaContent(
  data: PopoverData,
  prefix: string,
  mediaList: PopoverMedia[],
  wrapSingle: boolean,
): HTMLElement | null {
  if (mediaList.length === 0) return null;
  if (mediaList.length > 1) return buildCarousel(data, prefix, mediaList);

  const media = buildMediaElement(data, prefix, mediaList[0], {
    autoPlay: false,
  });
  if (!wrapSingle) return media;

  const wrapper = document.createElement("div");
  wrapper.className = `${prefix}-media`;
  wrapper.appendChild(media);
  return wrapper;
}
