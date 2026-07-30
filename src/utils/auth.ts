// ── Auth/session constants ────────────────────────────────────────────────────
// Shared by the middleware gate (src/middleware.ts) and the login page
// (src/pages/login.astro) so the load-bearing cookie name and the security
// header set have a single definition and can't drift.
import { timingSafeEqual } from "node:crypto";

/** Name of the HttpOnly session cookie set on successful login. */
export const SESSION_COOKIE_NAME = "portfolio_session";

/** Security headers applied to every authenticated response. */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

/** Resolves the server-only password consistently in middleware and pages. */
export function readSitePassword(): string | undefined {
  return process.env.SITE_PASSWORD || import.meta.env.SITE_PASSWORD;
}

/** Constant-time UTF-8 comparison with a safe unequal-length guard. */
export function safeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}
