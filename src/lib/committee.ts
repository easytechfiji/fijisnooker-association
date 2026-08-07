import type { CommitteeMember } from './database.types.ts'

/**
 * `committee_members.role` is free text, so office order can't come from the
 * schema. This ranks the offices the association actually uses; anything
 * unrecognised sorts after them, alphabetically.
 *
 * Matching is substring-based and case-insensitive so "Vice President
 * (Snooker)" and "Assistant Secretary" still land in roughly the right place.
 * Order matters — "vice president" is checked before "president", otherwise
 * every vice president would match the president rule first.
 */
const OFFICE_ORDER = [
  'patron',
  'president',
  'vice president',
  'vice-president',
  'secretary',
  'treasurer',
  'committee',
] as const

export function officeRank(role: string): number {
  const normalised = role.toLowerCase()

  const vice = normalised.includes('vice')
  for (let i = 0; i < OFFICE_ORDER.length; i += 1) {
    const office = OFFICE_ORDER[i]
    if (office.includes('vice') !== vice) continue
    if (normalised.includes(office)) return i
  }
  return OFFICE_ORDER.length
}

/**
 * A member is current when their term has no end date or ends today or later.
 * `today` is passed in rather than read from the clock so this stays pure.
 */
export function isCurrent(member: CommitteeMember, today: string): boolean {
  return member.term_end === null || member.term_end >= today
}

export function sortCommittee(members: CommitteeMember[]): CommitteeMember[] {
  return [...members].sort(
    (a, b) =>
      officeRank(a.role) - officeRank(b.role) ||
      a.role.localeCompare(b.role) ||
      a.name.localeCompare(b.name),
  )
}
