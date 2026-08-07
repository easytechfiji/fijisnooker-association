import type { ReactNode } from 'react'

/** Header for an admin section, with the primary action on the right. */
export function AdminSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-stone-600">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </>
  )
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-baize-700 px-4 py-2 text-sm font-semibold text-white hover:bg-baize-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:border-stone-400 disabled:opacity-60"
    >
      {children}
    </button>
  )
}
