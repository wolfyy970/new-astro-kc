// ── Main client entry point ───────────────────────────────────────────────────
// Owns the lifetime of the résumé's client-side systems. Initializers return
// disposers so hot reloads and future page transitions cannot accumulate
// observers, global listeners, timers, or stale surface state.

import type { PopoverMap } from "../types/content.ts";
import { requireGlobal } from "./dom.ts";
import { cleanupPopoverEngine, initPopoverEngine } from "./popover-engine.ts";
import {
  cleanupAnnotations,
  initAnnotationEngine,
} from "./annotation-engine.ts";
import {
  initResumeReturnTracking,
  restoreResumeReturnView,
} from "./return-to-resume.ts";
import { CLS_VISIBLE, REVEAL_THRESHOLD, SEL_REVEAL } from "./constants.ts";

function bootResumeInteractions(popovers: PopoverMap): () => void {
  const stopReturnTracking = initResumeReturnTracking();
  document.documentElement.classList.add("js-reveal");

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add(CLS_VISIBLE);
      });
    },
    { threshold: REVEAL_THRESHOLD },
  );
  document
    .querySelectorAll(SEL_REVEAL)
    .forEach((element) => revealObserver.observe(element));

  let innerFrame = 0;
  const outerFrame = requestAnimationFrame(() => {
    innerFrame = requestAnimationFrame(() => {
      initPopoverEngine(popovers);
      initAnnotationEngine(popovers);
      restoreResumeReturnView();
    });
  });

  return () => {
    cancelAnimationFrame(outerFrame);
    cancelAnimationFrame(innerFrame);
    revealObserver.disconnect();
    stopReturnTracking();
    cleanupPopoverEngine();
    cleanupAnnotations();
  };
}

const dispose = bootResumeInteractions(requireGlobal("__POPOVERS__", "main"));
if (import.meta.hot) import.meta.hot.dispose(dispose);
