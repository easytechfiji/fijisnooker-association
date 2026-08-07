/**
 * Conversion between what an admin types and what Postgres stores.
 *
 * `matches.played_at` is `timestamptz`, but an admin entering a result thinks
 * in Fiji wall-clock time. These convert in both directions.
 *
 * The offset is computed from the IANA zone for the instant in question rather
 * than hard-coded to +12. Fiji observed daylight saving until 2021, so a match
 * played in January 2011 was at +13 while one played today is at +12 —
 * assuming a fixed offset would date historical results an hour out, and any
 * result entered near midnight a full day out.
 */

const ZONE = 'Pacific/Fiji'

const PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** The instant, read as a wall-clock time in Fiji, expressed as a UTC epoch. */
function wallClockAsUtc(instant: Date): number {
  const parts = PARTS.formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  return Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
}

/** Fiji's UTC offset in minutes at a given instant (+720, or +780 under DST). */
export function fijiOffsetMinutes(instant: Date): number {
  return (wallClockAsUtc(instant) - instant.getTime()) / 60_000
}

/**
 * A `YYYY-MM-DDTHH:mm` value from a `datetime-local` input, read as Fiji wall
 * time, converted to an ISO instant for Postgres. Returns null for empty or
 * malformed input.
 *
 * Solved by iteration: the offset depends on the instant, and the instant
 * depends on the offset. Guessing with the offset at the naive timestamp and
 * correcting once settles it, including on a DST boundary.
 */
export function fijiLocalToIso(local: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local.trim())
  if (!match) return null

  const [, year, month, day, hour, minute, second] = match
  const naive = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? '0'),
  )
  if (Number.isNaN(naive)) return null

  let instant = naive - fijiOffsetMinutes(new Date(naive)) * 60_000
  instant = naive - fijiOffsetMinutes(new Date(instant)) * 60_000

  const result = new Date(instant)
  return Number.isNaN(result.getTime()) ? null : result.toISOString()
}

/**
 * The reverse: an ISO instant from the database to the `YYYY-MM-DDTHH:mm` a
 * `datetime-local` input expects, in Fiji time. Empty string when absent, so it
 * can be assigned straight to a controlled input's value.
 */
export function isoToFijiLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) return ''
  return new Date(wallClockAsUtc(instant)).toISOString().slice(0, 16)
}

/**
 * A `YYYY-MM-DD` value from a `date` input for a `date` column. Postgres `date`
 * has no zone, so this is a passthrough with validation — deliberately not a
 * timestamp conversion, which would shift the day.
 */
export function dateInputToColumn(value: string): string | null {
  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}
