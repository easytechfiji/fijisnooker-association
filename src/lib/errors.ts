/**
 * Turns a Postgres/PostgREST error into something a committee member can act on.
 *
 * The raw messages name constraints and policies — "new row violates row-level
 * security policy for table \"players\"" — which is precise but tells the person
 * at the keyboard nothing about what to do. Each case below maps a specific
 * failure to the action that resolves it, and anything unrecognised falls
 * through to the original message rather than being swallowed.
 */

export interface SupabaseErrorish {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

/** Postgres SQLSTATE codes reachable from the admin forms. */
const CODES: Record<string, string> = {
  /* insufficient_privilege / RLS refusal — the load-bearing one. */
  '42501':
    'The database refused this change because your account is not an admin. Ask for a row in the `admins` table, then sign out and back in.',
  '23505': 'Something with that value already exists. Use a different one.',
  '23503':
    'This refers to a record that no longer exists. Reload the page and try again.',
  '23502': 'A required field was left empty.',
  '23514':
    'The database rejected a value as out of range — check the numbers on this form.',
  '22P02': 'One of the values is the wrong type. Check the numbers and dates.',
  '22007': 'One of the dates could not be read.',
  PGRST301: 'Your session has expired. Sign in again.',
}

/** Recognisable fragments for cases without a distinct code. */
const PATTERNS: [RegExp, string][] = [
  [
    /row-level security/i,
    'The database refused this change because your account is not an admin. Ask for a row in the `admins` table, then sign out and back in.',
  ],
  [
    /duplicate key value violates unique constraint .*slug/i,
    'A post with that web address already exists. Change the slug.',
  ],
  [
    /jwt expired|invalid claim|not authenticated/i,
    'Your session has expired. Sign in again.',
  ],
  [
    /failed to fetch|network|load failed/i,
    'Could not reach the database. Check your internet connection and try again.',
  ],
]

export function describeError(error: SupabaseErrorish | null | undefined): string | null {
  if (!error) return null

  if (error.code && CODES[error.code]) return CODES[error.code]

  for (const [pattern, message] of PATTERNS) {
    if (pattern.test(error.message)) return message
  }

  return error.message || 'Something went wrong saving your change.'
}

/**
 * True when the failure was RLS refusing the write.
 *
 * Worth distinguishing because it means the session is genuinely not an admin —
 * the React route guard let them in but the database did not, which is exactly
 * the split the security model intends. Retrying will not help.
 */
export function isPermissionError(error: SupabaseErrorish | null | undefined): boolean {
  if (!error) return false
  return error.code === '42501' || /row-level security/i.test(error.message)
}
