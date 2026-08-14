import { Link } from 'react-router-dom'

import { ASSOCIATION_NAME, TAGLINE } from '../lib/brand.ts'
import { Logo } from './Logo.tsx'

const columns = [
  {
    heading: 'Competition',
    links: [
      { to: '/tournaments', label: 'Tournaments' },
      { to: '/rankings', label: 'Rankings' },
      { to: '/calendar', label: 'Calendar' },
      { to: '/players', label: 'Players' },
    ],
  },
  {
    heading: 'Association',
    links: [
      { to: '/about', label: 'About' },
      { to: '/committee', label: 'Committee' },
      { to: '/contact', label: 'Contact' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="felt mt-16 text-baize-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Logo className="size-14 shrink-0" />
              <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-white">
                {ASSOCIATION_NAME}
              </p>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-baize-200">
              {TAGLINE} Tournament results, player records and rankings, kept up
              to date by the committee.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="eyebrow text-brass-300">{column.heading}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-baize-100 transition-colors hover:text-brass-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-baize-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {ASSOCIATION_NAME}
          </p>
          <Link
            to="/admin"
            className="transition-colors hover:text-brass-300"
          >
            Committee login
          </Link>
        </div>
      </div>
    </footer>
  )
}
