import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const BASE =
  'block rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/80 transition duration-200'
const INTERACTIVE =
  'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-baize-950/5 hover:ring-baize-300'

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
    <div className="mb-5 flex items-center justify-between gap-4 border-b border-stone-200 pb-3">
      <h2 className="flex items-center gap-3 text-xl">
        <span className="rule" aria-hidden="true" />
        {title}
      </h2>
      {action ? (
        <Link
          to={action.to}
          className="shrink-0 text-sm font-medium text-baize-600 transition-colors hover:text-baize-800"
        >
          {action.label} <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  )
}
