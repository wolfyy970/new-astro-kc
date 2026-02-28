import { defineMiddleware } from "astro:middleware";

const ASSET_EXT = /\.(jpg|jpeg|png|webp|gif|svg|ico|mp4|webm|css|js|mjs|woff2?|txt|xml|json)$/i;

function safeEqual(a: string, b: string): boolean {
    const enc = new TextEncoder();
    const ab = enc.encode(a);
    const bb = enc.encode(b);
    if (ab.length !== bb.length) return false;
    let diff = 0;
    for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
    return diff === 0;
}

export const onRequest = defineMiddleware(async (context, next) => {
    const { url, cookies, redirect } = context;

    // 1. Skip password check for login page and static assets
    const isLoginPage = url.pathname === "/login";
    const isPublicAsset = ASSET_EXT.test(url.pathname) || url.pathname.startsWith("/_astro");

    if (isLoginPage || isPublicAsset) {
        return next();
    }

    // 2. Require SITE_PASSWORD to be configured — fail closed if absent
    const password = process.env.SITE_PASSWORD || import.meta.env.SITE_PASSWORD;
    if (!password) {
        return new Response("Service unavailable", { status: 503 });
    }

    // 3. Validate session cookie with constant-time comparison
    const session = cookies.get("portfolio_session")?.value ?? "";

    if (safeEqual(session, password)) {
        const response = await next();
        response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");
        response.headers.set("X-Content-Type-Options", "nosniff");
        response.headers.set("X-Frame-Options", "DENY");
        response.headers.set("Referrer-Policy", "no-referrer");
        return response;
    }

    // 4. Not authenticated: redirect to login
    return redirect("/login");
});
