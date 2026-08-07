import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/players', label: 'Players' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/about', label: 'About' },
  { to: '/committee', label: 'Committee' },
  { to: '/contact', label: 'Contact' },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'rounded px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-baize-800 text-white' : 'text-baize-50 hover:bg-baize-800/60',
  ].join(' ')
}

/**
 * Same, stacked for the mobile drawer. Written as classes rather than a `style`
 * prop so the deployed Content-Security-Policy can forbid inline styles
 * outright — see vercel.json / netlify.toml.
 */
function mobileLinkClass(state: { isActive: boolean }) {
  return `${linkClass(state)} mt-1 block`
}

export function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-baize-900 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="leading-tight" onClick={() => setOpen(false)}>
          <span className="block font-[family-name:var(--font-display)] text-lg font-bold">
            Fiji Southern Snooker
          </span>
          <span className="block text-xs text-baize-300">
            Billiards &amp; Snooker Association
          </span>
        </Link>

        <nav className="hidden lg:flex lg:gap-1" aria-label="Main">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="rounded px-3 py-2 text-sm font-medium hover:bg-baize-800 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="border-t border-baize-800 px-4 pb-3 sm:px-6 lg:hidden"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={mobileLinkClass}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
