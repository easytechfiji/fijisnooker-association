import { describe, expect, it } from 'vitest'

import { describeError, isPermissionError } from './errors.ts'

describe('describeError', () => {
  it('explains an RLS refusal in terms of what to do about it', () => {
    const message = describeError({
      code: '42501',
      message: 'new row violates row-level security policy for table "players"',
    })
    expect(message).toMatch(/not an admin/)
    expect(message).toMatch(/admins/)
  })

  it('recognises an RLS refusal from the message when there is no code', () => {
    expect(
      describeError({ message: 'new row violates row-level security policy' }),
    ).toMatch(/not an admin/)
  })

  it('explains a duplicate slug', () => {
    expect(
      describeError({
        message:
          'duplicate key value violates unique constraint "news_posts_slug_key"',
      }),
    ).toMatch(/web address already exists/)
  })

  it('explains a generic uniqueness clash by code', () => {
    expect(describeError({ code: '23505', message: 'duplicate key' })).toMatch(
      /already exists/,
    )
  })

  it('explains a CHECK constraint failure', () => {
    expect(
      describeError({ code: '23514', message: 'violates check constraint' }),
    ).toMatch(/out of range/)
  })

  it('explains an expired session', () => {
    expect(describeError({ message: 'JWT expired' })).toMatch(/sign in again/i)
  })

  it('explains a network failure', () => {
    expect(describeError({ message: 'Failed to fetch' })).toMatch(/internet connection/)
  })

  it('passes an unrecognised message through rather than hiding it', () => {
    expect(describeError({ message: 'something unusual happened' })).toBe(
      'something unusual happened',
    )
  })

  it('returns null for no error', () => {
    expect(describeError(null)).toBeNull()
    expect(describeError(undefined)).toBeNull()
  })

  it('never returns an empty string', () => {
    expect(describeError({ message: '' })).toBeTruthy()
  })
})

describe('isPermissionError', () => {
  it('identifies the database refusing a write to a non-admin', () => {
    expect(isPermissionError({ code: '42501', message: 'denied' })).toBe(true)
    expect(
      isPermissionError({ message: 'new row violates row-level security policy' }),
    ).toBe(true)
  })

  it('does not mistake other failures for a permission problem', () => {
    expect(isPermissionError({ code: '23505', message: 'duplicate key' })).toBe(false)
    expect(isPermissionError(null)).toBe(false)
  })
})
