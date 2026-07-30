import { defineConfig } from "astro/config";

import vercel from "@astrojs/vercel";

export default defineConfig({
  output: "server",
  security: {
    // Vercel's proxy host/origin combination causes Astro's built-in check to
    // reject the same-origin login form in production. The password gate,
    // SameSite cookie, and absence of authenticated state-changing endpoints
    // bound the risk; re-enable this if the deployment topology changes.
    checkOrigin: false,
  },
  integrations: [],
  adapter: vercel(),
});
