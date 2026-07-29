// ── Context-preserving case-study return ─────────────────────────────────────
// The case-study shell cannot use document.referrer to decide whether its Back
// control should call history.back(): the site intentionally sends a
// `Referrer-Policy: no-referrer` header. A short-lived sessionStorage hand-off
// marks same-tab project-link navigations from the résumé instead.

const STORAGE_KEY = "kc:resume-return";
const MAX_CONTEXT_AGE_MS = 30 * 60 * 1000;
const HISTORY_STATE_KEY = "kcResumeReturn";
const VIEW_STATE_KEY = "kcResumeView";

interface ResumeReturnContext {
  destinationPath: string;
  createdAt: number;
}

interface ResumeViewState {
  /** Which note surface the reader left from — sheet, bound-in, or margin. */
  surface: "popover" | "inset" | "margin";
  popoverKey: string;
  popoverScrollTop: number;
  carouselIndex: number;
}

interface NavigationLocation {
  href: string;
  origin: string;
  pathname: string;
}

interface NavigationHistory {
  length: number;
  state: unknown;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
  back(): void;
}

interface NavigationEnvironment {
  document: Document;
  history: NavigationHistory;
  location: NavigationLocation;
  storage: Storage;
  now: () => number;
}

function getBrowserEnvironment(): NavigationEnvironment {
  return {
    document,
    history: window.history,
    location: window.location,
    storage: window.sessionStorage,
    now: Date.now,
  };
}

function isPlainPrimaryClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function readContext(
  storage: Storage,
  now: number,
): ResumeReturnContext | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ResumeReturnContext>;
    const isValid =
      typeof parsed.destinationPath === "string" &&
      typeof parsed.createdAt === "number" &&
      now - parsed.createdAt >= 0 &&
      now - parsed.createdAt <= MAX_CONTEXT_AGE_MS;

    if (!isValid) storage.removeItem(STORAGE_KEY);
    return isValid ? (parsed as ResumeReturnContext) : null;
  } catch {
    // Navigation should remain functional if storage is unavailable or corrupt.
    return null;
  }
}

function hasReturnState(history: NavigationHistory): boolean {
  return (
    typeof history.state === "object" &&
    history.state !== null &&
    (history.state as Record<string, unknown>)[HISTORY_STATE_KEY] === true
  );
}

function getObjectState(history: NavigationHistory): Record<string, unknown> {
  return typeof history.state === "object" && history.state !== null
    ? { ...(history.state as Record<string, unknown>) }
    : {};
}

function captureResumeView(link: HTMLAnchorElement): ResumeViewState | null {
  // The project link can live on any of the three note surfaces. Each carries
  // its key differently, but all reopen the same way: click the marked term
  // and let the current tier route it.
  const container = link.closest<HTMLElement>(
    ".popover, .inset-note, .scroll-annotation",
  );
  if (!container) return null;

  const surface: ResumeViewState["surface"] = container.classList.contains(
    "scroll-annotation",
  )
    ? "margin"
    : container.classList.contains("inset-note")
      ? "inset"
      : "popover";

  const popoverKey =
    surface === "margin"
      ? container.dataset.annotationKey
      : container.dataset.popoverKey;
  if (!popoverKey) return null;

  const dots = Array.from(
    container.querySelectorAll<HTMLElement>(
      ".popover-carousel-dot, .sa-carousel-dot",
    ),
  );
  const activeIndex = dots.findIndex((dot) => dot.classList.contains("active"));

  return {
    surface,
    popoverKey,
    popoverScrollTop:
      container.querySelector<HTMLElement>(".popover-scroll")?.scrollTop ?? 0,
    carouselIndex: Math.max(0, activeIndex),
  };
}

function rememberResumeView(
  link: HTMLAnchorElement,
  history: NavigationHistory,
  location: NavigationLocation,
): void {
  const state = getObjectState(history);
  delete state[VIEW_STATE_KEY];

  const view = captureResumeView(link);
  if (view) state[VIEW_STATE_KEY] = view;

  try {
    history.replaceState(state, "", location.href);
  } catch {
    // History state is an enhancement; native scroll restoration still works.
  }
}

/** Records a same-tab project navigation before the browser leaves the résumé. */
export function rememberResumeReturn(
  destination: URL,
  storage: Storage,
  now: number,
): void {
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        destinationPath: destination.pathname,
        createdAt: now,
      } satisfies ResumeReturnContext),
    );
  } catch {
    // The normal link remains a complete fallback when storage is unavailable.
  }
}

