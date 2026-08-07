import { useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useAdminResource } from './useAdminResource.ts'
import {
  collect,
  endNotBeforeStart,
  firstOf,
  isValid,
  isoDate,
  required,
  text,
  textOrNull,
} from '../lib/validation.ts'
import { formatDateRange } from '../lib/format.ts'
import type { Tournament, TournamentStatus } from '../lib/database.types.ts'

import { AdminSection, PrimaryButton } from './components/AdminSection.tsx'
import { AdminTable } from './components/AdminTable.tsx'
import { FieldRow, FormPanel } from './components/FormPanel.tsx'
import { SelectField, TextField } from './components/inputs.tsx'
import { Flash } from './components/Flash.tsx'
import { TournamentEntries } from './TournamentEntries.tsx'
import { StatusBadge } from '../components/ui/StatusBadge.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'

const BLANK = {
  name: '',
  start_date: '',
  end_date: '',
  venue: '',
  format: '',
  status: 'upcoming' as TournamentStatus | '',
}

/** Mirrors `check (status in ('upcoming', 'ongoing', 'completed'))`. */
const STATUSES: { value: TournamentStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

function isStatus(value: string): value is TournamentStatus {
  return STATUSES.some((status) => status.value === value)
}

export default function AdminTournamentsPage() {
  const resource = useAdminResource<Tournament>({
    table: 'tournaments',
    cacheKey: 'admin-tournaments',
    load: () =>
      supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
  })

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: keyof typeof BLANK) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  function open(tournament: Tournament | 'new') {
    setErrors({})
    setForm(
      tournament === 'new'
        ? BLANK
        : {
            name: tournament.name,
            start_date: tournament.start_date,
            end_date: tournament.end_date ?? '',
            venue: tournament.venue ?? '',
            format: tournament.format ?? '',
            status: tournament.status,
          },
    )
    if (tournament === 'new') resource.startCreate()
    else resource.startEdit(tournament)
  }

  async function submit() {
    const found = collect({
      name: required(form.name, 'Name'),
      start_date: firstOf(
        required(form.start_date, 'Start date'),
        isoDate(form.start_date, 'Start date'),
      ),
      end_date: firstOf(
        isoDate(form.end_date, 'End date'),
        endNotBeforeStart(form.start_date, form.end_date),
      ),
      status: isStatus(form.status) ? null : 'Choose a status.',
    })
    setErrors(found)
    if (!isValid(found)) return
    if (!isStatus(form.status)) return

    const row = {
      name: text(form.name),
      start_date: text(form.start_date),
      end_date: textOrNull(form.end_date),
      venue: textOrNull(form.venue),
      format: textOrNull(form.format),
      status: form.status,
    }

    const editing = resource.editing
    if (editing === 'new') {
      await resource.save(
        () => supabase.from('tournaments').insert(row),
        'Tournament added. Open it again to add entrants.',
      )
    } else if (editing) {
      await resource.save(
        () => supabase.from('tournaments').update(row).eq('id', editing.id),
        'Tournament updated.',
      )
    }
  }

  const editingExisting =
    resource.editing !== null && resource.editing !== 'new' ? resource.editing : null

  return (
    <AdminSection
      title="Tournaments"
      description="Competitions, their dates and who is entered."
      action={
        resource.editing === null ? (
          <PrimaryButton onClick={() => open('new')}>Add tournament</PrimaryButton>
        ) : null
      }
    >
      <Flash message={resource.flash} />

      {resource.editing !== null ? (
        <FormPanel
          title={resource.editing === 'new' ? 'New tournament' : 'Edit tournament'}
          onSubmit={() => void submit()}
          onCancel={resource.cancel}
          error={resource.saveError}
          pending={resource.saving}
        >
          <TextField
            label="Name"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
            required
            autoFocus
            placeholder="Suva Open 2026"
          />

          <FieldRow>
            <TextField
              label="Start date"
              type="date"
              value={form.start_date}
              onChange={set('start_date')}
              error={errors.start_date}
              required
            />
            <TextField
              label="End date"
              type="date"
              value={form.end_date}
              onChange={set('end_date')}
              error={errors.end_date}
              hint="Leave empty for a one-day tournament."
            />
          </FieldRow>

          <FieldRow>
            <TextField
              label="Venue"
              value={form.venue}
              onChange={set('venue')}
              placeholder="Suva Snooker Club"
            />
            <TextField
              label="Format"
              value={form.format}
              onChange={set('format')}
              placeholder="Best of 5 frames, knockout"
            />
          </FieldRow>

          <SelectField
            label="Status"
            value={form.status}
            onChange={set('status')}
            options={STATUSES}
            error={errors.status}
            required
            placeholder="— choose —"
            hint="Groups the tournament on the public page. Set to Completed once results are final."
          />
        </FormPanel>
      ) : null}

      {/* Entries need a tournament id, so they only appear once it exists. */}
      {editingExisting ? (
        <div className="mb-8">
          <TournamentEntries tournamentId={editingExisting.id} />
        </div>
      ) : null}

      {resource.loading ? <Spinner label="Loading tournaments…" /> : null}
      {resource.loadError ? <ErrorMessage message={resource.loadError} /> : null}

      {!resource.loading && !resource.loadError ? (
        <AdminTable
          rows={resource.rows}
          columns={[
            { header: 'Name', cell: (tournament) => tournament.name },
            {
              header: 'Dates',
              cell: (tournament) =>
                formatDateRange(tournament.start_date, tournament.end_date),
            },
            {
              header: 'Venue',
              cell: (tournament) =>
                tournament.venue ?? <span className="text-stone-400">—</span>,
            },
            {
              header: 'Status',
              cell: (tournament) => <StatusBadge status={tournament.status} />,
            },
          ]}
          onEdit={(tournament) => open(tournament)}
          onDelete={(tournament) => void resource.remove(tournament, 'Tournament deleted.')}
          deleteLabel={(tournament) => tournament.name}
          deleteConsequence={() =>
            'Every match result and entry for it is deleted too, and cannot be recovered.'
          }
          deletingId={resource.deletingId}
          empty="No tournaments yet."
        />
      ) : null}
    </AdminSection>
  )
}
