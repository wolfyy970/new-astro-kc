import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  security: {
    checkOrigin: process.env.NODE_ENV !== 'development',
  },
  integrations: [],
  adapter: vercel(),
});