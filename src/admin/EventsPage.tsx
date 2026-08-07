import { useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useAdminResource } from './useAdminResource.ts'
import { collect, firstOf, isValid, isoDate, required, text, textOrNull } from '../lib/validation.ts'
import { formatShortDate } from '../lib/format.ts'
import type { AssociationEvent } from '../lib/database.types.ts'

import { AdminSection, PrimaryButton } from './components/AdminSection.tsx'
import { AdminTable } from './components/AdminTable.tsx'
import { FieldRow, FormPanel } from './components/FormPanel.tsx'
import { TextAreaField, TextField } from './components/inputs.tsx'
import { Flash } from './components/Flash.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'

const BLANK = { title: '', event_date: '', location: '', description: '' }

export default function AdminEventsPage() {
  const resource = useAdminResource<AssociationEvent>({
    table: 'events',
    cacheKey: 'admin-events',
    load: () =>
      supabase.from('events').select('*').order('event_date', { ascending: false }),
  })

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (field: keyof typeof BLANK) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  function open(event: AssociationEvent | 'new') {
    setErrors({})
    setForm(
      event === 'new'
        ? BLANK
        : {
            title: event.title,
            event_date: event.event_date,
            location: event.location ?? '',
            description: event.description ?? '',
          },
    )
    if (event === 'new') resource.startCreate()
    else resource.startEdit(event)
  }

  async function submit() {
    const found = collect({
      title: required(form.title, 'Title'),
      event_date: firstOf(
        required(form.event_date, 'Date'),
        isoDate(form.event_date, 'Date'),
      ),
    })
    setErrors(found)
    if (!isValid(found)) return

    const row = {
      title: text(form.title),
      event_date: text(form.event_date),
      location: textOrNull(form.location),
      description: textOrNull(form.description),
    }

    const editing = resource.editing
    if (editing === 'new') {
      await resource.save(() => supabase.from('events').insert(row), 'Event added.')
    } else if (editing) {
      await resource.save(
        () => supabase.from('events').update(row).eq('id', editing.id),
        'Event updated.',
      )
    }
  }

  return (
    <AdminSection
      title="Events"
      description="Fixtures, meetings and anything else that should appear on the public calendar."
      action={
        resource.editing === null ? (
          <PrimaryButton onClick={() => open('new')}>Add event</PrimaryButton>
        ) : null
      }
    >
      <Flash message={resource.flash} />

      {resource.editing !== null ? (
        <FormPanel
          title={resource.editing === 'new' ? 'New event' : 'Edit event'}
          onSubmit={() => void submit()}
          onCancel={resource.cancel}
          error={resource.saveError}
          pending={resource.saving}
        >
          <FieldRow>
            <TextField
              label="Title"
              value={form.title}
              onChange={set('title')}
              error={errors.title}
              required
              autoFocus
              placeholder="Annual General Meeting"
            />
            <TextField
              label="Date"
              type="date"
              value={form.event_date}
              onChange={set('event_date')}
              error={errors.event_date}
              required
            />
          </FieldRow>

          <TextField
            label="Location"
            value={form.location}
            onChange={set('location')}
            placeholder="Suva Snooker Club"
          />

          <TextAreaField
            label="Description"
            value={form.description}
            onChange={set('description')}
            rows={3}
            hint="Plain text. Shown under the event on the calendar page."
          />
        </FormPanel>
      ) : null}

      {resource.loading ? <Spinner label="Loading events…" /> : null}
      {resource.loadError ? <ErrorMessage message={resource.loadError} /> : null}

      {!resource.loading && !resource.loadError ? (
        <AdminTable
          rows={resource.rows}
          columns={[
            { header: 'Date', cell: (event) => formatShortDate(event.event_date) },
            { header: 'Title', cell: (event) => event.title },
            {
              header: 'Location',
              cell: (event) => event.location ?? <span className="text-stone-400">—</span>,
            },
          ]}
          onEdit={(event) => open(event)}
          onDelete={(event) => void resource.remove(event, 'Event deleted.')}
          deleteLabel={(event) => event.title}
          deletingId={resource.deletingId}
          empty="No events yet. Added events appear on the public calendar."
        />
      ) : null}
    </AdminSection>
  )
}
