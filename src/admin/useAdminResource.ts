import { useCallback, useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useMutation } from '../hooks/useMutation.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'

/**
 * Tables the admin panel edits. `admins` is deliberately absent — it is keyed
 * by `user_id`, has no public policies, and granting admin rights is a manual
 * step in Supabase Studio by design. Exposing it here would let one admin
 * silently promote anyone.
 */
export type EditableTable =
  | 'clubs'
  | 'players'
  | 'committee_members'
  | 'tournaments'
  | 'tournament_entries'
  | 'matches'
  | 'news_posts'
  | 'events'
  | 'media'

/** `null` = list view, `'new'` = create form, a row = edit form. */
export type Editing<T> = T | 'new' | null

/**
 * The list/create/edit/delete cycle every admin section repeats.
 *
 * Sections supply their own loader and render their own form, but share the
 * editing state machine, the refresh-after-write, the delete flow and the
 * success notice — the parts where an inconsistency between sections would be
 * a bug rather than a design choice.
 */
export function useAdminResource<T extends { id: string }>({
  table,
  cacheKey,
  load,
}: {
  table: EditableTable
  cacheKey: string
  /** `PromiseLike`, so a Supabase query builder can be returned directly. */
  load: () => PromiseLike<QueryResult<T[]>>
}) {
  const { data, error: loadError, loading, refresh } = useSupabaseQuery(load, cacheKey)
  const { run, pending, error: writeError, clearError } = useMutation()

  const [editing, setEditing] = useState<Editing<T>>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const startCreate = useCallback(() => {
    clearError()
    setFlash(null)
    setEditing('new')
  }, [clearError])

  const startEdit = useCallback(
    (row: T) => {
      clearError()
      setFlash(null)
      setEditing(row)
    },
    [clearError],
  )

  const cancel = useCallback(() => {
    clearError()
    setEditing(null)
  }, [clearError])

  /**
   * Runs a write, and on success closes the form, reloads the list and shows a
   * notice. Returns whether it succeeded so a caller can do more afterwards.
   */
  const save = useCallback(
    async (write: () => PromiseLike<{ error: { message: string } | null }>, notice: string) => {
      const ok = await run(write)
      if (ok) {
        setEditing(null)
        setFlash(notice)
        refresh()
      }
      return ok
    },
    [run, refresh],
  )

  const remove = useCallback(
    async (row: T, notice: string) => {
      setDeletingId(row.id)
      setFlash(null)
      const ok = await run(() => supabase.from(table).delete().eq('id', row.id))
      setDeletingId(null)
      if (ok) {
        /* If the row being deleted was open in the form, close it. */
        setEditing((current) =>
          current !== 'new' && current?.id === row.id ? null : current,
        )
        setFlash(notice)
        refresh()
      }
      return ok
    },
    [run, refresh, table],
  )

  return {
    rows: data ?? [],
    loading,
    loadError,
    editing,
    startCreate,
    startEdit,
    cancel,
    save,
    remove,
    saving: pending,
    saveError: writeError,
    deletingId,
    flash,
    refresh,
  }
}
