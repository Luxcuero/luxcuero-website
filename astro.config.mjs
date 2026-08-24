// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Canonical origin, used to build absolute share links on blog posts.
  site: 'https://www.luxcuero.com',
  // Both /servicios and /servicios/ serve the same page, so pick one form and stick to
  // it — the canonical tags in Layout.astro emit the same shape the sitemap does.
  trailingSlash: 'never',
  devToolbar: {
    enabled: false
  },
  integrations: [
    sitemap({
      // Tag pages are one-post archives; they add crawl paths without adding content.
      filter: (page) => !page.includes('/blog/tag/'),
      serialize: (item) => {
        // @astrojs/sitemap appends a slash to every route; strip it so the sitemap, the
        // canonical tags and the site's own internal links all name the same URL. The
        // root stays "/" — an origin with an empty path is the one case that keeps it.
        const url = new URL(item.url);
        if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
        return {...item, url: url.href};
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
