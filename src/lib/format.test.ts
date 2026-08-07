import { describe, expect, it } from 'vitest'

import {
  excerpt,
  formatDate,
  formatDateRange,
  formatMonthYear,
  formatScore,
  formatShortDate,
  initials,
  todayInFiji,
} from './format.ts'

describe('date formatting', () => {
  it('renders a bare date on its own day, not the day before', () => {
    // The regression this guards: parsing as local time in a negative-offset
    // zone would render 13 March for a match played on the 14th.
    expect(formatDate('2011-03-14')).toBe('14 March 2011')
  })

  it('renders timestamps in Fiji time rather than the visitor’s zone', () => {
    // 20:00 UTC is already the next day in Fiji (UTC+12).
    expect(formatDate('2011-03-14T20:00:00Z')).toBe('15 March 2011')
  })

  it('has a short form for tables', () => {
    expect(formatShortDate('2011-03-14')).toBe('14 Mar 2011')
  })

  it('has a month-and-year form', () => {
    expect(formatMonthYear('2011-03-14')).toBe('March 2011')
  })

  it('returns an empty string for missing or unparseable input', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('')).toBe('')
    expect(formatDate('not a date')).toBe('')
  })
})

describe('formatDateRange', () => {
  it('collapses a range inside one month', () => {
    expect(formatDateRange('2011-03-14', '2011-03-16')).toBe('14–16 March 2011')
  })

  it('shows both dates in full across a month boundary', () => {
    expect(formatDateRange('2011-03-28', '2011-04-02')).toBe(
      '28 March 2011 – 2 April 2011',
    )
  })

  it('shows both dates in full across a year boundary', () => {
    expect(formatDateRange('2011-12-30', '2012-01-02')).toBe(
      '30 December 2011 – 2 January 2012',
    )
  })

  it('shows a single date when there is no end or the dates match', () => {
    expect(formatDateRange('2011-03-14', null)).toBe('14 March 2011')
    expect(formatDateRange('2011-03-14', undefined)).toBe('14 March 2011')
    expect(formatDateRange('2011-03-14', '2011-03-14')).toBe('14 March 2011')
  })
})

describe('excerpt', () => {
  it('takes only the first paragraph', () => {
    expect(excerpt('First para.\n\nSecond para.')).toBe('First para.')
  })

  it('strips markdown syntax rather than rendering it', () => {
    expect(excerpt('## Heading')).toBe('Heading')
    expect(excerpt('**bold** and *italic*')).toBe('bold and italic')
    expect(excerpt('A [link](https://example.com) here')).toBe('A link here')
    expect(excerpt('> quoted text')).toBe('quoted text')
    expect(excerpt('Use `code` inline')).toBe('Use code inline')
  })

  it('drops images entirely, keeping link text', () => {
    expect(excerpt('![alt](img.png)Text after')).toBe('Text after')
  })

  it('truncates at a word boundary with an ellipsis', () => {
    const result = excerpt('word '.repeat(80), 50)
    expect(result.length).toBeLessThanOrEqual(51)
    expect(result.endsWith('…')).toBe(true)
    expect(result).not.toContain('  ')
  })

  it('leaves short text untouched', () => {
    expect(excerpt('Short.', 50)).toBe('Short.')
  })

  it('handles an empty body without throwing', () => {
    expect(excerpt('')).toBe('')
  })
})

describe('initials', () => {
  it('uses first and last initial', () => {
    expect(initials('Praneel Singh')).toBe('PS')
    expect(initials('Jay Kumar Kalyan')).toBe('JK')
  })

  it('uses the first two letters of a single name', () => {
    expect(initials('Praneel')).toBe('PR')
  })

  it('falls back to a placeholder for empty input', () => {
    expect(initials('   ')).toBe('?')
    expect(initials('')).toBe('?')
  })

  it('ignores extra whitespace between names', () => {
    expect(initials('  Abid   Ali  ')).toBe('AA')
  })
})

describe('formatScore', () => {
  it('renders a played score', () => {
    expect(formatScore(5, 3)).toBe('5–3')
  })

  it('renders 0–0 rather than treating zero as missing', () => {
    expect(formatScore(0, 0)).toBe('0–0')
  })

  it('renders a dash when the match has not been played', () => {
    expect(formatScore(null, null)).toBe('—')
    expect(formatScore(5, null)).toBe('—')
  })
})

describe('todayInFiji', () => {
  it('returns an ISO date string', () => {
    expect(todayInFiji()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
