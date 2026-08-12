import {createImageUrlBuilder} from '@sanity/image-url'
import type {SanityImageSource} from '@sanity/image-url/lib/types/types'

import {sanityClient} from './sanity'

const builder = createImageUrlBuilder(sanityClient)

/**
 * Build a CDN URL for a Sanity image.
 *
 * Chain the transforms the placement needs, e.g. the blog card's fixed box:
 *   urlFor(post.cover).width(622).height(292).fit('crop').auto('format').url()
 *
 * `.fit('crop')` honours the hotspot set in the Studio, which is why every image field
 * in the schema enables hotspot — the site crops to several fixed ratios.
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

/** Alt text, falling back to empty so decorative images stay decorative. */
export function altFor(source: {alt?: string} | null | undefined): string {
  return source?.alt ?? ''
}
