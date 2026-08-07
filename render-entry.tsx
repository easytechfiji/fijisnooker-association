/**
 * Temporary verification entry point (Phase 3).
 *
 * Lives inside the project so `react-router-dom` resolves to the same module
 * instance the app imports — loading StaticRouter from `react-router` instead
 * gives a second router context and every route throws.
 */
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

import App from './src/App.tsx'
import { AuthProvider } from './src/auth/AuthProvider.tsx'
import { AdminTable } from './src/admin/components/AdminTable.tsx'
import { DeleteButton } from './src/admin/components/DeleteButton.tsx'
import { FieldRow, FormPanel } from './src/admin/components/FormPanel.tsx'
import { NumberField, SelectField, TextField } from './src/admin/components/inputs.tsx'
import { Flash } from './src/admin/components/Flash.tsx'

function wrap(node: ReactNode, path = '/') {
  return renderToString(<StaticRouter location={path}>{node}</StaticRouter>)
}

export function renderRoute(path: string) {
  return wrap(
    <AuthProvider>
      <App />
    </AuthProvider>,
    path,
  )
}

/**
 * Renders once to kick off every lazy import, waits for them, then renders
 * again — otherwise renderToString only ever produces the Suspense fallback.
 */
export async function warmLazyRoutes(paths: string[]) {
  for (const path of paths) {
    try {
      renderRoute(path)
    } catch {
      /* The thrown promise is the point; ignore it. */
    }
  }
  for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 20))
}

export function renderForm() {
  return wrap(
    <FormPanel
      title="New tournament"
      onSubmit={() => {}}
      onCancel={() => {}}
      error="The database refused this change."
      pending={false}
    >
      <TextField
        label="Name"
        value="Suva Open 2026"
        onChange={() => {}}
        required
      />
      <FieldRow>
        <TextField label="Start date" type="date" value="2026-03-14" onChange={() => {}} required />
        <TextField
          label="End date"
          type="date"
          value=""
          onChange={() => {}}
          error="End date cannot be before the start date."
          hint="Leave empty for a one-day tournament."
        />
      </FieldRow>
      <NumberField label="Seed" value="" onChange={() => {}} min={0} />
      <SelectField
        label="Status"
        value="ongoing"
        onChange={() => {}}
        required
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'ongoing', label: 'In progress' },
        ]}
      />
    </FormPanel>,
  )
}

interface Row {
  id: string
  name: string
  count: number
}

export function renderTable(empty = false) {
  const rows: Row[] = empty
    ? []
    : [
        { id: '1', name: 'Suva Open 2026', count: 12 },
        { id: '2', name: 'Nausori Classic', count: 8 },
      ]

  return wrap(
    <AdminTable
      rows={rows}
      columns={[
        { header: 'Name', cell: (row) => row.name },
        { header: 'Entrants', numeric: true, cell: (row) => row.count },
      ]}
      onEdit={() => {}}
      onDelete={() => {}}
      deleteLabel={(row) => row.name}
      deleteConsequence={() => 'Results go too.'}
      deletingId={null}
      empty="No tournaments yet."
    />,
  )
}

export function renderFlash() {
  return wrap(<Flash message="Tournament updated." />)
}

/**
 * Only the resting state. The confirmation step is driven by useState, which
 * renderToString never advances — verifying it needs a DOM.
 */
export function renderDeleteButton() {
  return wrap(
    <DeleteButton onDelete={() => {}} label="Suva Open 2026" consequence="Results go too." />,
  )
}
