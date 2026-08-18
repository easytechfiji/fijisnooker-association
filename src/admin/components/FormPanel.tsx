import type { FormEvent, ReactNode } from 'react'

import { ErrorMessage } from '../../components/ui/ErrorMessage.tsx'
import { PrimaryButton, SecondaryButton } from './AdminSection.tsx'

/**
 * The create/edit form shell: heading, fields, save error and actions.
 *
 * The submit error is rendered next to the buttons rather than at the top,
 * because a long form scrolled to its Save button would otherwise report a
 * failure off-screen and look like nothing happened.
 */
export function FormPanel({
  title,
  onSubmit,
  onCancel,
  error,
  pending,
  submitLabel = 'Save',
  children,
}: {
  title: string
  onSubmit: () => void
  onCancel: () => void
  error?: string | null
  pending?: boolean
  submitLabel?: string
  children: ReactNode
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mb-8 rounded-lg border border-crimson-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-5 text-lg">{title}</h2>

      <div className="space-y-4">{children}</div>

      {error ? (
        <div className="mt-5">
          <ErrorMessage message={error} />
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-3 border-t border-stone-100 pt-5">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </PrimaryButton>
        <SecondaryButton onClick={onCancel} disabled={pending}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  )
}

/** Two fields side by side on wide screens, stacked on narrow ones. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}
