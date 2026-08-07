import { useCallback, useEffect, useRef, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * What a Supabase query resolves to, and what the multi-query loader functions
 * on the page components return. Annotate those loaders with
 * `Promise<QueryResult<T>>` explicitly — without it TypeScript infers a union
 * of each `return` shape, and the `{ data: null }` branch narrows `T` to
 * `never` at the call site.
 */
export type QueryResult<T> = { data: T | null; error: PostgrestError | null }

/**
 * Runs a Supabase query and tracks loading / error / data for it.
 *
 * `key` identifies the query. The query re-runs whenever `key` changes, or when
 * the returned `refresh` is called — so a detail page passes something like
 * `player:${id}`. It is a plain string rather than a dependency array so the
 * effect's dependencies stay statically checkable.
 *
 * `run` is read from a ref, which keeps the inline closure callers pass from
 * re-triggering the query on every render. Results that arrive after the key
 * changed, or after unmount, are discarded instead of written to state.
 *
 * Deliberately small: a read helper for list and detail pages, not a cache. If
 * the site outgrows it, TanStack Query is the natural replacement.
 */
export function useSupabaseQuery<T>(run: () => PromiseLike<QueryResult<T>>, key: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  const runRef = useRef(run)
  runRef.current = run

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const result = await runRef.current()
        if (!active) return
        if (result.error) {
          setError(result.error.message)
          setData(null)
        } else {
          setData(result.data)
        }
      } catch (thrown) {
        if (!active) return
        setError(
          thrown instanceof Error
            ? thrown.message
            : 'Could not reach the database. Check your connection and try again.',
        )
        setData(null)
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [key, reloadToken])

  return { data, error, loading, refresh }
}
