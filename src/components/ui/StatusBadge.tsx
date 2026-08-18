import type { TournamentStatus } from '../../lib/database.types.ts'

/* Gold for what is coming, wreath green for what is live, stone for what is done. */
const STYLES: Record<TournamentStatus, string> = {
  upcoming: 'bg-brass-100 text-brass-700 ring-brass-400/50',
  ongoing: 'bg-laurel-50 text-laurel-700 ring-laurel-400/50',
  completed: 'bg-stone-100 text-stone-600 ring-stone-300',
}

const DOTS: Record<TournamentStatus, string> = {
  upcoming: 'bg-brass-500',
  ongoing: 'bg-laurel-500',
  completed: 'bg-stone-400',
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
  const dot = DOTS[status] ?? DOTS.upcoming
  const label = LABELS[status] ?? status

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ring-1 ring-inset ${style}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${dot} ${
          status === 'ongoing' ? 'animate-pulse' : ''
        }`}
      />
      {label}
    </span>
  )
}
