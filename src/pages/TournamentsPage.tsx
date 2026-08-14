import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import { formatDateRange } from '../lib/format.ts'
import type { Tournament, TournamentStatus } from '../lib/database.types.ts'

import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { CardLink } from '../components/ui/Card.tsx'
import { StatusBadge } from '../components/ui/StatusBadge.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'

/**
 * Display order for the three status groups, with the heading each gets.
 * Ongoing first — that is what someone visiting mid-tournament wants.
 */
const GROUPS: { status: TournamentStatus; heading: string }[] = [
  { status: 'ongoing', heading: 'In progress' },
  { status: 'upcoming', heading: 'Upcoming' },
  { status: 'completed', heading: 'Past tournaments' },
]

export function TournamentsPage() {
  const { data, error, loading } = useSupabaseQuery<Tournament[]>(
    () => supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
    'tournaments',
  )

  return (
    <>
      <PageHeader
        title="Tournaments"
        description="Every competition run by the association, past and upcoming."
      />

      <QueryBoundary loading={loading} error={error} data={data}>
        {(tournaments) =>
          tournaments.length === 0 ? (
            <EmptyState message="No tournaments have been added yet." />
          ) : (
            <div className="space-y-10">
              {GROUPS.map(({ status, heading }) => {
                const group = tournaments.filter((t) => t.status === status)
                if (group.length === 0) return null

                /*
                 * Upcoming reads best soonest-first; the query sorts newest-first
                 * for the completed list, so this group gets reversed.
                 */
                const ordered =
                  status === 'completed' ? group : [...group].reverse()

                return (
                  <section key={status}>
                    <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
                      <span className="rule" aria-hidden="true" />
                      {heading}
                      <span className="text-sm font-normal text-stone-400 tabular-nums">
                        {group.length}
                      </span>
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {ordered.map((tournament) => (
                        <CardLink key={tournament.id} to={`/tournaments/${tournament.id}`}>
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg leading-snug">{tournament.name}</h3>
                            <StatusBadge status={tournament.status} />
                          </div>
                          <dl className="mt-3 space-y-1 text-sm text-stone-600">
                            <div className="flex gap-2">
                              <dt className="sr-only">Dates</dt>
                              <dd>
                                {formatDateRange(
                                  tournament.start_date,
                                  tournament.end_date,
                                )}
                              </dd>
                            </div>
                            {tournament.venue ? (
                              <div className="flex gap-2">
                                <dt className="text-stone-400">Venue</dt>
                                <dd>{tournament.venue}</dd>
                              </div>
                            ) : null}
                            {tournament.format ? (
                              <div className="flex gap-2">
                                <dt className="text-stone-400">Format</dt>
                                <dd>{tournament.format}</dd>
                              </div>
                            ) : null}
                          </dl>
                        </CardLink>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )
        }
      </QueryBoundary>
    </>
  )
}
