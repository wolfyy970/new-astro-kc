import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

export default defineConfig({
  // placeholder — update when domain is known
  site: 'https://example.com',

  output: 'server',
  integrations: [],
  adapter: vercel(),
});