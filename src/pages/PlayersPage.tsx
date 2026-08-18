import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { excerpt } from '../lib/format.ts'
import type { Club, Player } from '../lib/database.types.ts'

import { PageHeader } from '../components/PageHeader.tsx'
import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { PlayerAvatar } from '../components/PlayerAvatar.tsx'

interface PlayersData {
  players: Player[]
  clubs: Map<string, Club>
}

async function loadPlayers(): Promise<QueryResult<PlayersData>> {
  const [players, clubs] = await Promise.all([
    supabase.from('players').select('*').order('name', { ascending: true }),
    supabase.from('clubs').select('*'),
  ])

  const failure = players.error ?? clubs.error
  if (failure) return { data: null, error: failure }

  return {
    data: {
      players: players.data ?? [],
      clubs: new Map((clubs.data ?? []).map((club) => [club.id, club])),
    } satisfies PlayersData,
    error: null,
  }
}

export function PlayersPage() {
  const { data, error, loading } = useSupabaseQuery(loadPlayers, 'players')
  const [search, setSearch] = useState('')

  /*
   * Filtering happens in the browser rather than as a new query per keystroke.
   * The association has tens of players, not thousands — the whole list is one
   * small request, and searching it locally means no debounce and no loading
   * flicker. Revisit with `.ilike()` and pagination if the roster ever grows
   * past a few hundred.
   */
  const term = search.trim().toLowerCase()
  const visible = useMemo(() => {
    const players = data?.players ?? []
    if (!term) return players
    return players.filter((player) => {
      const club = player.club_id ? data?.clubs.get(player.club_id) : undefined
      return (
        player.name.toLowerCase().includes(term) ||
        (club?.name.toLowerCase().includes(term) ?? false)
      )
    })
  }, [data, term])

  return (
    <>
      <PageHeader
        title="Players"
        description="Profiles for players registered with the association."
      />

      <QueryBoundary loading={loading} error={error} data={data}>
        {({ players, clubs }) =>
          players.length === 0 ? (
            <EmptyState message="No players have been added yet." />
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <label htmlFor="player-search" className="sr-only">
                  Search players
                </label>
                <div className="relative w-full sm:w-72">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
                  >
                    <circle cx="9" cy="9" r="5.5" />
                    <path d="M13 13l4 4" />
                  </svg>
                  <input
                    id="player-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or club"
                    className="w-full rounded-lg bg-white py-2.5 pr-3 pl-9 text-sm shadow-sm ring-1 ring-stone-300 ring-inset transition placeholder:text-stone-400 focus:ring-2 focus:ring-crimson-500 focus:outline-none"
                  />
                </div>
                <p className="text-sm text-stone-500 tabular-nums">
                  {visible.length} of {players.length}
                </p>
              </div>

              {visible.length === 0 ? (
                <EmptyState message={`No players match “${search.trim()}”.`} />
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((player) => {
                    const club = player.club_id ? clubs.get(player.club_id) : undefined
                    return (
                      <li key={player.id}>
                        <Link
                          to={`/players/${player.id}`}
                          className="flex h-full gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-crimson-950/5 hover:ring-crimson-300"
                        >
                          <PlayerAvatar
                            name={player.name}
                            photoUrl={player.photo_url}
                            size="md"
                          />
                          <div className="min-w-0">
                            <h2 className="truncate text-base">{player.name}</h2>
                            <p className="text-sm text-stone-500">
                              {club?.name ?? 'Unaffiliated'}
                              {player.age !== null ? ` · ${player.age}` : ''}
                            </p>
                            {player.bio ? (
                              <p className="mt-1 text-sm text-stone-600">
                                {excerpt(player.bio, 80)}
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )
        }
      </QueryBoundary>
    </>
  )
}
