import { useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useAdminResource } from './useAdminResource.ts'
import { collect, isValid, required, text } from '../lib/validation.ts'
import type { Club } from '../lib/database.types.ts'

import { AdminSection, PrimaryButton } from './components/AdminSection.tsx'
import { AdminTable } from './components/AdminTable.tsx'
import { FormPanel } from './components/FormPanel.tsx'
import { TextField } from './components/inputs.tsx'
import { Flash } from './components/Flash.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'
import { formatShortDate } from '../lib/format.ts'

export default function AdminClubsPage() {
  const resource = useAdminResource<Club>({
    table: 'clubs',
    cacheKey: 'admin-clubs',
    load: () => supabase.from('clubs').select('*').order('name', { ascending: true }),
  })

  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function open(club: Club | 'new') {
    setErrors({})
    setName(club === 'new' ? '' : club.name)
    if (club === 'new') resource.startCreate()
    else resource.startEdit(club)
  }

  async function submit() {
    const found = collect({ name: required(name, 'Club name') })
    setErrors(found)
    if (!isValid(found)) return

    const row = { name: text(name) }

    /* Captured before the branch: narrowing on `resource.editing` does not
     * survive into the closure passed to `save`. */
    const editing = resource.editing
    if (editing === 'new') {
      await resource.save(() => supabase.from('clubs').insert(row), 'Club added.')
    } else if (editing) {
      await resource.save(
        () => supabase.from('clubs').update(row).eq('id', editing.id),
        'Club updated.',
      )
    }
  }

  return (
    <AdminSection
      title="Clubs"
      description="Clubs players can be affiliated with. Referenced by the player form."
      action={
        resource.editing === null ? (
          <PrimaryButton onClick={() => open('new')}>Add club</PrimaryButton>
        ) : null
      }
    >
      <Flash message={resource.flash} />

      {resource.editing !== null ? (
        <FormPanel
          title={resource.editing === 'new' ? 'New club' : 'Edit club'}
          onSubmit={() => void submit()}
          onCancel={resource.cancel}
          error={resource.saveError}
          pending={resource.saving}
        >
          <TextField
            label="Club name"
            value={name}
            onChange={setName}
            error={errors.name}
            required
            autoFocus
            placeholder="Suva Snooker Club"
          />
        </FormPanel>
      ) : null}

      {resource.loading ? <Spinner label="Loading clubs…" /> : null}
      {resource.loadError ? <ErrorMessage message={resource.loadError} /> : null}

      {!resource.loading && !resource.loadError ? (
        <AdminTable
          rows={resource.rows}
          columns={[
            { header: 'Name', cell: (club) => club.name },
            { header: 'Added', cell: (club) => formatShortDate(club.created_at) },
          ]}
          onEdit={(club) => open(club)}
          onDelete={(club) => void resource.remove(club, 'Club deleted.')}
          deleteLabel={(club) => club.name}
          deleteConsequence={() =>
            'Players in this club become unaffiliated; their profiles are kept.'
          }
          deletingId={resource.deletingId}
          empty="No clubs yet."
        />
      ) : null}
    </AdminSection>
  )
}
