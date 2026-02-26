import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
    const { url, cookies, redirect, request } = context;

    // 1. Skip password check for login page and static assets
    const isLoginPage = url.pathname === "/login";
    const isPublicAsset = url.pathname.includes(".") || url.pathname.startsWith("/_astro");

    if (isLoginPage || isPublicAsset) {
        return next();
    }

    // 2. Check for the session cookie
    const password = process.env.SITE_PASSWORD || import.meta.env.SITE_PASSWORD;

    // If no password is set in environment, we might want to alert or allow 
    // (but for this task, we assume it's required).
    if (!password) {
        console.warn("SITE_PASSWORD Environment Variable is not set!");
        return next();
    }

    const session = cookies.get("portfolio_session")?.value;

    if (session === password) {
        const response = await next();
        // Consolidate security & privacy headers
        response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");
        return response;
    }

    // 3. Not authenticated: Redirect to login
    return redirect("/login");
});
