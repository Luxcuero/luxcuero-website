import {defineQuery} from 'groq'

/* `defineQuery` is a tagged identity function — it returns the string unchanged, but
   marks it so Sanity TypeGen can generate a result type for each query. */

/* Links are polymorphic, so every projection that renders one needs the same shape.
   Internal links resolve the referenced page's slug here so the frontend never has to
   make a second round trip to build an href. */
const LINK_FRAGMENT = `
  kind,
  anchor,
  path,
  url,
  openInNewTab,
  "pageSlug": page->slug.current
`

const CTA_FRAGMENT = `
  _key,
  label,
  style,
  link{${LINK_FRAGMENT}}
`

const IMAGE_FRAGMENT = `
  asset,
  hotspot,
  crop,
  alt
`

/** Global chrome: header, footer, WhatsApp button. */
export const SITE_SETTINGS_QUERY = defineQuery(`
  *[_id == "siteSettings"][0]{
    siteName,
    logo{${IMAGE_FRAGMENT}},
    footerLogo{${IMAGE_FRAGMENT}},
    whatsappNumber,
    whatsappMessage,
    email,
    phoneDisplay,
    navLinks[]{_key, label, link{${LINK_FRAGMENT}}},
    headerCta{${CTA_FRAGMENT}},
    footerDescription,
    socialLinks[]{_key, platform, url},
    footerColumns[]{
      _key,
      heading,
      headingLink{${LINK_FRAGMENT}},
      links[]{_key, label, link{${LINK_FRAGMENT}}}
    },
    copyright,
    defaultSeo,
    sliderLogo{${IMAGE_FRAGMENT}},
    blog{
      heading,
      tagline,
      coverImage{${IMAGE_FRAGMENT}},
      titleSuffix,
      searchPlaceholder,
      searchLabel,
      emptyState,
      countSingular,
      countPlural,
      tagDescription
    },
    post{
      byLabel,
      jumpToContent,
      breadcrumbLabel,
      shareHeading,
      tagsHeading,
      nextLabel,
      noComments,
      commentsCtaLabel,
      commentsCtaSuffix,
      commentsEmpty,
      shareTargets[]{_key, platform, label}
    },
    ui
  }
`)

/* `_key` and `_type` are projected on every section: `_type` drives which component
   renders it, `_key` is the stable React/Astro key and what Visual Editing would use to
   target a section. */
export const PAGE_QUERY = defineQuery(`
  *[_type == "page" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    transparentHeader,
    seo,
    pageBuilder[]{
      _key,
      _type,

      _type == "heroSection" => {
        variant, eyebrow, kicker, headline, subheadline, body, checklist, wideContent,
        backgroundImage{${IMAGE_FRAGMENT}},
        mediaImage{${IMAGE_FRAGMENT}},
        trustItems[]{_key, label, icon{${IMAGE_FRAGMENT}}},
        ctas[]{${CTA_FRAGMENT}}
      },

      _type == "titleBand" => { heading, subheadings, accent },

      _type == "trustBar" => {
        background,
        items[]{_key, label, icon{${IMAGE_FRAGMENT}}}
      },

      _type == "serviceCardGrid" => {
        layout, eyebrow, heading, readMoreLabel, background,
        cards[]{
          _key, title, description,
          image{${IMAGE_FRAGMENT}},
          link{${LINK_FRAGMENT}}
        }
      },

      _type == "beforeAfterGallery" => {
        eyebrow, heading, tagline, columns, anchorId, background,
        items[]{
          _key, caption,
          before{${IMAGE_FRAGMENT}},
          after{${IMAGE_FRAGMENT}}
        }
      },

      _type == "stepList" => {
        eyebrow, heading, tagline, background,
        steps[]{
          _key, title, description,
          icon{${IMAGE_FRAGMENT}},
          illustration{${IMAGE_FRAGMENT}}
        }
      },

      _type == "featureGrid" => {
        layout, eyebrow, heading, body, background,
        link{${CTA_FRAGMENT}},
        items[]{
          _key, title, description, iconType, glyph,
          image{${IMAGE_FRAGMENT}}
        }
      },

      _type == "faqSection" => {
        heading, lead, layout, background,
        shapeImage{${IMAGE_FRAGMENT}},
        items[]{_key, question, answer}
      },

      _type == "ctaBand" => {
        eyebrow, heading, body, imageShape, prominentHeading, background,
        image{${IMAGE_FRAGMENT}},
        ctas[]{${CTA_FRAGMENT}}
      },

      _type == "contactFormSection" => {
        heading, lead, variant, footnote, background,
        submitLabel,
        fields[]{
          _key, label, name, inputType, placeholder, required,
          rows, options, optionsLayout, helpText, halfWidth
        },
        stepsHeading,
        sideNote,
        steps[]{_key, title, description, icon{${IMAGE_FRAGMENT}}},
        asideImage{${IMAGE_FRAGMENT}},
        shapeImage{${IMAGE_FRAGMENT}}
      },

      _type == "richTextSection" => {
        heading, headingStyle, background,
        content[]{
          ...,
          _type == "figure" => {${IMAGE_FRAGMENT}}
        }
      }
    }
  }
`)

/** Every page slug, for generating static routes. */
export const PAGE_SLUGS_QUERY = defineQuery(`
  *[_type == "page" && defined(slug.current)].slug.current
`)

/** Blog index cards, newest first. */
export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    cover{${IMAGE_FRAGMENT}},
    author->{name, avatar{${IMAGE_FRAGMENT}}},
    tags[]->{_id, label, "slug": slug.current}
  }
`)

export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    subtitle,
    "slug": slug.current,
    excerpt,
    publishedAt,
    // Feeds dateModified on the BlogPosting schema.
    _updatedAt,
    seo,
    cover{${IMAGE_FRAGMENT}},
    author->{name, avatar{${IMAGE_FRAGMENT}}},
    tags[]->{_id, label, "slug": slug.current},
    body[]{
      ...,
      _type == "figure" => {${IMAGE_FRAGMENT}},
      _type == "pictureBlock" => {
        ...,
        image{${IMAGE_FRAGMENT}}
      },
      _type == "masonryBlock" => {
        ...,
        items[]{
          ...,
          image{${IMAGE_FRAGMENT}}
        }
      }
    }
  }
`)

/** Posts carrying a given tag, for /blog/tag/[tag]. */
export const POSTS_BY_TAG_QUERY = defineQuery(`
  *[_type == "tag" && slug.current == $slug][0]{
    label,
    "slug": slug.current,
    "posts": *[_type == "post" && references(^._id)] | order(publishedAt desc){
      _id,
      title,
      "slug": slug.current,
      excerpt,
      publishedAt,
      cover{${IMAGE_FRAGMENT}},
      author->{name, avatar{${IMAGE_FRAGMENT}}},
      tags[]->{_id, label, "slug": slug.current}
    }
  }
`)

/* The fields of the enquiry form on a given page.

   /api/contact reads the definition rather than trusting the submission: the browser
   sends names and values, and this is what turns them back into the labels the email
   shows — and what decides which names are accepted at all. */
export const CONTACT_FORM_QUERY = defineQuery(`
  *[_type == "page" && slug.current == $slug][0]
    .pageBuilder[_type == "contactFormSection"][0]{
      heading,
      fields[]{label, name, inputType, required}
    }
`)
