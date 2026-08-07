import type { TournamentStatus } from '../../lib/database.types.ts'

const STYLES: Record<TournamentStatus, string> = {
  upcoming: 'bg-brass-300/30 text-brass-600 ring-brass-400/40',
  ongoing: 'bg-baize-100 text-baize-700 ring-baize-400/40',
  completed: 'bg-stone-100 text-stone-600 ring-stone-300',
}

const LABELS: Record<TournamentStatus, string> = {
  upcoming: 'Upcoming',
  ongoing: 'In progress',
  completed: 'Completed',
}

export function StatusBadge({ status }: { status: TournamentStatus }) {
  /*
   * `status` is CHECK-constrained in the schema, but the constraint lives in
   * the database and this value arrives over the wire — fall back rather than
   * render `undefined` if the two ever drift apart.
   */
  const style = STYLES[status] ?? STYLES.upcoming
  const label = LABELS[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  )
}
