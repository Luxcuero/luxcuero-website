// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Canonical origin, used to build absolute share links on blog posts.
  site: 'https://www.luxcuero.com',
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()]
  }
});