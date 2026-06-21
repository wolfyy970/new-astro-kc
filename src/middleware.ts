import { defineMiddleware } from "astro:middleware";
import { timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE_NAME, SECURITY_HEADERS } from "./utils/auth.ts";
import { VIDEO_EXTENSIONS } from "./scripts/constants.ts";

// Static assets bypass the auth gate. The video extensions are sourced from the
// shared VIDEO_EXTENSIONS so the gate and the image optimizer can't drift.
const VIDEO_EXT = VIDEO_EXTENSIONS.map((ext) => ext.replace(/^\./, "")).join("|");
const ASSET_EXT = new RegExp(
  `\\.(jpg|jpeg|png|webp|gif|svg|ico|${VIDEO_EXT}|css|js|mjs|woff2?|txt|xml|json)$`,
  "i",
);

/**
 * Constant-time string comparison. Returns false on length mismatch (which also
 * sidesteps timingSafeEqual throwing on unequal-length buffers) and otherwise
 * delegates to the vetted Node primitive.
 */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;

  // 1. Skip password check for login page and static assets
  const isLoginPage = url.pathname === "/login";
  const isPublicAsset =
    ASSET_EXT.test(url.pathname) || url.pathname.startsWith("/_astro");

  if (isLoginPage || isPublicAsset) {
    return next();
  }

  // 2. Require SITE_PASSWORD to be configured — fail closed if absent
  const password = process.env.SITE_PASSWORD || import.meta.env.SITE_PASSWORD;
  if (!password) {
    return new Response("Service unavailable", { status: 503 });
  }

  // 3. Validate session cookie with constant-time comparison
  const session = cookies.get(SESSION_COOKIE_NAME)?.value ?? "";

  if (safeEqual(session, password)) {
    const response = await next();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(name, value);
    }
    return response;
  }

  // 4. Not authenticated: redirect to login
  return redirect("/login");
});
