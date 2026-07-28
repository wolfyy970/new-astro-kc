import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "astro:middleware": resolve(__dirname, "./src/mocks/astro-middleware.ts"),
    },
  },
});
