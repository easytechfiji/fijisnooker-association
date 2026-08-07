import { describe, expect, it } from 'vitest'

import { isCurrent, officeRank, sortCommittee } from './committee.ts'
import { makeCommitteeMember } from '../test/fixtures.ts'

describe('officeRank', () => {
  it('orders the association’s offices', () => {
    const roles = ['Treasurer', 'Secretary', 'Vice President', 'President', 'Patron']
    expect([...roles].sort((a, b) => officeRank(a) - officeRank(b))).toEqual([
      'Patron',
      'President',
      'Vice President',
      'Secretary',
      'Treasurer',
    ])
  })

  it('does not let a vice president match the president rule', () => {
    // "vice president" contains "president", so order of checks matters.
    expect(officeRank('Vice President')).toBeGreaterThan(officeRank('President'))
  })

  it('handles the hyphenated spelling', () => {
    expect(officeRank('Vice-President')).toBeGreaterThan(officeRank('President'))
  })

  it('is case insensitive', () => {
    expect(officeRank('SECRETARY')).toBe(officeRank('secretary'))
  })

  it('places a qualified office near its base office', () => {
    expect(officeRank('Assistant Secretary')).toBe(officeRank('Secretary'))
    expect(officeRank('Vice President (Snooker)')).toBe(officeRank('Vice President'))
  })

  it('sorts an unrecognised role last', () => {
    expect(officeRank('Bar Manager')).toBeGreaterThan(officeRank('Treasurer'))
  })
})

describe('isCurrent', () => {
  const today = '2026-08-06'

  it('treats an open-ended term as current', () => {
    expect(isCurrent(makeCommitteeMember({ term_end: null }), today)).toBe(true)
  })

  it('treats a term ending in the future as current', () => {
    expect(isCurrent(makeCommitteeMember({ term_end: '2026-12-31' }), today)).toBe(true)
  })

  it('treats a term ending today as still current', () => {
    expect(isCurrent(makeCommitteeMember({ term_end: today }), today)).toBe(true)
  })

  it('treats a term that has ended as past', () => {
    // The 2011 committee from the old site, if never updated.
    expect(isCurrent(makeCommitteeMember({ term_end: '2011-12-31' }), today)).toBe(false)
  })
})

describe('sortCommittee', () => {
  it('orders by office, then role, then name', () => {
    const members = [
      makeCommitteeMember({ name: 'Anup Kumar', role: 'Treasurer' }),
      makeCommitteeMember({ name: 'Jay Kalyan', role: 'President' }),
      makeCommitteeMember({ name: 'Deepak Bala', role: 'Vice President' }),
      makeCommitteeMember({ name: 'Abid Ali', role: 'Vice President' }),
      makeCommitteeMember({ name: 'Ashneel Nand', role: 'Secretary' }),
    ]

    expect(sortCommittee(members).map((m) => m.name)).toEqual([
      'Jay Kalyan',
      'Abid Ali',
      'Deepak Bala',
      'Ashneel Nand',
      'Anup Kumar',
    ])
  })

  it('does not mutate its input', () => {
    const members = [
      makeCommitteeMember({ name: 'B', role: 'Treasurer' }),
      makeCommitteeMember({ name: 'A', role: 'President' }),
    ]
    const snapshot = [...members]
    sortCommittee(members)
    expect(members).toEqual(snapshot)
  })
})
