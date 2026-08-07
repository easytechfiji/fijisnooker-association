import type { ReactNode } from 'react'
import { configError } from '../lib/supabase.ts'

/**
 * Replaces the whole site with an explanation when Supabase is misconfigured,
 * rather than letting every page fail one request at a time. Also guarantees no
 * request is attempted with a key that failed the service_role check.
 */
export function ConfigGate({ children }: { children: ReactNode }) {
  if (!configError) return <>{children}</>

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
        <h1 className="mb-2 text-xl font-semibold text-amber-900">
          Configuration needed
        </h1>
        <p className="text-amber-900">{configError}</p>
      </div>
    </main>
  )
}
