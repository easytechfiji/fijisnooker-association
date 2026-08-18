import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { Logo } from '../components/Logo.tsx'
import { ASSOCIATION_SHORT } from '../lib/brand.ts'

const sections = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/tournaments', label: 'Tournaments' },
  { to: '/admin/matches', label: 'Match results' },
  { to: '/admin/players', label: 'Players' },
  { to: '/admin/clubs', label: 'Clubs' },
  { to: '/admin/news', label: 'News posts' },
  { to: '/admin/committee', label: 'Committee' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/media', label: 'Media' },
]

function sectionClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded px-3 py-2 text-sm',
    isActive ? 'bg-crimson-700 font-medium text-white' : 'text-stone-700 hover:bg-stone-100',
  ].join(' ')
}

export default function AdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="crest text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex items-center gap-3">
            <Logo className="w-11 shrink-0" />
            <span className="leading-none">
              <span className="block font-[family-name:var(--font-display)] text-lg font-bold">
                Administration
              </span>
              <span className="eyebrow mt-1 block text-brass-300">
                {ASSOCIATION_SHORT}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-crimson-50 sm:inline">{user?.email}</span>
            <Link to="/" className="hover:text-brass-300">
              View site
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded bg-crimson-700 px-3 py-1.5 hover:bg-crimson-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row">
        <nav aria-label="Admin sections" className="lg:w-56 lg:shrink-0">
          <div className="space-y-1">
            {sections.map((section) => (
              <NavLink
                key={section.to}
                to={section.to}
                end={section.end}
                className={sectionClass}
              >
                {section.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
