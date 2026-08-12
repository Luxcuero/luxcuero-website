import {sanityClient} from "./sanity";
import {
  PAGE_QUERY,
  PAGE_SLUGS_QUERY,
  POSTS_BY_TAG_QUERY,
  POSTS_QUERY,
  POST_QUERY,
  SITE_SETTINGS_QUERY,
} from "./queries";

/* Every route renders the header and footer, so a static build of 19 pages would
   otherwise refetch site settings 19 times. One in-flight promise is cached and shared
   for the whole build. */
let settingsPromise: Promise<any> | null = null;

export function getSiteSettings(): Promise<any> {
  settingsPromise ??= sanityClient.fetch(SITE_SETTINGS_QUERY);
  return settingsPromise;
}

export function getPage(slug: string): Promise<any> {
  return sanityClient.fetch(PAGE_QUERY, {slug});
}

export function getPageSlugs(): Promise<string[]> {
  return sanityClient.fetch(PAGE_SLUGS_QUERY);
}

export function getPosts(): Promise<any[]> {
  return sanityClient.fetch(POSTS_QUERY);
}

export function getPost(slug: string): Promise<any> {
  return sanityClient.fetch(POST_QUERY, {slug});
}

export function getPostsByTag(slug: string): Promise<any> {
  return sanityClient.fetch(POSTS_BY_TAG_QUERY, {slug});
}
