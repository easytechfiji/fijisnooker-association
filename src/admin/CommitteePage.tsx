import { useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useAdminResource } from './useAdminResource.ts'
import {
  collect,
  email as emailRule,
  endNotBeforeStart,
  firstOf,
  isValid,
  isoDate,
  required,
  text,
  textOrNull,
} from '../lib/validation.ts'
import { formatShortDate, todayInFiji } from '../lib/format.ts'
import { isCurrent, sortCommittee } from '../lib/committee.ts'
import type { CommitteeMember } from '../lib/database.types.ts'

import { AdminSection, PrimaryButton } from './components/AdminSection.tsx'
import { AdminTable } from './components/AdminTable.tsx'
import { FieldRow, FormPanel } from './components/FormPanel.tsx'
import { TextField } from './components/inputs.tsx'
import { Flash } from './components/Flash.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'

const BLANK = {
  name: '',
  role: '',
  term_start: '',
  term_end: '',
  contact_email: '',
  contact_phone: '',
}

export default function AdminCommitteePage() {
  const resource = useAdminResource<CommitteeMember>({
    table: 'committee_members',
    cacheKey: 'admin-committee',
    load: () => supabase.from('committee_members').select('*'),
  })

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const today = todayInFiji()

  const set = (field: keyof typeof BLANK) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  function open(member: CommitteeMember | 'new') {
    setErrors({})
    setForm(
      member === 'new'
        ? BLANK
        : {
            name: member.name,
            role: member.role,
            term_start: member.term_start ?? '',
            term_end: member.term_end ?? '',
            contact_email: member.contact_email ?? '',
            contact_phone: member.contact_phone ?? '',
          },
    )
    if (member === 'new') resource.startCreate()
    else resource.startEdit(member)
  }

  async function submit() {
    const found = collect({
      name: required(form.name, 'Name'),
      role: required(form.role, 'Role'),
      term_start: isoDate(form.term_start, 'Term start'),
      term_end: firstOf(
        isoDate(form.term_end, 'Term end'),
        endNotBeforeStart(form.term_start, form.term_end, 'Term end'),
      ),
      contact_email: emailRule(form.contact_email),
    })
    setErrors(found)
    if (!isValid(found)) return

    const row = {
      name: text(form.name),
      role: text(form.role),
      term_start: textOrNull(form.term_start),
      term_end: textOrNull(form.term_end),
      contact_email: textOrNull(form.contact_email),
      contact_phone: textOrNull(form.contact_phone),
    }

    const editing = resource.editing
    if (editing === 'new') {
      await resource.save(
        () => supabase.from('committee_members').insert(row),
        'Committee member added.',
      )
    } else if (editing) {
      await resource.save(
        () => supabase.from('committee_members').update(row).eq('id', editing.id),
        'Committee member updated.',
      )
    }
  }

  return (
    <AdminSection
      title="Committee"
      description="Office bearers. Anyone whose term has ended moves to the past list on the public page automatically."
      action={
        resource.editing === null ? (
          <PrimaryButton onClick={() => open('new')}>Add member</PrimaryButton>
        ) : null
      }
    >
      <Flash message={resource.flash} />

      {resource.editing !== null ? (
        <FormPanel
          title={resource.editing === 'new' ? 'New committee member' : 'Edit committee member'}
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
            <TextField
              label="Role"
              value={form.role}
              onChange={set('role')}
              error={errors.role}
              required
              placeholder="President"
              hint="President, Vice President, Secretary and Treasurer sort in that order."
            />
          </FieldRow>

          <FieldRow>
            <TextField
              label="Term start"
              type="date"
              value={form.term_start}
              onChange={set('term_start')}
              error={errors.term_start}
            />
            <TextField
              label="Term end"
              type="date"
              value={form.term_end}
              onChange={set('term_end')}
              error={errors.term_end}
              hint="Leave empty while the member is serving."
            />
          </FieldRow>

          <FieldRow>
            <TextField
              label="Contact email"
              type="email"
              value={form.contact_email}
              onChange={set('contact_email')}
              error={errors.contact_email}
              hint="Published on the public contact page."
            />
            <TextField
              label="Contact phone"
              type="tel"
              value={form.contact_phone}
              onChange={set('contact_phone')}
              hint="Published on the public contact page."
            />
          </FieldRow>
        </FormPanel>
      ) : null}

      {resource.loading ? <Spinner label="Loading committee…" /> : null}
      {resource.loadError ? <ErrorMessage message={resource.loadError} /> : null}

      {!resource.loading && !resource.loadError ? (
        <AdminTable
          rows={sortCommittee(resource.rows)}
          columns={[
            { header: 'Role', cell: (member) => member.role },
            { header: 'Name', cell: (member) => member.name },
            {
              header: 'Term',
              cell: (member) =>
                member.term_start || member.term_end ? (
                  <span className="text-stone-600">
                    {member.term_start ? formatShortDate(member.term_start) : '…'} –{' '}
                    {member.term_end ? formatShortDate(member.term_end) : 'present'}
                  </span>
                ) : (
                  <span className="text-stone-400">—</span>
                ),
            },
            {
              header: 'Status',
              cell: (member) =>
                isCurrent(member, today) ? (
                  <span className="text-crimson-700">Current</span>
                ) : (
                  <span className="text-stone-400">Past</span>
                ),
            },
          ]}
          onEdit={(member) => open(member)}
          onDelete={(member) => void resource.remove(member, 'Committee member deleted.')}
          deleteLabel={(member) => `${member.name} (${member.role})`}
          deleteConsequence={() =>
            'To keep the record, set a term end date instead of deleting.'
          }
          deletingId={resource.deletingId}
          empty="No committee members yet."
        />
      ) : null}
    </AdminSection>
  )
}
