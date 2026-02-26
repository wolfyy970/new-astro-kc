import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com', // placeholder — update when domain is known
  integrations: [sitemap()],
});
