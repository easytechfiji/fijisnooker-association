import { useMemo, useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { useAdminResource } from './useAdminResource.ts'
import {
  atMost,
  collect,
  differentPlayers,
  firstOf,
  intOrNull,
  isValid,
  nonNegativeInteger,
  required,
  textOrNull,
  winnerIsInMatch,
  winnerMatchesScore,
} from '../lib/validation.ts'
import { fijiLocalToIso, isoToFijiLocal } from '../lib/datetime.ts'
import { formatScore, formatShortDate } from '../lib/format.ts'
import type { Match, Player, Tournament, TournamentEntry } from '../lib/database.types.ts'

import { AdminSection, PrimaryButton } from './components/AdminSection.tsx'
import { AdminTable } from './components/AdminTable.tsx'
import { FieldRow, FormPanel } from './components/FormPanel.tsx'
import { NumberField, SelectField, TextField } from './components/inputs.tsx'
import type { Option } from './components/inputs.tsx'
import { Flash } from './components/Flash.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'

const BLANK = {
  tournament_id: '',
  round: '',
  player1_id: '',
  player2_id: '',
  score1: '',
  score2: '',
  highest_break: '',
  winner_id: '',
  played_at: '',
}

/** The maximum break in snooker. SQL only knows the value must be >= 0. */
const MAX_BREAK = 147

const ALL = 'all'

interface Context {
  tournaments: Tournament[]
  players: Player[]
  entries: TournamentEntry[]
}

async function loadContext(): Promise<QueryResult<Context>> {
  const [tournaments, players, entries] = await Promise.all([
    supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
    supabase.from('players').select('*').order('name', { ascending: true }),
    supabase.from('tournament_entries').select('*'),
  ])

  const failure = tournaments.error ?? players.error ?? entries.error
  if (failure) return { data: null, error: failure }

  return {
    data: {
      tournaments: tournaments.data ?? [],
      players: players.data ?? [],
      entries: entries.data ?? [],
    },
    error: null,
  }
}

export default function AdminMatchesPage() {
  const resource = useAdminResource<Match>({
    table: 'matches',
    cacheKey: 'admin-matches',
    load: () =>
      supabase
        .from('matches')
        .select('*')
        .order('played_at', { ascending: false, nullsFirst: false }),
  })

  const context = useSupabaseQuery(loadContext, 'admin-matches-context')

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState(ALL)

  const set = (field: keyof typeof BLANK) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const tournaments = context.data?.tournaments ?? []
  const players = context.data?.players ?? []

  const playerNames = new Map(players.map((player) => [player.id, player.name]))
  const tournamentNames = new Map(tournaments.map((t) => [t.id, t.name]))

  /**
   * Players offered for the two dropdowns: whoever is entered in the selected
   * tournament first, then everyone else. A result can legitimately involve
   * someone without an entry row, so the rest of the roster stays available
   * rather than being hidden.
   */
  const playerOptions = useMemo((): Option[] => {
    /* Read from `context.data` rather than the `?? []` locals above: those are
     * fresh arrays on every render, which would defeat the memo entirely. */
    const all = context.data?.players ?? []
    if (!form.tournament_id) {
      return all.map((player) => ({ value: player.id, label: player.name }))
    }

    const entered = new Set(
      (context.data?.entries ?? [])
        .filter((entry) => entry.tournament_id === form.tournament_id)
        .map((entry) => entry.player_id),
    )

    return [
      ...all
        .filter((player) => entered.has(player.id))
        .map((player) => ({ value: player.id, label: player.name })),
      ...all
        .filter((player) => !entered.has(player.id))
        .map((player) => ({ value: player.id, label: `${player.name} (not entered)` })),
    ]
  }, [form.tournament_id, context.data])

  /** The winner can only be one of the two players actually in the match. */
  const winnerOptions: Option[] = [form.player1_id, form.player2_id]
    .filter((id): id is string => id !== '')
    .map((id) => ({ value: id, label: playerNames.get(id) ?? 'Unknown player' }))

  function open(match: Match | 'new') {
    setErrors({})
    setForm(
      match === 'new'
        ? { ...BLANK, tournament_id: filter === ALL ? '' : filter }
        : {
            tournament_id: match.tournament_id,
            round: match.round ?? '',
            player1_id: match.player1_id ?? '',
            player2_id: match.player2_id ?? '',
            score1: match.score1 === null ? '' : String(match.score1),
            score2: match.score2 === null ? '' : String(match.score2),
            highest_break:
              match.highest_break === null ? '' : String(match.highest_break),
            winner_id: match.winner_id ?? '',
            played_at: isoToFijiLocal(match.played_at),
          },
    )
    if (match === 'new') resource.startCreate()
    else resource.startEdit(match)
  }

  /** Fills the winner from the scores, so the usual case is one click. */
  function applyScoreWinner() {
    const s1 = intOrNull(form.score1)
    const s2 = intOrNull(form.score2)
    if (s1 === null || s2 === null || Number.isNaN(s1) || Number.isNaN(s2)) return
    if (s1 === s2) return
    set('winner_id')(s1 > s2 ? form.player1_id : form.player2_id)
  }

  async function submit() {
    const found = collect({
      tournament_id: required(form.tournament_id, 'Tournament'),
      player1_id: firstOf(
        required(form.player1_id, 'First player'),
        differentPlayers(form.player1_id, form.player2_id),
      ),
      player2_id: required(form.player2_id, 'Second player'),
      score1: nonNegativeInteger(form.score1, 'First score'),
      score2: nonNegativeInteger(form.score2, 'Second score'),
      highest_break: firstOf(
        nonNegativeInteger(form.highest_break, 'Highest break'),
        atMost(form.highest_break, MAX_BREAK, 'Highest break'),
      ),
      winner_id: firstOf(
        winnerIsInMatch(form.winner_id, form.player1_id, form.player2_id),
        winnerMatchesScore(
          form.winner_id,
          form.player1_id,
          form.player2_id,
          form.score1,
          form.score2,
        ),
      ),
      played_at:
        form.played_at !== '' && fijiLocalToIso(form.played_at) === null
          ? 'The date and time could not be read.'
          : null,
    })
    setErrors(found)
    if (!isValid(found)) return

    const number = (value: string) => {
      const parsed = intOrNull(value)
      return parsed === null || Number.isNaN(parsed) ? null : parsed
    }

    const row = {
      tournament_id: form.tournament_id,
      round: textOrNull(form.round),
      player1_id: form.player1_id || null,
      player2_id: form.player2_id || null,
      score1: number(form.score1),
      score2: number(form.score2),
      highest_break: number(form.highest_break),
      winner_id: form.winner_id || null,
      played_at: form.played_at === '' ? null : fijiLocalToIso(form.played_at),
    }

    const editing = resource.editing
    if (editing === 'new') {
      await resource.save(() => supabase.from('matches').insert(row), 'Result saved.')
    } else if (editing) {
      await resource.save(
        () => supabase.from('matches').update(row).eq('id', editing.id),
        'Result updated.',
      )
    }
  }

  const visible =
    filter === ALL
      ? resource.rows
      : resource.rows.filter((match) => match.tournament_id === filter)

  const bothScoresEntered =
    form.score1 !== '' && form.score2 !== '' && form.player1_id !== '' && form.player2_id !== ''

  return (
    <AdminSection
      title="Match results"
      description="Results feed the rankings. A match counts once both frame scores are entered — leave them empty to record a fixture."
      action={
        resource.editing === null ? (
          <PrimaryButton onClick={() => open('new')} disabled={tournaments.length === 0}>
            Add result
          </PrimaryButton>
        ) : null
      }
    >
      <Flash message={resource.flash} />

      {context.error ? <ErrorMessage message={context.error} /> : null}

      {!context.loading && tournaments.length === 0 ? (
        <p className="mb-6 rounded-md border border-brass-300 bg-brass-300/15 px-4 py-3 text-sm text-brass-600">
          Add a tournament first — every match belongs to one.
        </p>
      ) : null}

      {resource.editing !== null ? (
        <FormPanel
          title={resource.editing === 'new' ? 'New result' : 'Edit result'}
          onSubmit={() => void submit()}
          onCancel={resource.cancel}
          error={resource.saveError}
          pending={resource.saving}
        >
          <FieldRow>
            <SelectField
              label="Tournament"
              value={form.tournament_id}
              onChange={set('tournament_id')}
              options={tournaments.map((tournament) => ({
                value: tournament.id,
                label: tournament.name,
              }))}
              error={errors.tournament_id}
              required
              placeholder="— choose a tournament —"
            />
            <TextField
              label="Round"
              value={form.round}
              onChange={set('round')}
              placeholder="Quarter-final"
            />
          </FieldRow>

          <FieldRow>
            <SelectField
              label="First player"
              value={form.player1_id}
              onChange={set('player1_id')}
              options={playerOptions}
              error={errors.player1_id}
              required
              placeholder="— choose a player —"
            />
            <SelectField
              label="Second player"
              value={form.player2_id}
              onChange={set('player2_id')}
              options={playerOptions}
              error={errors.player2_id}
              required
              placeholder="— choose a player —"
            />
          </FieldRow>

          <FieldRow>
            <NumberField
              label="Frames won by the first player"
              value={form.score1}
              onChange={set('score1')}
              error={errors.score1}
              min={0}
            />
            <NumberField
              label="Frames won by the second player"
              value={form.score2}
              onChange={set('score2')}
              error={errors.score2}
              min={0}
            />
          </FieldRow>

          <div>
            <SelectField
              label="Winner"
              value={form.winner_id}
              onChange={set('winner_id')}
              options={winnerOptions}
              error={errors.winner_id}
              placeholder={
                winnerOptions.length === 0
                  ? '— choose both players first —'
                  : '— derive from the scores —'
              }
              disabled={winnerOptions.length === 0}
              hint="Only needed for a walkover or a correction — otherwise the scores decide it."
            />
            {bothScoresEntered ? (
              <button
                type="button"
                onClick={applyScoreWinner}
                className="mt-1.5 text-xs text-baize-700 underline underline-offset-2 hover:text-baize-500"
              >
                Set the winner from the scores
              </button>
            ) : null}
          </div>

          <FieldRow>
            <NumberField
              label="Highest break"
              value={form.highest_break}
              onChange={set('highest_break')}
              error={errors.highest_break}
              min={0}
              max={MAX_BREAK}
              hint="The break made in this match, by either player — the schema does not record whose."
            />
            <TextField
              label="Played at"
              type="datetime-local"
              value={form.played_at}
              onChange={set('played_at')}
              error={errors.played_at}
              hint="Fiji time. Leave empty for a fixture not yet played."
            />
          </FieldRow>
        </FormPanel>
      ) : null}

      {tournaments.length > 0 ? (
        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="match-filter" className="text-sm text-stone-600">
            Show
          </label>
          <select
            id="match-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-baize-500 focus:outline-none"
          >
            <option value={ALL}>All tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-stone-500">
            {visible.length} {visible.length === 1 ? 'match' : 'matches'}
          </span>
        </div>
      ) : null}

      {resource.loading || context.loading ? <Spinner label="Loading results…" /> : null}
      {resource.loadError ? <ErrorMessage message={resource.loadError} /> : null}

      {!resource.loading && !context.loading && !resource.loadError ? (
        <AdminTable
          rows={visible}
          columns={[
            {
              header: 'Tournament',
              cell: (match) =>
                tournamentNames.get(match.tournament_id) ?? (
                  <span className="text-stone-400">Unknown</span>
                ),
            },
            {
              header: 'Round',
              cell: (match) => match.round ?? <span className="text-stone-400">—</span>,
            },
            {
              header: 'Match',
              cell: (match) => (
                <span>
                  {match.player1_id ? (
                    (playerNames.get(match.player1_id) ?? 'Unknown')
                  ) : (
                    <span className="text-stone-400">TBC</span>
                  )}
                  <span className="mx-2 font-semibold tabular-nums">
                    {formatScore(match.score1, match.score2)}
                  </span>
                  {match.player2_id ? (
                    (playerNames.get(match.player2_id) ?? 'Unknown')
                  ) : (
                    <span className="text-stone-400">TBC</span>
                  )}
                </span>
              ),
            },
            {
              header: 'Break',
              numeric: true,
              cell: (match) =>
                match.highest_break ?? <span className="text-stone-400">—</span>,
            },
            {
              header: 'Played',
              cell: (match) =>
                match.played_at ? (
                  formatShortDate(match.played_at)
                ) : (
                  <span className="text-stone-400">Not yet</span>
                ),
            },
          ]}
          onEdit={(match) => open(match)}
          onDelete={(match) => void resource.remove(match, 'Result deleted.')}
          deleteLabel={(match) =>
            `${match.player1_id ? (playerNames.get(match.player1_id) ?? '?') : 'TBC'} v ${
              match.player2_id ? (playerNames.get(match.player2_id) ?? '?') : 'TBC'
            }`
          }
          deleteConsequence={() => 'The rankings recalculate without it.'}
          deletingId={resource.deletingId}
          empty={
            filter === ALL
              ? 'No results yet.'
              : 'No results for that tournament yet.'
          }
        />
      ) : null}
    </AdminSection>
  )
}
