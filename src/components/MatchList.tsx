import { Link } from 'react-router-dom'

import type { Match, Player } from '../lib/database.types.ts'
import { formatShortDate, formatScore } from '../lib/format.ts'
import { isCompleted, isDecided, winnerOf } from '../lib/rankings.ts'

/**
 * One side of a match. Links to the player's profile when the id resolves;
 * falls back to "Unknown player" for an id whose row has since been deleted
 * (matches.player1_id has no ON DELETE clause, so this is reachable), and to
 * "TBC" for a fixture with no player set yet.
 */
function Side({
  playerId,
  players,
  isWinner,
  align,
}: {
  playerId: string | null
  players: Map<string, Player>
  isWinner: boolean
  align: 'left' | 'right'
}) {
  const player = playerId ? players.get(playerId) : undefined
  const classes = `min-w-0 truncate ${align === 'right' ? 'text-right' : ''} ${
    isWinner ? 'font-semibold text-baize-800' : 'text-stone-700'
  }`

  if (!playerId) return <span className={`${classes} text-stone-400`}>TBC</span>
  if (!player) return <span className={`${classes} text-stone-400`}>Unknown player</span>

  return (
    <Link to={`/players/${player.id}`} className={`${classes} hover:underline`}>
      {player.name}
    </Link>
  )
}

/**
 * Match results as a table. Used on both the tournament and player pages, so
 * the round column can be hidden where every row shares a round, and the
 * tournament name shown where rows span several tournaments.
 */
export function MatchList({
  matches,
  players,
  tournamentNames,
}: {
  matches: Match[]
  players: Map<string, Player>
  /** Supply to add a tournament column — for the player profile's history. */
  tournamentNames?: Map<string, string>
}) {
  return (
    <ul className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
      {matches.map((match) => {
        const winner = winnerOf(match)
        const decided = isDecided(match)
        const scored = isCompleted(match)

        return (
          <li key={match.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Side
                  playerId={match.player1_id}
                  players={players}
                  isWinner={decided && winner === match.player1_id}
                  align="left"
                />
                <span
                  className={`rounded px-2 py-0.5 text-sm font-semibold tabular-nums ${
                    scored ? 'bg-baize-50 text-baize-800' : 'text-stone-400'
                  }`}
                >
                  {formatScore(match.score1, match.score2)}
                </span>
                <Side
                  playerId={match.player2_id}
                  players={players}
                  isWinner={decided && winner === match.player2_id}
                  align="right"
                />
              </div>
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
              {tournamentNames && tournamentNames.has(match.tournament_id) ? (
                <Link
                  to={`/tournaments/${match.tournament_id}`}
                  className="hover:underline"
                >
                  {tournamentNames.get(match.tournament_id)}
                </Link>
              ) : null}
              {match.round ? <span>{match.round}</span> : null}
              {match.played_at ? <span>{formatShortDate(match.played_at)}</span> : null}
              {match.highest_break !== null ? (
                <span className="text-brass-600">
                  Highest break {match.highest_break}
                </span>
              ) : null}
              {decided && !scored ? (
                <span className="text-stone-400">Frame score not recorded</span>
              ) : null}
              {!decided ? <span className="text-stone-400">Not yet played</span> : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
