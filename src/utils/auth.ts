// ── Auth/session constants ────────────────────────────────────────────────────
// Shared by the middleware gate (src/middleware.ts) and the login page
// (src/pages/login.astro) so the load-bearing cookie name and the security
// header set have a single definition and can't drift.

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
