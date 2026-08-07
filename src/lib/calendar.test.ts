import { describe, expect, it } from 'vitest'

import { datesInRange, monthGrid, monthLabel, shiftMonth } from './calendar.ts'

describe('monthGrid', () => {
  it('pads the start so the first row begins on a Monday', () => {
    // 1 March 2011 was a Tuesday.
    const grid = monthGrid(2011, 2)
    expect(grid[0]).toBeNull()
    expect(grid[1]).toBe('2011-03-01')
  })

  it('does not pad a month that starts on a Monday', () => {
    // 1 August 2011 was a Monday.
    expect(monthGrid(2011, 7)[0]).toBe('2011-08-01')
  })

  it('always returns whole weeks', () => {
    for (let month = 0; month < 12; month += 1) {
      expect(monthGrid(2026, month).length % 7).toBe(0)
    }
  })

  it('contains every day of the month, in order', () => {
    const days = monthGrid(2011, 2).filter(Boolean)
    expect(days).toHaveLength(31)
    expect(days[0]).toBe('2011-03-01')
    expect(days.at(-1)).toBe('2011-03-31')
    expect(days).toEqual([...days].sort())
  })

  it('handles leap years', () => {
    expect(monthGrid(2024, 1).filter(Boolean)).toHaveLength(29)
    expect(monthGrid(2023, 1).filter(Boolean)).toHaveLength(28)
    expect(monthGrid(2000, 1).filter(Boolean)).toHaveLength(29)
    expect(monthGrid(1900, 1).filter(Boolean)).toHaveLength(28)
  })

  it('produces valid ISO dates', () => {
    for (const day of monthGrid(2026, 11).filter(Boolean)) {
      expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('datesInRange', () => {
  it('covers every day of a multi-day tournament', () => {
    expect(datesInRange('2011-03-14', '2011-03-16')).toEqual([
      '2011-03-14',
      '2011-03-15',
      '2011-03-16',
    ])
  })

  it('runs continuously across a month boundary', () => {
    expect(datesInRange('2011-03-30', '2011-04-02')).toEqual([
      '2011-03-30',
      '2011-03-31',
      '2011-04-01',
      '2011-04-02',
    ])
  })

  it('runs continuously across a leap day', () => {
    expect(datesInRange('2024-02-28', '2024-03-01')).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ])
  })

  it('yields one date for a single-day or open-ended tournament', () => {
    expect(datesInRange('2011-03-14', null)).toEqual(['2011-03-14'])
    expect(datesInRange('2011-03-14', '2011-03-14')).toEqual(['2011-03-14'])
  })

  it('does not loop when the end precedes the start', () => {
    expect(datesInRange('2011-03-14', '2011-03-01')).toEqual(['2011-03-14'])
  })

  it('does not hang on unparseable dates', () => {
    expect(datesInRange('not-a-date', 'also-not')).toEqual(['not-a-date'])
  })

  it('caps an absurd range instead of building a huge array', () => {
    // Guards against a typo in an admin form freezing the calendar page.
    expect(datesInRange('2000-01-01', '2030-01-01').length).toBeLessThanOrEqual(366)
  })
})

describe('month navigation', () => {
  it('labels a month', () => {
    expect(monthLabel(2011, 2)).toBe('March 2011')
  })

  it('steps back across a year boundary', () => {
    expect(shiftMonth(2011, 0, -1)).toEqual({ year: 2010, month: 11 })
  })

  it('steps forward across a year boundary', () => {
    expect(shiftMonth(2011, 11, 1)).toEqual({ year: 2012, month: 0 })
  })

  it('steps by more than one month', () => {
    expect(shiftMonth(2011, 5, 12)).toEqual({ year: 2012, month: 5 })
  })
})
