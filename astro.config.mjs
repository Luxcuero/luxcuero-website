// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

/* This file runs before Astro wires up import.meta.env, and `vite` is not a direct
   dependency so its loadEnv is not importable under pnpm. Node's own .env loader covers
   local builds; on Vercel the variables are already in the environment and the file is
   simply absent. */
try {
  process.loadEnvFile();
} catch {
  // No .env on disk — expected in CI and on Vercel.
}
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = process.env;

/* Last-modified dates for the sitemap, keyed by pathname.

   <lastmod> is a recrawl hint: it tells Google which URLs actually changed so it
   re-checks those instead of crawling everything on a fixed schedule. The dates live in
   Sanity, and the sitemap integration has no access to the loaders the pages use, so
   fetch them here. A failure must not break the build — the sitemap is simply emitted
   without dates, which is still valid. */
async function fetchLastmod() {
  const query = `*[_type in ["page", "post"] && defined(slug.current)]{_type, "slug": slug.current, _updatedAt}`;
  const url =
    `https://${PUBLIC_SANITY_PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/` +
    `${PUBLIC_SANITY_DATASET}?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sanity returned ${response.status}`);
    const {result} = await response.json();

    const map = new Map();
    for (const doc of result ?? []) {
      const path =
        doc._type === 'post'
          ? `/blog/${doc.slug}`
          : doc.slug === '/'
            ? '/'
            : `/${doc.slug}`;
      map.set(path, doc._updatedAt);
    }

    /* The blog index has no document of its own; it is as fresh as its newest post. */
    const newestPost = (result ?? [])
      .filter((doc) => doc._type === 'post')
      .map((doc) => doc._updatedAt)
      .sort()
      .pop();
    if (newestPost) map.set('/blog', newestPost);

    return map;
  } catch (error) {
    console.warn(`[sitemap] could not load lastmod dates, emitting without them: ${error.message}`);
    return new Map();
  }
}

const lastmodByPath = await fetchLastmod();

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

        const lastmod = lastmodByPath.get(url.pathname);
        return {...item, url: url.href, ...(lastmod ? {lastmod} : {})};
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
