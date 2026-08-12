/** The link shape every query projects, via LINK_FRAGMENT in queries.ts. */
export type ResolvedLink = {
  kind?: 'internal' | 'path' | 'external' | null
  anchor?: string | null
  path?: string | null
  url?: string | null
  openInNewTab?: boolean | null
  pageSlug?: string | null
} | null

/**
 * Turn a Sanity link into an href.
 *
 * The home page is stored with the slug "/" so it sorts and reads sensibly in the
 * Studio; every other page is a bare slug that needs the leading slash added here.
 *
 * Pass `currentPath` so a link into the page you are already on renders as a bare
 * fragment. Without it the anchor still resolves, but the browser treats it as a
 * navigation rather than an in-page scroll.
 */
export function hrefFor(link: ResolvedLink, currentPath?: string): string {
  if (!link) return '#'

  if (link.kind === 'external') return link.url ?? '#'
  if (link.kind === 'path') return link.path ?? '#'

  if (!link.pageSlug) return '#'
  const base = link.pageSlug === '/' ? '/' : `/${link.pageSlug}`
  if (!link.anchor) return base

  /* The anchor is stored exactly as it appears in the target's `id`, so it is written
     through untouched — encoding it here would double-encode ids that already contain
     percent escapes, and the link would stop matching. */
  const samePage = currentPath === base || (base !== '/' && currentPath === `${base}/`)
  return samePage ? `#${link.anchor}` : `${base}#${link.anchor}`
}

/** Attributes an external link needs so it can't reach back into this tab. */
export function linkAttrs(link: ResolvedLink) {
  return link?.kind === 'external' && link.openInNewTab
    ? {target: '_blank', rel: 'noopener noreferrer'}
    : {}
}

/** Rebuild the WhatsApp deep link from the number and message on siteSettings. */
export function whatsappHref(number?: string | null, message?: string | null): string {
  if (!number) return '#'
  const text = encodeURIComponent(message ?? '').replace(/%20/g, '+')
  return `https://api.whatsapp.com/send/?phone=${number}&text=${text}&type=phone_number&app_absent=0`
}
