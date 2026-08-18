import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { ASSOCIATION_NAME, WORDMARK } from '../lib/brand.ts'
import { Logo } from './Logo.tsx'

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

/*
 * Desktop links. The active page is marked with a gold underline drawn as a
 * bottom border rather than `underline`, so it sits clear of the descenders
 * and lines up across every item.
 */
function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'relative rounded-md px-3 py-2 text-sm font-medium transition-colors',
    'after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors',
    isActive
      ? 'text-white after:bg-brass-400'
      : 'text-crimson-50 hover:text-white hover:after:bg-brass-400/40',
  ].join(' ')
}

/**
 * Same, stacked for the mobile drawer. Written as classes rather than a `style`
 * prop so the deployed Content-Security-Policy can forbid inline styles
 * outright — see vercel.json / netlify.toml.
 */
function mobileLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded-md border-l-2 px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'border-brass-400 bg-crimson-800 text-white'
      : 'border-transparent text-crimson-50 hover:border-brass-400/50 hover:bg-crimson-800/60 hover:text-white',
  ].join(' ')
}

export function NavBar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  /* A tapped link changes the route but leaves the drawer covering the page. */
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 shadow-lg shadow-crimson-950/10">
      {/* The wreath as a hairline: green edges, gold centre. */}
      <div className="wreath-rule" />

      <div className="crest text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <Link
            to="/"
            aria-label={ASSOCIATION_NAME}
            className="flex items-center gap-3 rounded-md py-1 transition-opacity hover:opacity-90"
          >
            <Logo className="w-14 shrink-0 sm:w-16" />
            <span className="leading-none">
              <span className="block font-[family-name:var(--font-display)] text-lg font-bold tracking-[0.06em] text-white sm:text-xl">
                {WORDMARK.primary}
              </span>
              {/*
                The full name is too wide for a phone alongside the menu
                button — below `sm` the badge and the initials carry it.
              */}
              <span className="eyebrow mt-1.5 hidden text-[0.6875rem] text-brass-300 sm:block">
                {WORDMARK.secondary}
              </span>
            </span>
          </Link>

          <nav className="hidden lg:flex lg:items-center lg:gap-0.5" aria-label="Main">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-crimson-50 ring-1 ring-white/20 ring-inset transition-colors hover:bg-crimson-800 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="size-5"
            >
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" />
              )}
            </svg>
            Menu
          </button>
        </div>

        {open ? (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="border-t border-white/10 px-4 pb-4 sm:px-6 lg:hidden"
          >
            <div className="mt-3 space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={mobileLinkClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  )
}
