import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import { ASSOCIATION_NAME } from '../lib/brand.ts'
import type { Club } from '../lib/database.types.ts'

import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { Card } from '../components/ui/Card.tsx'
import { Logo } from '../components/Logo.tsx'

/*
 * One ball colour per section, so the four cards read as a set. Taken off the
 * badge's own cluster — the blue is a literal hex because it is the one ball
 * colour the palette has no use for anywhere else.
 */
const SECTIONS = [
  {
    to: '/tournaments',
    label: 'Tournaments',
    description: 'Every competition with its dates, venue, format and results.',
    dot: 'bg-crimson-500',
  },
  {
    to: '/players',
    label: 'Players',
    description: 'Profiles with match history and frame records.',
    dot: 'bg-brass-400',
  },
  {
    to: '/rankings',
    label: 'Rankings',
    description: 'Standings calculated from recorded results.',
    dot: 'bg-laurel-500',
  },
  {
    to: '/calendar',
    label: 'Calendar',
    description: 'Fixtures, meetings and tournament dates.',
    dot: 'bg-[#2d3192]',
  },
]

export function AboutPage() {
  const { data, error, loading } = useSupabaseQuery<Club[]>(
    () => supabase.from('clubs').select('*').order('name', { ascending: true }),
    'clubs',
  )

  return (
    <>
      <PageHeader title="About the association" />

      {/*
        A tinted band so the page opens with colour rather than body copy: the
        badge read left to right, disc red washing through to wreath green.
      */}
      <section className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-crimson-100 via-brass-100/70 to-laurel-100 px-6 py-10 ring-1 ring-crimson-200/80 sm:px-10">
        <Logo className="pointer-events-none absolute -right-10 -bottom-12 w-52 opacity-[0.09] select-none sm:w-64" />
        <div className="relative max-w-2xl">
          <p className="text-lg leading-relaxed text-stone-700 sm:text-xl">
            The {ASSOCIATION_NAME} organises competitive billiards and snooker
            across the Southern Division. It runs the tournament calendar, keeps
            records of matches and rankings, and puts players forward for
            national selection.
          </p>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <p className="leading-relaxed text-stone-600">
            This site replaces the association&rsquo;s previous blog, which had
            not been updated since 2011. Tournament results, player profiles and
            fixtures are now kept as structured records, so rankings follow
            directly from the matches that have actually been played.
          </p>

          <section>
            <h2 className="mb-4 flex items-center gap-3 text-xl">
              <span className="rule" aria-hidden="true" />
              What you&rsquo;ll find here
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {SECTIONS.map((section) => (
                <li key={section.to}>
                  <Link
                    to={section.to}
                    className="flex h-full gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-crimson-950/5 hover:ring-crimson-300"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2.5 shrink-0 rounded-full shadow-sm ${section.dot}`}
                    />
                    <span>
                      <span className="font-semibold text-crimson-800">
                        {section.label} <span aria-hidden="true">→</span>
                      </span>
                      <span className="mt-1 block text-sm text-stone-600">
                        {section.description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-sm text-stone-500">
            Details about the association&rsquo;s history and constitution will be
            added here — send anything that should appear on this page to the{' '}
            <Link to="/contact" className="link">
              secretary
            </Link>
            .
          </p>
        </div>

        <aside>
          <h2 className="mb-4 flex items-center gap-3 text-xl">
            <span className="rule" aria-hidden="true" />
            Clubs
          </h2>
          <QueryBoundary loading={loading} error={error} data={data}>
            {(clubs) =>
              clubs.length === 0 ? (
                <EmptyState message="No clubs recorded yet." />
              ) : (
                <Card className="!p-0 overflow-hidden">
                  <ul className="divide-y divide-stone-100">
                    {clubs.map((club) => (
                      <li
                        key={club.id}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-stone-700"
                      >
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-brass-400"
                        />
                        {club.name}
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            }
          </QueryBoundary>
        </aside>
      </div>
    </>
  )
}
