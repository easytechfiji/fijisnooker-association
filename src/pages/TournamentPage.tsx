import { Link, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { fetchPlayersByIds, playerIdsInMatches } from '../lib/queries.ts'
import { formatDateRange } from '../lib/format.ts'
import { buildStandings, highestBreak, isDecided } from '../lib/rankings.ts'
import type { Match, Player, Tournament, TournamentEntry } from '../lib/database.types.ts'

import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { StatusBadge } from '../components/ui/StatusBadge.tsx'
import { MatchList } from '../components/MatchList.tsx'
import { StandingsTable } from '../components/StandingsTable.tsx'
import { PlayerAvatar } from '../components/PlayerAvatar.tsx'

interface TournamentData {
  tournament: Tournament | null
  entries: TournamentEntry[]
  matches: Match[]
  players: Map<string, Player>
}

async function loadTournament(id: string): Promise<QueryResult<TournamentData>> {
  const [tournament, entries, matches] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).maybeSingle(),
    supabase.from('tournament_entries').select('*').eq('tournament_id', id),
    supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .order('played_at', { ascending: true, nullsFirst: false }),
  ])

  const failure = tournament.error ?? entries.error ?? matches.error
  if (failure) return { data: null, error: failure }

  const matchRows = matches.data ?? []
  const entryRows = entries.data ?? []

  /* The field is everyone entered plus anyone who appears in a result — a
   * match can name a player who was never given an entry row. */
  const players = await fetchPlayersByIds([
    ...entryRows.map((entry) => entry.player_id),
    ...playerIdsInMatches(matchRows),
  ])
  if (players.error) return { data: null, error: players.error }

  return {
    data: {
      tournament: tournament.data,
      entries: entryRows,
      matches: matchRows,
      players: players.data ?? new Map(),
    } satisfies TournamentData,
    error: null,
  }
}

export function TournamentPage() {
  const { id = '' } = useParams()
  const { data, error, loading } = useSupabaseQuery(
    () => loadTournament(id),
    `tournament:${id}`,
  )

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} />

  if (!data?.tournament) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState message="That tournament could not be found." />
        <p className="mt-4 text-center">
          <Link to="/tournaments" className="link">
            All tournaments
          </Link>
        </p>
      </div>
    )
  }

  const { tournament, entries, matches, players } = data

  const field = entries
    .map((entry) => ({ entry, player: players.get(entry.player_id) }))
    .filter((row): row is { entry: TournamentEntry; player: Player } =>
      Boolean(row.player),
    )
    .sort(
      (a, b) =>
        (a.entry.seed ?? Number.MAX_SAFE_INTEGER) -
          (b.entry.seed ?? Number.MAX_SAFE_INTEGER) ||
        a.player.name.localeCompare(b.player.name),
    )

  const played = matches.filter(isDecided)
  const best = highestBreak(matches)
  const standings = buildStandings(
    field.map((row) => row.player),
    matches,
  )

  return (
    <>
      <Link
        to="/tournaments"
        className="text-sm font-medium text-baize-600 transition-colors hover:text-baize-800"
      >
        <span aria-hidden="true">←</span> All tournaments
      </Link>

      <header className="felt mt-4 mb-8 rounded-2xl px-6 py-8 shadow-lg shadow-baize-950/10 sm:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl text-white sm:text-4xl">{tournament.name}</h1>
          <StatusBadge status={tournament.status} />
        </div>

        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 text-sm">
          <div>
            <dt className="eyebrow text-baize-300">Dates</dt>
            <dd className="mt-1 font-medium text-white">
              {formatDateRange(tournament.start_date, tournament.end_date)}
            </dd>
          </div>
          {tournament.venue ? (
            <div>
              <dt className="eyebrow text-baize-300">Venue</dt>
              <dd className="mt-1 font-medium text-white">{tournament.venue}</dd>
            </div>
          ) : null}
          {tournament.format ? (
            <div>
              <dt className="eyebrow text-baize-300">Format</dt>
              <dd className="mt-1 font-medium text-white">{tournament.format}</dd>
            </div>
          ) : null}
          <div>
            <dt className="eyebrow text-baize-300">Matches played</dt>
            <dd className="mt-1 font-medium text-white tabular-nums">
              {played.length} of {matches.length}
            </dd>
          </div>
          {best !== null ? (
            <div>
              <dt className="eyebrow text-baize-300">Highest break</dt>
              <dd className="mt-1 font-bold text-brass-300 tabular-nums">{best}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
            <span className="rule" aria-hidden="true" />
            Results
          </h2>
          {matches.length === 0 ? (
            <EmptyState message="No matches have been recorded for this tournament yet." />
          ) : (
            <MatchList matches={matches} players={players} />
          )}
        </section>

        <aside className="space-y-10">
          <section>
            <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
              <span className="rule" aria-hidden="true" />
              Field
              <span className="text-sm font-normal text-stone-400 tabular-nums">
                {field.length}
              </span>
            </h2>
            {field.length === 0 ? (
              <EmptyState message="No entries recorded." />
            ) : (
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/80">
                {field.map(({ entry, player }) => (
                  <li key={entry.id}>
                    <Link
                      to={`/players/${player.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50"
                    >
                      <PlayerAvatar
                        name={player.name}
                        photoUrl={player.photo_url}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-stone-700">
                        {player.name}
                      </span>
                      {entry.seed !== null ? (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 tabular-nums">
                          Seed {entry.seed}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {played.length > 0 && field.length > 0 ? (
            <section>
              <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
                <span className="rule" aria-hidden="true" />
                Standings
              </h2>
              <StandingsTable standings={standings} compact />
            </section>
          ) : null}
        </aside>
      </div>
    </>
  )
}
