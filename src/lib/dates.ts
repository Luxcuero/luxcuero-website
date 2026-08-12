/* The markdown these posts came from stored two pre-rendered Spanish dates —
   "20 may 2026" on the index card and "20 de mayo de 2026" in the byline. Sanity keeps a
   single `publishedAt` instant and both forms are derived here, so a date can never
   disagree with itself.

   Built with explicit month tables rather than Intl: Node's ICU build varies by platform,
   and abbreviated Spanish months differ between them ("may" vs "may."). */

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/* The dates were authored as plain calendar days (pubDate: 2026-05-20) and stored as
   UTC midnight. Reading them back in local time would shift them a day west of GMT, so
   the UTC parts are what get formatted. */
function parts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return {day: date.getUTCDate(), month: date.getUTCMonth(), year: date.getUTCFullYear()}
}

/** "29 may 2026" — the blog index card. */
export function dateShort(value: string | Date): string {
  const {day, month, year} = parts(value)
  return `${day} ${MONTHS_SHORT[month]} ${year}`
}

/** "29 de mayo de 2026" — the post byline. */
export function dateLong(value: string | Date): string {
  const {day, month, year} = parts(value)
  return `${day} de ${MONTHS_LONG[month]} de ${year}`
}

/** ISO day, for <time datetime>. */
export function dateISO(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10)
}