/**
 * Delegates from document because both margin-note and popover links are
 * generated after the initial page render.
 */
export function initResumeReturnTracking(
  environment: NavigationEnvironment = getBrowserEnvironment(),
): () => void {
  const { document: documentEl, history, location, storage, now } = environment;

  const handleClick = (event: MouseEvent): void => {
    if (!isPlainPrimaryClick(event)) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>(".popover-link, .sa-link");
    if (!link || (link.target && link.target !== "_self")) return;

    const destination = new URL(
      link.getAttribute("href") ?? link.href,
      location.href,
    );
    if (destination.origin !== location.origin) return;

    rememberResumeView(link, history, location);
    rememberResumeReturn(destination, storage, now());
  };

  documentEl.addEventListener("click", handleClick);
  return () => documentEl.removeEventListener("click", handleClick);
}

/**
 * Converts the case-study Back link into true browser history navigation only
 * when a matching résumé link created this case-study visit. Direct visitors
 * keep the link's ordinary `href="/"` fallback.
 */
export function initCaseStudyBackNavigation(
  environment: NavigationEnvironment = getBrowserEnvironment(),
): () => void {
  const { document: documentEl, history, location, storage, now } = environment;
  const backLink =
    documentEl.querySelector<HTMLAnchorElement>("[data-resume-back]");
  if (!backLink) return () => {};

  const pending = readContext(storage, now());
  if (pending?.destinationPath === location.pathname && history.length > 1) {
    const currentState = getObjectState(history);
    history.replaceState(
      { ...currentState, [HISTORY_STATE_KEY]: true },
      "",
      location.href,
    );
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // The history-state marker is already installed; cleanup is optional.
    }
  }

  const handleBack = (event: MouseEvent): void => {
    if (
      !isPlainPrimaryClick(event) ||
      history.length <= 1 ||
      !hasReturnState(history)
    ) {
      return;
    }

    event.preventDefault();
    history.back();
  };

  backLink.addEventListener("click", handleBack);
  return () => backLink.removeEventListener("click", handleBack);
}

/**
 * Reconstructs the open note only when the résumé had to be rebuilt during
 * Back navigation. Browser-native scroll restoration handles the document
 * position; this restores the transient UI that a reload would otherwise
 * discard. The stored surface is advisory — the reader may have resized while
 * away, so the restore simply clicks the stored term and lets the CURRENT
 * tier route it: margin unfold, bound-in note, or sheet.
 */
export function restoreResumeReturnView(
  environment: Pick<NavigationEnvironment, "document" | "history"> = {
    document,
    history: window.history,
  },
): void {
  const state = getObjectState(environment.history);
  const view = state[VIEW_STATE_KEY] as Partial<ResumeViewState> | undefined;

  const knownSurface =
    view?.surface === "popover" ||
    view?.surface === "inset" ||
    view?.surface === "margin";

  if (
    !knownSurface ||
    typeof view?.popoverKey !== "string" ||
    environment.document.querySelector(".popover.visible") ||
    environment.document.querySelector(".inset-note") ||
    environment.document.querySelector(".scroll-annotation.is-expanded")
  ) {
    return;
  }

  const hotspot = Array.from(
    environment.document.querySelectorAll<HTMLElement>(".hotspot"),
  ).find((candidate) => candidate.dataset.popover === view.popoverKey);
  if (!hotspot) return;

  hotspot.click();

  requestAnimationFrame(() => {
    const container = environment.document.querySelector<HTMLElement>(
      ".popover.visible, .inset-note, .scroll-annotation.is-expanded",
    );
    if (!container) return;

    const scrollRegion =
      container.querySelector<HTMLElement>(".popover-scroll");
    if (scrollRegion && typeof view.popoverScrollTop === "number") {
      scrollRegion.scrollTop = view.popoverScrollTop;
    }

    const dots = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        ".popover-carousel-dot, .sa-carousel-dot",
      ),
    );
    if (
      typeof view.carouselIndex === "number" &&
      view.carouselIndex > 0 &&
      view.carouselIndex < dots.length
    ) {
      dots[view.carouselIndex]?.click();
    }
  });
}

export const resumeReturnInternals = {
  HISTORY_STATE_KEY,
  MAX_CONTEXT_AGE_MS,
  STORAGE_KEY,
  VIEW_STATE_KEY,
};
