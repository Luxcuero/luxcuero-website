import {urlFor} from './image'

/* JSON-LD builders. Everything here reads from Sanity so the client can correct a phone
   number or add a service area in the Studio without anyone touching code.
   Each builder returns null when its inputs are missing, and Layout drops the nulls —
   emitting a half-populated entity is worse than emitting none. */

const SITE = 'https://www.luxcuero.com'

function imageUrl(source: unknown, size = 1200): string | null {
  const image = source as {asset?: unknown} | null | undefined
  if (!image?.asset) return null
  return urlFor(image as never).width(size).auto('format').url()
}

/**
 * The business itself, emitted once on the home page.
 *
 * ProfessionalService rather than plain LocalBusiness: LuxCuero has no storefront, it
 * travels to the customer, so the entity is defined by the areas it covers rather than
 * by a street address.
 */
export function localBusiness(settings: any) {
  if (!settings?.siteName) return null

  const logo = imageUrl(settings.logo, 600)
  const sameAs = (settings.socialLinks ?? [])
    .map((link: any) => link?.url)
    .filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE}/#business`,
    name: settings.siteName,
    url: SITE,
    ...(settings.footerDescription ? {description: settings.footerDescription} : {}),
    ...(logo ? {logo, image: logo} : {}),
    ...(settings.phoneDisplay ? {telephone: settings.phoneDisplay.replace(/\s+/g, '')} : {}),
    ...(settings.email ? {email: settings.email} : {}),
    ...(sameAs.length ? {sameAs} : {}),
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Buenos Aires',
      addressCountry: 'AR',
    },
    areaServed: [
      'Ciudad Autónoma de Buenos Aires',
      'Zona Norte, Buenos Aires',
      'Nordelta',
      'Pilar',
      'San Isidro',
      'Beccar',
      'Martínez',
    ].map((name) => ({'@type': 'Place', name})),
    knowsLanguage: 'es-AR',
  }
}

/** Q&A pairs from a page's FAQ section. */
export function faqPage(items: any[] | null | undefined) {
  const questions = (items ?? []).filter((item) => item?.question && item?.answer)
  if (!questions.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {'@type': 'Answer', text: item.answer},
    })),
  }
}

/** A blog post. */
export function article(post: any, settings: any) {
  if (!post?.title) return null

  const cover = imageUrl(post.seo?.shareImage ?? post.cover)
  const logo = imageUrl(settings?.logo, 600)

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.seo?.description ?? post.excerpt
      ? {description: post.seo?.description ?? post.excerpt}
      : {}),
    ...(cover ? {image: cover} : {}),
    ...(post.publishedAt ? {datePublished: post.publishedAt} : {}),
    /* Falls back to the publish date: a post that was never edited was last modified
       when it went out. */
    dateModified: post._updatedAt ?? post.publishedAt,
    mainEntityOfPage: {'@type': 'WebPage', '@id': `${SITE}/blog/${post.slug}`},
    ...(post.author?.name ? {author: {'@type': 'Person', name: post.author.name}} : {}),
    publisher: {
      '@type': 'Organization',
      name: settings?.siteName ?? 'LuxCuero',
      ...(logo ? {logo: {'@type': 'ImageObject', url: logo}} : {}),
    },
  }
}

/** Trail of {name, path} pairs, root first. */
export function breadcrumbs(trail: {name: string; path: string}[]) {
  if (!trail?.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${SITE}${crumb.path}`,
    })),
  }
}
