import { useId } from 'react'
import type { ReactNode } from 'react'

/**
 * Label, control, hint and error for one form field.
 *
 * `children` is a function taking the props the control must spread, so the id
 * generated for the label always matches, and `aria-invalid` /
 * `aria-describedby` are wired without each form remembering to do it.
 */
export interface ControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string
  error?: string
  hint?: ReactNode
  required?: boolean
  children: (props: ControlProps) => ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
        {required ? (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-stone-400">optional</span>
        )}
      </label>

      {children({
        id,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}

      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-stone-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
