import type { ReactNode } from 'react'

import { DeleteButton } from './DeleteButton.tsx'

export interface Column<T> {
  header: string
  /** Cell contents. Return a string for plain text or a node for markup. */
  cell: (row: T) => ReactNode
  /** Right-align numeric columns. */
  numeric?: boolean
}

/**
 * The list view every admin section shows: columns plus Edit and Delete.
 *
 * Generic over the row type so each section keeps its own typed columns rather
 * than casting through `any` to share one table.
 */
export function AdminTable<T extends { id: string }>({
  rows,
  columns,
  onEdit,
  onDelete,
  deleteLabel,
  deleteConsequence,
  deletingId,
  empty,
}: {
  rows: T[]
  columns: Column<T>[]
  onEdit: (row: T) => void
  onDelete: (row: T) => void
  /** Names the record in the delete confirmation. */
  deleteLabel: (row: T) => string
  deleteConsequence?: (row: T) => string | undefined
  deletingId: string | null
  empty: string
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-stone-300 px-4 py-10 text-center text-stone-500">
        {empty}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs tracking-wide text-stone-500 uppercase">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`px-4 py-2 font-medium ${column.numeric ? 'text-right' : ''}`}
              >
                {column.header}
              </th>
            ))}
            <th scope="col" className="px-4 py-2 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.id} className="align-top hover:bg-stone-50">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={`px-4 py-2.5 ${column.numeric ? 'text-right tabular-nums' : ''}`}
                >
                  {column.cell(row)}
                </td>
              ))}
              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="rounded px-2 py-1 text-sm text-baize-700 hover:bg-baize-50 hover:underline"
                >
                  Edit
                </button>
                <DeleteButton
                  onDelete={() => onDelete(row)}
                  label={deleteLabel(row)}
                  consequence={deleteConsequence?.(row)}
                  pending={deletingId === row.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
