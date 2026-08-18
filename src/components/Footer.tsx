import { Link } from 'react-router-dom'

import { ASSOCIATION_NAME, ASSOCIATION_SHORT, TAGLINE } from '../lib/brand.ts'
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
    <footer className="mt-16">
      {/* The same wreath hairline that opens the masthead closes the page. */}
      <div className="wreath-rule" />

      {/* Green here, red in the masthead: the page is bracketed the way the
          badge is — the disc up top, the wreath underneath. */}
      <div className="crest-green text-laurel-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-4">
                <Logo className="w-20 shrink-0" />
                <p className="max-w-[15rem] font-[family-name:var(--font-display)] text-lg leading-snug font-bold text-white">
                  {ASSOCIATION_NAME}
                </p>
              </div>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-laurel-100">
                {TAGLINE} Tournament results, player records and rankings, kept
                up to date by the committee.
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
                        className="text-laurel-50 transition-colors hover:text-brass-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-laurel-100 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} {ASSOCIATION_SHORT} &mdash;{' '}
              {ASSOCIATION_NAME}
            </p>
            <Link to="/admin" className="transition-colors hover:text-brass-300">
              Committee login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
