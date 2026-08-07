import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types.ts'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/**
 * Detects a key that bypasses Row Level Security.
 *
 * Supabase issues two kinds of privileged key. Newer projects use
 * self-describing `sb_secret_…` keys; older ones use a JWT whose `role` claim
 * says `service_role`. Either one ignores every policy in schema.sql, and
 * anything named `VITE_*` is compiled into the JavaScript served to visitors —
 * so pasting one into .env.local would hand every visitor full write access to
 * the database.
 *
 * This is a guardrail against an easy mistake, not the security boundary. The
 * boundary is RLS, enforced by Postgres. An unreadable key is therefore treated
 * as "not proven bad" rather than failing closed.
 */
function isPrivilegedKey(value: string): boolean {
  if (value.startsWith('sb_secret_')) return true

  const segments = value.split('.')
  if (segments.length !== 3) return false

  try {
    const payload: unknown = JSON.parse(
      atob(segments[1].replace(/-/g, '+').replace(/_/g, '/')),
    )
    return (
      typeof payload === 'object' &&
      payload !== null &&
      (payload as { role?: unknown }).role === 'service_role'
    )
  } catch {
    return false
  }
}

function detectConfigError(): string | null {
  if (!url || !key) {
    return 'Supabase is not configured yet. Copy .env.example to .env.local, fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project settings, then restart the dev server.'
  }
  if (isPrivilegedKey(key)) {
    return 'VITE_SUPABASE_ANON_KEY looks like a service_role (secret) key. That key bypasses Row Level Security and must never reach the browser. Replace it with the anon / publishable key and restart the dev server.'
  }
  return null
}

/**
 * Non-null when the app must not talk to Supabase at all. `ConfigGate` renders
 * an explanation instead of the site whenever this is set.
 */
export const configError: string | null = detectConfigError()

// When configuration is bad we still have to hand createClient *something*,
// since it throws on an empty URL. These placeholders guarantee that a
// mistakenly-supplied service_role key is never given to a working client —
// and ConfigGate stops any request from being attempted regardless.
const PLACEHOLDER_URL = 'https://unconfigured.invalid'
const PLACEHOLDER_KEY = 'unconfigured'

export const supabase = createClient<Database>(
  configError ? PLACEHOLDER_URL : url,
  configError ? PLACEHOLDER_KEY : key,
)
