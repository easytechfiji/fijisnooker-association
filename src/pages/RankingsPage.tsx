import { useMemo, useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { buildStandings } from '../lib/rankings.ts'
import type { Match, Player, Tournament } from '../lib/database.types.ts'

import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { StandingsTable } from '../components/StandingsTable.tsx'

interface RankingsData {
  players: Player[]
  matches: Match[]
  tournaments: Tournament[]
}

async function loadRankings(): Promise<QueryResult<RankingsData>> {
  const [players, matches, tournaments] = await Promise.all([
    supabase.from('players').select('*'),
    supabase.from('matches').select('*'),
    supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
  ])

  const failure = players.error ?? matches.error ?? tournaments.error
  if (failure) return { data: null, error: failure }

  return {
    data: {
      players: players.data ?? [],
      matches: matches.data ?? [],
      tournaments: tournaments.data ?? [],
    } satisfies RankingsData,
    error: null,
  }
}

const ALL = 'all'

export function RankingsPage() {
  const { data, error, loading } = useSupabaseQuery(loadRankings, 'rankings')
  const [tournamentId, setTournamentId] = useState(ALL)

  const standings = useMemo(() => {
    if (!data) return []
    const matches =
      tournamentId === ALL
        ? data.matches
        : data.matches.filter((match) => match.tournament_id === tournamentId)

    const all = buildStandings(data.players, matches)
    /* A player with no matches in the selected scope has nothing to rank —
     * show the field that actually competed rather than a tail of zeroes. */
    return all.filter((standing) => standing.played > 0)
  }, [data, tournamentId])

  return (
    <>
      <PageHeader
        title="Rankings"
        description="Standings across all recorded matches, ordered by wins, then frame difference."
      />

      <QueryBoundary loading={loading} error={error} data={data}>
        {({ tournaments }) => (
          <>
            {tournaments.length > 0 ? (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <label
                  htmlFor="ranking-scope"
                  className="text-sm font-medium text-stone-600"
                >
                  Show
                </label>
                <select
                  id="ranking-scope"
                  value={tournamentId}
                  onChange={(event) => setTournamentId(event.target.value)}
                  className="max-w-full rounded-lg bg-white px-3 py-2.5 text-sm shadow-sm ring-1 ring-stone-300 ring-inset transition focus:ring-2 focus:ring-baize-500 focus:outline-none"
                >
                  <option value={ALL}>All tournaments</option>
                  {tournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {standings.length === 0 ? (
              <EmptyState message="No completed matches yet, so there is nothing to rank. Rankings appear once results are entered." />
            ) : (
              <>
                <StandingsTable standings={standings} />
                <p className="mt-4 text-sm text-stone-500">
                  Calculated from match results each time this page loads. A match
                  counts once both frame scores have been entered; ties share a
                  position.
                </p>
              </>
            )}
          </>
        )}
      </QueryBoundary>
    </>
  )
}
