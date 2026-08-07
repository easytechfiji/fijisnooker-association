import { describe, expect, it } from 'vitest'

import {
  dateInputToColumn,
  fijiLocalToIso,
  fijiOffsetMinutes,
  isoToFijiLocal,
} from './datetime.ts'

describe('fijiOffsetMinutes', () => {
  it('is +12 hours outside daylight saving', () => {
    expect(fijiOffsetMinutes(new Date('2026-08-06T00:00:00Z'))).toBe(720)
  })

  it('was +13 hours during Fiji’s daylight saving', () => {
    // Fiji observed DST until 2021; January 2011 was inside it.
    expect(fijiOffsetMinutes(new Date('2011-01-15T00:00:00Z'))).toBe(780)
  })

  it('is +12 again after Fiji abolished daylight saving', () => {
    expect(fijiOffsetMinutes(new Date('2026-01-15T00:00:00Z'))).toBe(720)
  })
})

describe('fijiLocalToIso', () => {
  it('reads the entered time as Fiji time, not UTC', () => {
    // 19:30 in Fiji (+12) is 07:30 UTC the same day.
    expect(fijiLocalToIso('2026-08-06T19:30')).toBe('2026-08-06T07:30:00.000Z')
  })

  it('keeps a late-evening result on the right day', () => {
    // The regression this guards: 23:00 Fiji is 11:00 UTC the SAME day. Treating
    // the input as UTC would file the match under the following day in Fiji.
    const iso = fijiLocalToIso('2026-03-14T23:00')
    expect(iso).toBe('2026-03-14T11:00:00.000Z')
    expect(isoToFijiLocal(iso)).toBe('2026-03-14T23:00')
  })

  it('applies the historical offset for a match played under DST', () => {
    // January 2011 was +13, so 19:30 local is 06:30 UTC.
    expect(fijiLocalToIso('2011-01-15T19:30')).toBe('2011-01-15T06:30:00.000Z')
  })

  it('accepts an optional seconds component', () => {
    expect(fijiLocalToIso('2026-08-06T19:30:45')).toBe('2026-08-06T07:30:45.000Z')
  })

  it('returns null for empty or malformed input', () => {
    expect(fijiLocalToIso('')).toBeNull()
    expect(fijiLocalToIso('2026-08-06')).toBeNull()
    expect(fijiLocalToIso('not a date')).toBeNull()
  })
})

describe('isoToFijiLocal', () => {
  it('renders a stored instant as Fiji wall time', () => {
    expect(isoToFijiLocal('2026-08-06T07:30:00.000Z')).toBe('2026-08-06T19:30')
  })

  it('returns an empty string for a missing value, ready for an input', () => {
    expect(isoToFijiLocal(null)).toBe('')
    expect(isoToFijiLocal(undefined)).toBe('')
    expect(isoToFijiLocal('')).toBe('')
    expect(isoToFijiLocal('nonsense')).toBe('')
  })
})

describe('round trip', () => {
  it('survives a round trip in both directions', () => {
    const locals = [
      '2026-08-06T19:30',
      '2026-01-01T00:00',
      '2026-12-31T23:59',
      '2011-06-15T12:00',
      '2011-01-15T19:30', // inside historical DST
    ]
    for (const local of locals) {
      const iso = fijiLocalToIso(local)
      expect(iso).not.toBeNull()
      expect(isoToFijiLocal(iso)).toBe(local)
    }
  })
})

describe('dateInputToColumn', () => {
  it('passes an ISO date straight through, without shifting the day', () => {
    expect(dateInputToColumn('2026-03-14')).toBe('2026-03-14')
  })

  it('returns null for empty or malformed input', () => {
    expect(dateInputToColumn('')).toBeNull()
    expect(dateInputToColumn('14/03/2026')).toBeNull()
  })
})
