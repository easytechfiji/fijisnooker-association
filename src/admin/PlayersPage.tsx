import { useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import { useAdminResource } from './useAdminResource.ts'
import {
  collect,
  httpUrl,
  intOrNull,
  isValid,
  positiveInteger,
  required,
  text,
  textOrNull,
} from '../lib/validation.ts'
import type { Club, Player } from '../lib/database.types.ts'

import { AdminSection, PrimaryButton } from './components/AdminSection.tsx'
import { AdminTable } from './components/AdminTable.tsx'
import { FieldRow, FormPanel } from './components/FormPanel.tsx'
import { NumberField, SelectField, TextAreaField, TextField } from './components/inputs.tsx'
import { Flash } from './components/Flash.tsx'
import { PlayerAvatar } from '../components/PlayerAvatar.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'

const BLANK = { name: '', age: '', club_id: '', photo_url: '', bio: '' }

export default function AdminPlayersPage() {
  const resource = useAdminResource<Player>({
    table: 'players',
    cacheKey: 'admin-players',
    load: () => supabase.from('players').select('*').order('name', { ascending: true }),
  })

  /* Clubs populate the affiliation dropdown. Loaded separately so adding a club
   * does not require reloading the player list. */
  const clubs = useSupabaseQuery<Club[]>(
    () => supabase.from('clubs').select('*').order('name', { ascending: true }),
    'admin-players-clubs',
  )

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: keyof typeof BLANK) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const clubNames = new Map((clubs.data ?? []).map((club) => [club.id, club.name]))

  function open(player: Player | 'new') {
    setErrors({})
    setForm(
      player === 'new'
        ? BLANK
        : {
            name: player.name,
            age: player.age === null ? '' : String(player.age),
            club_id: player.club_id ?? '',
            photo_url: player.photo_url ?? '',
            bio: player.bio ?? '',
          },
    )
    if (player === 'new') resource.startCreate()
    else resource.startEdit(player)
  }

  async function submit() {
    const found = collect({
      name: required(form.name, 'Name'),
      age: positiveInteger(form.age, 'Age'),
      photo_url: httpUrl(form.photo_url, 'Photo URL'),
    })
    setErrors(found)
    if (!isValid(found)) return

    const age = intOrNull(form.age)
    const row = {
      name: text(form.name),
      age: age === null || Number.isNaN(age) ? null : age,
      club_id: form.club_id === '' ? null : form.club_id,
      photo_url: textOrNull(form.photo_url),
      bio: textOrNull(form.bio),
      /* `updated_at` has a default but no trigger, so an edit would otherwise
       * keep the value set at insert. */
      updated_at: new Date().toISOString(),
    }

    const editing = resource.editing
    if (editing === 'new') {
      await resource.save(() => supabase.from('players').insert(row), 'Player added.')
    } else if (editing) {
      await resource.save(
        () => supabase.from('players').update(row).eq('id', editing.id),
        'Player updated.',
      )
    }
  }

  return (
    <AdminSection
      title="Players"
      description="Profiles shown on the public players page, and the names available when entering results."
      action={
        resource.editing === null ? (
          <PrimaryButton onClick={() => open('new')}>Add player</PrimaryButton>
        ) : null
      }
    >
      <Flash message={resource.flash} />

      {resource.editing !== null ? (
        <FormPanel
          title={resource.editing === 'new' ? 'New player' : 'Edit player'}
          onSubmit={() => void submit()}
          onCancel={resource.cancel}
          error={resource.saveError}
          pending={resource.saving}
        >
          <FieldRow>
            <TextField
              label="Name"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              required
              autoFocus
            />
            <NumberField
              label="Age"
              value={form.age}
              onChange={set('age')}
              error={errors.age}
              min={1}
              max={120}
            />
          </FieldRow>

          <FieldRow>
            <SelectField
              label="Club"
              value={form.club_id}
              onChange={set('club_id')}
              options={(clubs.data ?? []).map((club) => ({
                value: club.id,
                label: club.name,
              }))}
              placeholder="— unaffiliated —"
              hint={
                clubs.data && clubs.data.length === 0
                  ? 'No clubs yet — add them under Clubs first.'
                  : undefined
              }
            />
            <TextField
              label="Photo URL"
              type="url"
              value={form.photo_url}
              onChange={set('photo_url')}
              error={errors.photo_url}
              hint="Upload under Media first, then paste the URL. Initials are shown if empty."
            />
          </FieldRow>

          <TextAreaField
            label="Biography"
            value={form.bio}
            onChange={set('bio')}
            rows={8}
            hint="Markdown. Shown on the player's profile page."
          />
        </FormPanel>
      ) : null}

      {resource.loading ? <Spinner label="Loading players…" /> : null}
      {resource.loadError ? <ErrorMessage message={resource.loadError} /> : null}

      {!resource.loading && !resource.loadError ? (
        <AdminTable
          rows={resource.rows}
          columns={[
            {
              header: 'Player',
              cell: (player) => (
                <span className="flex items-center gap-2">
                  <PlayerAvatar name={player.name} photoUrl={player.photo_url} size="sm" />
                  {player.name}
                </span>
              ),
            },
            {
              header: 'Club',
              cell: (player) =>
                player.club_id ? (
                  (clubNames.get(player.club_id) ?? (
                    <span className="text-stone-400">Unknown club</span>
                  ))
                ) : (
                  <span className="text-stone-400">Unaffiliated</span>
                ),
            },
            {
              header: 'Age',
              numeric: true,
              cell: (player) => player.age ?? <span className="text-stone-400">—</span>,
            },
          ]}
          onEdit={(player) => open(player)}
          onDelete={(player) => void resource.remove(player, 'Player deleted.')}
          deleteLabel={(player) => player.name}
          deleteConsequence={() =>
            'Their tournament entries go too. Match rows are kept but will show “Unknown player”.'
          }
          deletingId={resource.deletingId}
          empty="No players yet."
        />
      ) : null}
    </AdminSection>
  )
}
