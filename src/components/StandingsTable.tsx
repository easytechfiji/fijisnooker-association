import { Link } from 'react-router-dom'

import type { PlayerStanding } from '../lib/rankings.ts'
import { assignRanks } from '../lib/rankings.ts'

function formatWinRate(rate: number | null): string {
  if (rate === null) return '—'
  return `${Math.round(rate * 100)}%`
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

/**
 * Standings table. `compact` drops the frames columns for the narrow column on
 * the tournament page; the full version is used on /rankings.
 */
export function StandingsTable({
  standings,
  compact = false,
}: {
  standings: PlayerStanding[]
  compact?: boolean
}) {
  const ranks = assignRanks(standings)

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-200/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold tracking-wide text-stone-500 uppercase">
            <th scope="col" className="px-3 py-2 font-medium">
              #
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Player
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              <abbr title="Played">P</abbr>
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              <abbr title="Won">W</abbr>
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              <abbr title="Lost">L</abbr>
            </th>
            {compact ? null : (
              <>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <abbr title="Frames won">FW</abbr>
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <abbr title="Frames lost">FL</abbr>
                </th>
              </>
            )}
            <th scope="col" className="px-3 py-2 text-right font-medium">
              <abbr title="Frame difference">+/−</abbr>
            </th>
            {compact ? null : (
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Win %
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {standings.map((standing, index) => {
            /* The podium gets a gold rail down the left so the top of the
             * table reads at a glance rather than by scanning the rank column. */
            const rank = ranks[index]
            const podium = rank <= 3

            return (
            <tr
              key={standing.playerId}
              className={`transition-colors hover:bg-stone-50 ${
                podium ? 'bg-brass-100/25' : ''
              }`}
            >
              <td
                className={`border-l-2 px-3 py-2.5 font-semibold tabular-nums ${
                  podium
                    ? 'border-brass-400 text-brass-700'
                    : 'border-transparent text-stone-400'
                }`}
              >
                {rank}
              </td>
              <td className="px-3 py-2.5">
                <Link
                  to={`/players/${standing.playerId}`}
                  className="font-medium text-stone-800 hover:text-baize-700 hover:underline"
                >
                  {standing.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{standing.played}</td>
              <td className="px-3 py-2 text-right font-semibold text-baize-700 tabular-nums">
                {standing.won}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{standing.lost}</td>
              {compact ? null : (
                <>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {standing.framesFor}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {standing.framesAgainst}
                  </td>
                </>
              )}
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  standing.frameDifference > 0
                    ? 'text-baize-700'
                    : standing.frameDifference < 0
                      ? 'text-red-700'
                      : 'text-stone-500'
                }`}
              >
                {signed(standing.frameDifference)}
              </td>
              {compact ? null : (
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatWinRate(standing.winRate)}
                </td>
              )}
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
