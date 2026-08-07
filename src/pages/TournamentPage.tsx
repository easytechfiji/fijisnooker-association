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
          <Link
            to="/tournaments"
            className="text-baize-700 underline underline-offset-2 hover:text-baize-500"
          >
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
        className="text-sm text-baize-700 underline underline-offset-2 hover:text-baize-500"
      >
        ← All tournaments
      </Link>

      <header className="mt-4 mb-8 border-b border-stone-200 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{tournament.name}</h1>
          <StatusBadge status={tournament.status} />
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-stone-400">Dates</dt>
            <dd className="text-stone-700">
              {formatDateRange(tournament.start_date, tournament.end_date)}
            </dd>
          </div>
          {tournament.venue ? (
            <div>
              <dt className="text-stone-400">Venue</dt>
              <dd className="text-stone-700">{tournament.venue}</dd>
            </div>
          ) : null}
          {tournament.format ? (
            <div>
              <dt className="text-stone-400">Format</dt>
              <dd className="text-stone-700">{tournament.format}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-stone-400">Matches played</dt>
            <dd className="text-stone-700">
              {played.length} of {matches.length}
            </dd>
          </div>
          {best !== null ? (
            <div>
              <dt className="text-stone-400">Highest break</dt>
              <dd className="font-semibold text-brass-600">{best}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-4 text-xl">Results</h2>
          {matches.length === 0 ? (
            <EmptyState message="No matches have been recorded for this tournament yet." />
          ) : (
            <MatchList matches={matches} players={players} />
          )}
        </section>

        <aside className="space-y-10">
          <section>
            <h2 className="mb-4 text-xl">Field</h2>
            {field.length === 0 ? (
              <EmptyState message="No entries recorded." />
            ) : (
              <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
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
                        <span className="text-xs text-stone-400">
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
              <h2 className="mb-4 text-xl">Tournament standings</h2>
              <StandingsTable standings={standings} compact />
            </section>
          ) : null}
        </aside>
      </div>
    </>
  )
}
