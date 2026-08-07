import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { Club } from '../lib/database.types.ts'

import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'

export function AboutPage() {
  const { data, error, loading } = useSupabaseQuery<Club[]>(
    () => supabase.from('clubs').select('*').order('name', { ascending: true }),
    'clubs',
  )

  return (
    <>
      <PageHeader
        title="About the association"
        description="The Fiji Southern Division Billiards & Snooker Association."
      />

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <p className="text-stone-700 leading-relaxed">
            The Southern Division Billiards &amp; Snooker Association organises
            competitive billiards and snooker across Fiji&rsquo;s southern
            division. It runs the divisional tournament calendar, keeps records
            of matches and rankings, and selects players to represent the
            division.
          </p>
          <p className="text-stone-700 leading-relaxed">
            This site replaces the association&rsquo;s previous blog, which had
            not been updated since 2011. Tournament results, player profiles and
            fixtures are now kept as structured records, so rankings follow
            directly from the matches that have actually been played.
          </p>

          <section>
            <h2 className="mb-2 text-xl">What you&rsquo;ll find here</h2>
            <ul className="space-y-2 text-stone-700">
              <li>
                <Link
                  to="/tournaments"
                  className="text-baize-700 underline underline-offset-2 hover:text-baize-500"
                >
                  Tournaments
                </Link>{' '}
                — every competition with its dates, venue, format and results.
              </li>
              <li>
                <Link
                  to="/players"
                  className="text-baize-700 underline underline-offset-2 hover:text-baize-500"
                >
                  Players
                </Link>{' '}
                — profiles with match history and frame records.
              </li>
              <li>
                <Link
                  to="/rankings"
                  className="text-baize-700 underline underline-offset-2 hover:text-baize-500"
                >
                  Rankings
                </Link>{' '}
                — standings calculated from recorded results.
              </li>
              <li>
                <Link
                  to="/calendar"
                  className="text-baize-700 underline underline-offset-2 hover:text-baize-500"
                >
                  Calendar
                </Link>{' '}
                — fixtures, meetings and tournament dates.
              </li>
            </ul>
          </section>

          <p className="text-sm text-stone-500">
            Details about the association&rsquo;s history and constitution will be
            added here — send anything that should appear on this page to the{' '}
            <Link
              to="/contact"
              className="text-baize-700 underline underline-offset-2 hover:text-baize-500"
            >
              secretary
            </Link>
            .
          </p>
        </div>

        <aside>
          <h2 className="mb-4 text-xl">Clubs</h2>
          <QueryBoundary loading={loading} error={error} data={data}>
            {(clubs) =>
              clubs.length === 0 ? (
                <EmptyState message="No clubs recorded yet." />
              ) : (
                <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
                  {clubs.map((club) => (
                    <li key={club.id} className="px-4 py-2.5 text-sm text-stone-700">
                      {club.name}
                    </li>
                  ))}
                </ul>
              )
            }
          </QueryBoundary>
        </aside>
      </div>
    </>
  )
}
