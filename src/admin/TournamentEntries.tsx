import { useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { useMutation } from '../hooks/useMutation.ts'
import { intOrNull, nonNegativeInteger } from '../lib/validation.ts'
import type { Player, TournamentEntry } from '../lib/database.types.ts'

import { PrimaryButton } from './components/AdminSection.tsx'
import { NumberField, SelectField } from './components/inputs.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'
import { PlayerAvatar } from '../components/PlayerAvatar.tsx'

interface EntriesData {
  entries: TournamentEntry[]
  players: Player[]
}

async function loadEntries(tournamentId: string): Promise<QueryResult<EntriesData>> {
  const [entries, players] = await Promise.all([
    supabase.from('tournament_entries').select('*').eq('tournament_id', tournamentId),
    supabase.from('players').select('*').order('name', { ascending: true }),
  ])

  const failure = entries.error ?? players.error
  if (failure) return { data: null, error: failure }

  return {
    data: { entries: entries.data ?? [], players: players.data ?? [] },
    error: null,
  }
}

/**
 * The field for one tournament: which players entered, and their seeds.
 *
 * Entries live in their own table with a `unique (tournament_id, player_id)`
 * constraint, so the dropdown only offers players not already entered — the
 * database would reject a duplicate anyway, but an error message is a worse way
 * to learn that than the name simply not being on the list.
 */
export function TournamentEntries({ tournamentId }: { tournamentId: string }) {
  const { data, error, loading, refresh } = useSupabaseQuery(
    () => loadEntries(tournamentId),
    `admin-entries:${tournamentId}`,
  )
  const { run, pending, error: writeError } = useMutation()

  const [playerId, setPlayerId] = useState('')
  const [seed, setSeed] = useState('')
  const [seedError, setSeedError] = useState<string | undefined>()

  const entries = data?.entries ?? []
  const players = data?.players ?? []
  const byId = new Map(players.map((player) => [player.id, player]))

  const entered = new Set(entries.map((entry) => entry.player_id))
  const available = players.filter((player) => !entered.has(player.id))

  const rows = entries
    .map((entry) => ({ entry, player: byId.get(entry.player_id) }))
    .sort(
      (a, b) =>
        (a.entry.seed ?? Number.MAX_SAFE_INTEGER) -
          (b.entry.seed ?? Number.MAX_SAFE_INTEGER) ||
        (a.player?.name ?? '').localeCompare(b.player?.name ?? ''),
    )

  async function add() {
    if (!playerId) return
    const complaint = nonNegativeInteger(seed, 'Seed')
    setSeedError(complaint ?? undefined)
    if (complaint) return

    const parsedSeed = intOrNull(seed)
    const ok = await run(() =>
      supabase.from('tournament_entries').insert({
        tournament_id: tournamentId,
        player_id: playerId,
        seed: parsedSeed === null || Number.isNaN(parsedSeed) ? null : parsedSeed,
      }),
    )

    if (ok) {
      setPlayerId('')
      setSeed('')
      refresh()
    }
  }

  async function remove(entryId: string) {
    const ok = await run(() =>
      supabase.from('tournament_entries').delete().eq('id', entryId),
    )
    if (ok) refresh()
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="mb-1 text-lg">Entrants</h2>
      <p className="mb-4 text-sm text-stone-600">
        Who is playing. Shown as the field on the tournament page, and used for
        that tournament&rsquo;s standings.
      </p>

      {loading ? <Spinner label="Loading entrants…" /> : null}
      {error ? <ErrorMessage message={error} /> : null}

      {!loading && !error ? (
        <>
          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
              Nobody entered yet.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
              {rows.map(({ entry, player }) => (
                <li key={entry.id} className="flex items-center gap-3 px-3 py-2">
                  {player ? (
                    <>
                      <PlayerAvatar
                        name={player.name}
                        photoUrl={player.photo_url}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {player.name}
                      </span>
                    </>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-400">
                      Unknown player
                    </span>
                  )}
                  {entry.seed !== null ? (
                    <span className="text-xs text-stone-500">Seed {entry.seed}</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void remove(entry.id)}
                    disabled={pending}
                    className="rounded px-2 py-1 text-sm text-red-700 hover:bg-red-50 hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_8rem_auto]">
            <SelectField
              label="Add player"
              value={playerId}
              onChange={setPlayerId}
              options={available.map((player) => ({
                value: player.id,
                label: player.name,
              }))}
              placeholder={
                players.length === 0
                  ? '— no players yet —'
                  : available.length === 0
                    ? '— everyone is entered —'
                    : '— choose a player —'
              }
              disabled={available.length === 0}
            />
            <NumberField
              label="Seed"
              value={seed}
              onChange={setSeed}
              error={seedError}
              min={0}
              disabled={available.length === 0}
            />
            <div className="pb-0.5">
              <PrimaryButton onClick={() => void add()} disabled={!playerId || pending}>
                Add
              </PrimaryButton>
            </div>
          </div>

          {writeError ? (
            <div className="mt-3">
              <ErrorMessage message={writeError} />
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
