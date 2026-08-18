import { Link, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { fetchPlayersByIds, playerIdsInMatches } from '../lib/queries.ts'
import { buildStandings } from '../lib/rankings.ts'
import type { Club, Match, Player, Tournament } from '../lib/database.types.ts'

import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { Markdown } from '../components/Markdown.tsx'
import { MatchList } from '../components/MatchList.tsx'
import { PlayerAvatar } from '../components/PlayerAvatar.tsx'

interface PlayerData {
  player: Player | null
  club: Club | null
  matches: Match[]
  opponents: Map<string, Player>
  tournaments: Tournament[]
}

/**
 * The "no such player" result. A missing row is a 404 to render, not a query
 * error, so it travels as successful data with `player: null`.
 */
const NOT_FOUND: PlayerData = {
  player: null,
  club: null,
  matches: [],
  opponents: new Map(),
  tournaments: [],
}

async function loadPlayer(id: string): Promise<QueryResult<PlayerData>> {
  const [player, matches] = await Promise.all([
    supabase.from('players').select('*').eq('id', id).maybeSingle(),
    /*
     * PostgREST `or` filter — the player may be on either side of a match.
     * The value is a UUID from the route, interpolated into the filter string
     * rather than bound as a parameter, so it is validated as a UUID first by
     * the caller; a non-UUID never reaches here.
     */
    supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${id},player2_id.eq.${id}`)
      .order('played_at', { ascending: false, nullsFirst: false }),
  ])

  const failure = player.error ?? matches.error
  if (failure) return { data: null, error: failure }
  if (!player.data) return { data: NOT_FOUND, error: null }

  const matchRows = matches.data ?? []
  const tournamentIds = [...new Set(matchRows.map((match) => match.tournament_id))]

  const [opponents, club, tournaments] = await Promise.all([
    fetchPlayersByIds(playerIdsInMatches(matchRows)),
    player.data.club_id
      ? supabase.from('clubs').select('*').eq('id', player.data.club_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    tournamentIds.length > 0
      ? supabase.from('tournaments').select('*').in('id', tournamentIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const secondFailure = opponents.error ?? club.error ?? tournaments.error
  if (secondFailure) return { data: null, error: secondFailure }

  return {
    data: {
      player: player.data,
      club: club.data,
      matches: matchRows,
      opponents: opponents.data ?? new Map(),
      tournaments: tournaments.data ?? [],
    } satisfies PlayerData,
    error: null,
  }
}

/** Matches the UUID shape Postgres uses, so a junk route param never builds a filter. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-stone-200/80">
      <dt className="eyebrow text-stone-500">{label}</dt>
      <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-crimson-600 tabular-nums">
        {value}
      </dd>
    </div>
  )
}

export function PlayerPage() {
  const { id = '' } = useParams()
  const valid = UUID.test(id)

  const { data, error, loading } = useSupabaseQuery(
    () =>
      valid
        ? loadPlayer(id)
        : Promise.resolve<QueryResult<PlayerData>>({ data: NOT_FOUND, error: null }),
    `player:${id}`,
  )

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} />

  if (!data?.player) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState message="That player could not be found." />
        <p className="mt-4 text-center">
          <Link to="/players" className="link">
            All players
          </Link>
        </p>
      </div>
    )
  }

  const { player, club, matches, opponents, tournaments } = data

  const [standing] = buildStandings([player], matches)
  const tournamentNames = new Map(tournaments.map((t) => [t.id, t.name]))

  return (
    <>
      <Link
        to="/players"
        className="text-sm font-medium text-crimson-600 transition-colors hover:text-crimson-800"
      >
        <span aria-hidden="true">←</span> All players
      </Link>

      <header className="crest mt-4 mb-8 flex flex-wrap items-center gap-6 rounded-2xl px-6 py-8 shadow-lg shadow-crimson-950/10 sm:px-8">
        <span className="rounded-full ring-4 ring-white/15">
          <PlayerAvatar name={player.name} photoUrl={player.photo_url} size="lg" />
        </span>
        <div>
          <h1 className="text-3xl text-white sm:text-4xl">{player.name}</h1>
          <p className="mt-2 text-crimson-50">
            {club?.name ?? 'Unaffiliated'}
            {player.age !== null ? ` · ${player.age} years old` : ''}
          </p>
        </div>
      </header>

      {/*
        No "highest break" stat here on purpose. `matches.highest_break` records
        the break for the match but not who made it, so showing the best across
        a player's matches would credit their opponent's breaks to them. It is
        shown on individual match rows and as a tournament best — both accurate —
        and becomes a player stat once the schema records the break's owner.
      */}
      <dl className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Played" value={standing.played} />
        <Stat label="Won" value={standing.won} />
        <Stat label="Lost" value={standing.lost} />
        <Stat
          label="Win rate"
          value={standing.winRate === null ? '—' : `${Math.round(standing.winRate * 100)}%`}
        />
      </dl>

      <div className="grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
            <span className="rule" aria-hidden="true" />
            Match history
          </h2>
          {matches.length === 0 ? (
            <EmptyState message="No matches recorded for this player yet." />
          ) : (
            <MatchList
              matches={matches}
              players={opponents}
              tournamentNames={tournamentNames}
            />
          )}
        </section>

        <aside className="space-y-8">
          {player.bio ? (
            <section>
              <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
                <span className="rule" aria-hidden="true" />
                Profile
              </h2>
              <Markdown>{player.bio}</Markdown>
            </section>
          ) : null}

          <section>
            <h2 className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-3 text-xl">
              <span className="rule" aria-hidden="true" />
              Frames
            </h2>
            <dl className="rounded-xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-stone-200/80">
              <div className="flex justify-between py-1">
                <dt className="text-stone-500">Won</dt>
                <dd className="tabular-nums">{standing.framesFor}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-stone-500">Lost</dt>
                <dd className="tabular-nums">{standing.framesAgainst}</dd>
              </div>
              <div className="flex justify-between border-t border-stone-100 py-1 pt-2">
                <dt className="text-stone-500">Difference</dt>
                <dd className="font-semibold tabular-nums">
                  {standing.frameDifference > 0 ? '+' : ''}
                  {standing.frameDifference}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  )
}
