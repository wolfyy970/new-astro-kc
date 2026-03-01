import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  security: {
    checkOrigin: false,
  },
  integrations: [],
  adapter: vercel(),
});