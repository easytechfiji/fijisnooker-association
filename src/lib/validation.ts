/**
 * Form validation and input coercion for the admin panel.
 *
 * These are a courtesy to whoever is filling the form, not a security control.
 * The database is what actually enforces correctness — the CHECK constraints in
 * schema.sql reject a negative score or a zero age no matter how the row was
 * submitted, and RLS rejects the write entirely if the session is not an admin.
 * Every rule here exists to give a useful message before the round trip, and
 * each one mirrors a constraint that also exists in SQL.
 *
 * Pure functions, so the rules can be tested without rendering a form.
 */

/** Field name → message. An empty object means the form is valid. */
export type Errors = Record<string, string>

// ---------------------------------------------------------------------------
// Coercion: form inputs are always strings, columns are often nullable.
// ---------------------------------------------------------------------------

/**
 * Trims text and turns empty into null, so an untouched optional field stores
 * NULL rather than an empty string. Without this, "no venue recorded" and
 * "venue is an empty string" become two different states that render the same.
 */
export function textOrNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Required text, trimmed. Empty is caught by validation, not silently stored. */
export function text(value: string): string {
  return value.trim()
}

/** Parses an integer field, returning null for empty and NaN for junk. */
export function intOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) ? parsed : Number.NaN
}

// ---------------------------------------------------------------------------
// Individual rules. Each returns a message, or null when the value is fine.
// ---------------------------------------------------------------------------

export function required(value: string, label: string): string | null {
  return value.trim() === '' ? `${label} is required.` : null
}

/** Mirrors `check (score >= 0)` and `check (highest_break >= 0)`. */
export function nonNegativeInteger(value: string, label: string): string | null {
  const parsed = intOrNull(value)
  if (parsed === null) return null
  if (Number.isNaN(parsed)) return `${label} must be a whole number.`
  if (parsed < 0) return `${label} cannot be negative.`
  return null
}

/** Mirrors `check (age is null or age > 0)`. */
export function positiveInteger(value: string, label: string): string | null {
  const parsed = intOrNull(value)
  if (parsed === null) return null
  if (Number.isNaN(parsed)) return `${label} must be a whole number.`
  if (parsed <= 0) return `${label} must be greater than zero.`
  return null
}

/** Guards against a typo like 300 in a break field, which SQL would accept. */
export function atMost(value: string, limit: number, label: string): string | null {
  const parsed = intOrNull(value)
  if (parsed === null || Number.isNaN(parsed)) return null
  return parsed > limit ? `${label} cannot be more than ${limit}.` : null
}

/**
 * Checks the shape and that the date actually exists.
 *
 * The existence check has to compare the parsed components back against the
 * input: `new Date('2026-02-31')` does not fail, it silently rolls over to
 * 3 March. Testing only for NaN would accept impossible dates.
 */
export function isoDate(value: string, label: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return `${label} must be a date.`

  const [, year, month, day] = match
  const parsed = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return `${label} is not a real date.`

  const rolledOver =
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() + 1 !== Number(month) ||
    parsed.getUTCDate() !== Number(day)

  return rolledOver ? `${label} is not a real date.` : null
}

/** End dates may be absent, but must not precede the start when present. */
export function endNotBeforeStart(
  start: string,
  end: string,
  label = 'End date',
): string | null {
  if (start.trim() === '' || end.trim() === '') return null
  return end.trim() < start.trim() ? `${label} cannot be before the start date.` : null
}

/**
 * A deliberately permissive email check — one @, something either side, a dot
 * in the domain. Anything stricter rejects addresses that are perfectly valid,
 * and this field only ever becomes a `mailto:` link.
 */
export function email(value: string, label = 'Email'): string | null {
  if (value.trim() === '') return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? null
    : `${label} does not look like an email address.`
}

/**
 * Requires an http(s) URL for anything rendered as an image or link.
 *
 * Rejecting other schemes here is about avoiding a broken page, not about
 * safety: `javascript:` in an `<img src>` does not execute, and the Markdown
 * renderer strips dangerous schemes from post bodies independently.
 */
export function httpUrl(value: string, label = 'URL'): string | null {
  if (value.trim() === '') return null
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    return `${label} must be a full URL, starting with https://`
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    ? null
    : `${label} must start with http:// or https://`
}

/** Two dropdowns that must not name the same player. */
export function differentPlayers(
  player1: string,
  player2: string,
): string | null {
  if (!player1 || !player2) return null
  return player1 === player2 ? 'A player cannot play themselves.' : null
}

/**
 * The winner has to be one of the two players in the match. Guards the case
 * where an admin picks a winner, then changes a player and does not notice.
 */
export function winnerIsInMatch(
  winner: string,
  player1: string,
  player2: string,
): string | null {
  if (!winner) return null
  return winner === player1 || winner === player2
    ? null
    : 'The winner must be one of the two players in this match.'
}

/**
 * Warns when the recorded winner contradicts the frame scores. Returned as an
 * error the admin must resolve rather than silently trusting one over the
 * other, since either could be the typo.
 */
export function winnerMatchesScore(
  winner: string,
  player1: string,
  player2: string,
  score1: string,
  score2: string,
): string | null {
  const s1 = intOrNull(score1)
  const s2 = intOrNull(score2)
  if (!winner || s1 === null || s2 === null || Number.isNaN(s1) || Number.isNaN(s2)) {
    return null
  }
  if (s1 === s2) {
    return 'The scores are level, so there is no winner to record. Clear the winner or correct the scores.'
  }
  const leader = s1 > s2 ? player1 : player2
  return winner === leader
    ? null
    : 'The winner does not match the scores. Correct whichever is wrong.'
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

/**
 * Turns a title into a URL slug for `news_posts.slug`, which is `not null
 * unique` and is what `/news/:slug` looks up.
 *
 * Accented characters are decomposed and stripped rather than dropped whole, so
 * "Nadī Open" becomes "nadi-open" rather than "nad-open".
 */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

export function validSlug(value: string, label = 'Slug'): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return `${label} is required.`
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed)
    ? null
    : `${label} may contain only lowercase letters, numbers and hyphens.`
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/**
 * Collects rules into an error map, dropping the nulls. Written so a form's
 * validation reads as a list of field/rule pairs:
 *
 *   collect({ name: required(name, 'Name'), age: positiveInteger(age, 'Age') })
 */
export function collect(candidates: Record<string, string | null>): Errors {
  const errors: Errors = {}
  for (const [field, message] of Object.entries(candidates)) {
    if (message !== null) errors[field] = message
  }
  return errors
}

/** True when `collect` found nothing to complain about. */
export function isValid(errors: Errors): boolean {
  return Object.keys(errors).length === 0
}

/**
 * Applies rules in order and keeps the first complaint per field, so a blank
 * required field says "required" rather than a confusing format message.
 */
export function firstOf(...messages: (string | null)[]): string | null {
  return messages.find((message) => message !== null) ?? null
}
