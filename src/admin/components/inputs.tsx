import type { ReactNode } from 'react'

import { Field } from './Field.tsx'
import { controlClass } from './controlClass.ts'

/**
 * Thin wrappers pairing a Field with its control, so a form is a list of
 * fields rather than a wall of markup. Each takes a plain `value`/`onChange`
 * of strings — coercion to the column's type happens once, on submit, via
 * `src/lib/validation.ts`.
 */

interface Common {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: ReactNode
  required?: boolean
  disabled?: boolean
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  type = 'text',
  placeholder,
  autoFocus,
}: Common & {
  type?: 'text' | 'email' | 'tel' | 'url' | 'date' | 'datetime-local'
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(props) => (
        <input
          {...props}
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the first field of a form the admin just chose to open
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass(Boolean(error))}
        />
      )}
    </Field>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  min,
  max,
}: Common & { min?: number; max?: number }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(props) => (
        <input
          {...props}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass(Boolean(error))}
        />
      )}
    </Field>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  rows = 4,
  placeholder,
}: Common & { rows?: number; placeholder?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(props) => (
        <textarea
          {...props}
          value={value}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${controlClass(Boolean(error))} font-mono text-[13px] leading-relaxed`}
        />
      )}
    </Field>
  )
}

export interface Option {
  value: string
  label: string
}

export function SelectField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  options,
  placeholder = '— none —',
}: Common & { options: Option[]; placeholder?: string }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {(props) => (
        <select
          {...props}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass(Boolean(error))}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}
