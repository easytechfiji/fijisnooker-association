import { useCallback, useRef, useState } from 'react'

import { describeError } from '../lib/errors.ts'
import type { SupabaseErrorish } from '../lib/errors.ts'

type Outcome = { error: SupabaseErrorish | null }

/**
 * Runs a write and tracks its pending state and error.
 *
 * Returns `true` when the write succeeded, so a caller can decide what to do
 * next without inspecting state that has not re-rendered yet:
 *
 *   if (await run(() => supabase.from('players').insert(row))) closeForm()
 *
 * Overlapping submissions are dropped rather than queued — a double-clicked
 * Save should not insert twice. The guard is a ref, not state, so it takes
 * effect on the second call rather than after the next render.
 */
export function useMutation() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const run = useCallback(async (write: () => PromiseLike<Outcome>) => {
    if (inFlight.current) return false
    inFlight.current = true
    setPending(true)
    setError(null)

    try {
      const { error: failure } = await write()
      if (failure) {
        setError(describeError(failure))
        return false
      }
      return true
    } catch (thrown) {
      setError(
        describeError(
          thrown instanceof Error ? thrown : { message: 'The change could not be saved.' },
        ),
      )
      return false
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { run, pending, error, clearError }
}
