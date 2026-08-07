import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const BASE =
  'block rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition'
const INTERACTIVE = 'hover:border-baize-300 hover:shadow-md'

/** A plain content panel. */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`${BASE} ${className}`}>{children}</div>
}

/** The same panel, but the whole surface is a link. */
export function CardLink({
  to,
  children,
  className = '',
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link to={to} className={`${BASE} ${INTERACTIVE} ${className}`}>
      {children}
    </Link>
  )
}

/** Section heading with an optional "see all" link on the right. */
export function SectionHeading({
  title,
  action,
}: {
  title: string
  action?: { to: string; label: string }
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-xl">{title}</h2>
      {action ? (
        <Link
          to={action.to}
          className="text-sm text-baize-700 underline underline-offset-2 hover:text-baize-500"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
