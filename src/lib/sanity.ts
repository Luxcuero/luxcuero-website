import {createClient} from '@sanity/client'

/* Astro runs on Vite, so anything a component imports can end up in the browser bundle
   and `process.env` does not exist there. Project id and dataset are publishable, so
   they use Astro's PUBLIC_ prefix and are read through import.meta.env.
   Read tokens and webhook secrets must never come through here — keep those in
   server-only modules. */
const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset = import.meta.env.PUBLIC_SANITY_DATASET

if (!projectId || !dataset) {
  throw new Error(
    'Missing PUBLIC_SANITY_PROJECT_ID or PUBLIC_SANITY_DATASET. Copy .env.example to .env.',
  )
}

export const sanityClient = createClient({
  projectId,
  dataset,
  /* Pinned. Bumping this date opts into API behaviour changes, so it should be a
     deliberate edit rather than something that drifts. */
  apiVersion: '2026-08-03',
  /* The site builds statically, so every query runs at build time against the CDN. */
  useCdn: true,
  perspective: 'published',
})
