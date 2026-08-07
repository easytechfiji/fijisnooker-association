import { useState } from 'react'

/**
 * Two-step delete: the button becomes a confirmation in place.
 *
 * Deliberately not `window.confirm` — a native modal blocks the whole page,
 * cannot say what is about to be deleted, and cannot be styled or dismissed by
 * keyboard consistently. The inline form also lets the label name the record,
 * so "Delete Suva Open 2026?" is unambiguous in a long list.
 */
export function DeleteButton({
  onDelete,
  label,
  pending,
  /** Extra warning shown at the confirmation step, e.g. cascading deletes. */
  consequence,
}: {
  onDelete: () => void
  label: string
  pending?: boolean
  consequence?: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded px-2 py-1 text-sm text-red-700 hover:bg-red-50 hover:underline"
      >
        Delete
      </button>
    )
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded border border-red-200 bg-red-50 px-2 py-1">
      <span className="text-xs text-red-900">
        Delete {label}?{consequence ? ` ${consequence}` : ''}
      </span>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="rounded bg-red-700 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="rounded px-2 py-0.5 text-xs text-stone-600 hover:underline"
      >
        Cancel
      </button>
    </span>
  )
}
