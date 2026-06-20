import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequest } from "./middleware";

describe("onRequest middleware authentication gate", () => {
  const originalSitePassword = process.env.SITE_PASSWORD;

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalSitePassword !== undefined) {
      process.env.SITE_PASSWORD = originalSitePassword;
    } else {
      delete process.env.SITE_PASSWORD;
    }
  });

  const mockNext = async () => {
    return new Response("Success", { headers: new Headers() });
  };

  const mockRedirect = (path: string) => {
    return new Response(`Redirect to ${path}`, { status: 302 });
  };

  it("skips password check for the /login page", async () => {
    const mockContext = {
      url: new URL("https://example.com/login"),
      cookies: {
        get: () => undefined,
      },
      redirect: mockRedirect,
    } as any;

    const response = (await onRequest(mockContext, mockNext)) as Response;
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Success");
  });

  it("skips password check for static files and _astro directory assets", async () => {
    const paths = [
      "/image.webp",
      "/_astro/chunk.js",
      "/favicon.ico",
      "/video.mp4",
      "/styles.css",
    ];
    for (const path of paths) {
      const mockContext = {
        url: new URL(`https://example.com${path}`),
        cookies: {
          get: () => undefined,
        },
        redirect: mockRedirect,
      } as any;

      const response = (await onRequest(mockContext, mockNext)) as Response;
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("Success");
    }
  });

  it("fails closed (returns 503) if SITE_PASSWORD is not configured", async () => {
    // Ensure no password is set
    delete process.env.SITE_PASSWORD;
    vi.stubEnv("SITE_PASSWORD", "");

    const mockContext = {
      url: new URL("https://example.com/some-protected-page"),
      cookies: {
        get: () => ({ value: "any-value" }),
      },
      redirect: mockRedirect,
    } as any;

    const response = (await onRequest(mockContext, mockNext)) as Response;
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toBe("Service unavailable");
  });

  it("redirects to /login if portfolio_session cookie is missing or incorrect", async () => {
    vi.stubEnv("SITE_PASSWORD", "secret_password");
    process.env.SITE_PASSWORD = "secret_password";

    // Case 1: missing cookie
    const mockContextMissing = {
      url: new URL("https://example.com/some-protected-page"),
      cookies: {
        get: () => undefined,
      },
      redirect: mockRedirect,
    } as any;

    const responseMissing = (await onRequest(mockContextMissing, mockNext)) as Response;
    expect(responseMissing.status).toBe(302);
    expect(await responseMissing.text()).toBe("Redirect to /login");

    // Case 2: incorrect cookie
    const mockContextIncorrect = {
      url: new URL("https://example.com/some-protected-page"),
      cookies: {
        get: (name: string) =>
          name === "portfolio_session"
            ? { value: "wrong_password" }
            : undefined,
      },
      redirect: mockRedirect,
    } as any;

    const responseIncorrect = (await onRequest(mockContextIncorrect, mockNext)) as Response;
    expect(responseIncorrect.status).toBe(302);
    expect(await responseIncorrect.text()).toBe("Redirect to /login");
  });

  it("allows access and injects security headers when correct password cookie is provided", async () => {
    const correctPassword = "my_secure_site_password";
    vi.stubEnv("SITE_PASSWORD", correctPassword);
    process.env.SITE_PASSWORD = correctPassword;

    const mockContext = {
      url: new URL("https://example.com/some-protected-page"),
      cookies: {
        get: (name: string) =>
          name === "portfolio_session" ? { value: correctPassword } : undefined,
      },
      redirect: mockRedirect,
    } as any;

    const response = (await onRequest(mockContext, mockNext)) as Response;
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Success");

    // Verify injected headers
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
});
