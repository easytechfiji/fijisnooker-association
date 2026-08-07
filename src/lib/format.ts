/**
 * Date and text formatting for display.
 *
 * Fiji has no daylight saving and the association's audience is local, so
 * everything is rendered in `Pacific/Fiji` rather than the visitor's zone —
 * a tournament on the 14th should read "14 March" to someone browsing from
 * Auckland, not "13 March".
 *
 * Postgres `date` columns (event_date, start_date, term_start) arrive as bare
 * `YYYY-MM-DD` with no time. `new Date('2011-03-14')` parses that as UTC
 * midnight, which is already the 14th in Fiji (+12), so forcing the zone is
 * safe for both column types.
 */

const FIJI = 'Pacific/Fiji'

function parse(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function format(value: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  const date = parse(value)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-FJ', { timeZone: FIJI, ...options }).format(date)
}

/** "14 March 2011" */
export function formatDate(value: string | null | undefined) {
  return format(value, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "14 Mar 2011" — for tables and cards where space is tight. */
export function formatShortDate(value: string | null | undefined) {
  return format(value, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "March 2011" — calendar headings. */
export function formatMonthYear(value: string | null | undefined) {
  return format(value, { month: 'long', year: 'numeric' })
}

/**
 * Collapses a start/end pair into one label: a single date when there is no
 * end date or the two match, "14–16 March 2011" within a month, otherwise
 * both dates in full.
 */
export function formatDateRange(start: string, end: string | null | undefined) {
  if (!end || end === start) return formatDate(start)

  const from = parse(start)
  const to = parse(end)
  if (!from || !to) return formatDate(start)

  const sameMonth =
    format(start, { month: 'numeric', year: 'numeric' }) ===
    format(end, { month: 'numeric', year: 'numeric' })

  if (sameMonth) {
    return `${format(start, { day: 'numeric' })}–${formatDate(end)}`
  }
  return `${formatDate(start)} – ${formatDate(end)}`
}

/** ISO `YYYY-MM-DD` for today in Fiji — the cutoff for "upcoming". */
export function todayInFiji(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FIJI }).format(new Date())
}

/**
 * First paragraph of a Markdown body, trimmed to roughly `limit` characters at
 * a word boundary. Markdown syntax is stripped rather than rendered, so an
 * excerpt never carries formatting into a card layout.
 */
export function excerpt(markdown: string, limit = 180): string {
  const firstBlock = markdown.split(/\n\s*\n/)[0] ?? ''
  const plain = firstBlock
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/^>\s?/gm, '') // blockquotes
    .replace(/`{1,3}/g, '')
    .replace(/[*_]{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (plain.length <= limit) return plain
  const cut = plain.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** Initials for the avatar fallback when a player has no photo. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** "5–3", or an em dash when a match has been scheduled but not played. */
export function formatScore(score1: number | null, score2: number | null): string {
  if (score1 === null || score2 === null) return '—'
  return `${score1}–${score2}`
}
