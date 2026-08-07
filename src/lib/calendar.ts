/**
 * Month-grid arithmetic for the calendar page.
 *
 * Everything here works on `YYYY-MM-DD` strings via UTC, never on local Date
 * components. `events.event_date` and `tournaments.start_date` are Postgres
 * `date` columns with no time or zone attached — treating them as UTC midnight
 * keeps a date on the square it belongs to regardless of where the visitor is.
 *
 * Pure, so it can be checked without a browser.
 */

/** Column headings, Monday first. */
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Squares for a month: leading nulls so the first row starts on a Monday,
 * then one ISO date per day, then trailing nulls to complete the last week.
 * Length is always a multiple of 7.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1))
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  /* getUTCDay is 0=Sunday; shift so Monday is 0. */
  const lead = (first.getUTCDay() + 6) % 7

  const squares: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    squares.push(iso(new Date(Date.UTC(year, month, day))))
  }
  while (squares.length % 7 !== 0) squares.push(null)
  return squares
}

/**
 * Every date from start to end inclusive, so a multi-day tournament marks each
 * of its days. Falls back to the start date alone when the range is unusable
 * (unparseable, or an end before the start), and caps at a year so a typo in
 * an admin form cannot spin the loop.
 */
export function datesInRange(start: string, end: string | null): string[] {
  const from = new Date(`${start}T00:00:00Z`)
  const to = end ? new Date(`${end}T00:00:00Z`) : from
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return [start]
  }

  const dates: string[] = []
  const cursor = new Date(from)
  while (cursor <= to && dates.length < 366) {
    dates.push(iso(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

/** "March 2011" for a grid month. */
export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-FJ', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 1)))
}

/** The year/month `delta` months away, normalised across year boundaries. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const next = new Date(Date.UTC(year, month + delta, 1))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() }
}
