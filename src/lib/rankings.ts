import type { Match, Player } from './database.types.ts'

/**
 * Standings derived from match results at read time.
 *
 * `schema.sql` has no `rankings` table, so there is nowhere to persist a
 * computed standing — this recomputes from `matches` on each page load
 * instead. At division scale (tens of players, hundreds of matches) that is a
 * single query and a linear pass, so it stays well ahead of the alternative
 * until the association has years of history. Swapping to a stored table plus
 * the Node.js recalculation service in PROJECT_PLAN.md means adding a table to
 * the schema; this function is what that service would run.
 *
 * Deliberately pure — no Supabase import — so it can be tested against
 * fixtures without a database.
 */

export interface PlayerStanding {
  playerId: string
  name: string
  played: number
  won: number
  lost: number
  drawn: number
  framesFor: number
  framesAgainst: number
  frameDifference: number
  /** 0–1, or null when the player has no completed matches. */
  winRate: number | null
}

/**
 * True once both frame scores are recorded — the match has a *score*.
 */
export function isCompleted(match: Match): boolean {
  return match.score1 !== null && match.score2 !== null
}

/**
 * True once the match has an *outcome*, whether or not the frame scores were
 * kept. A row with players and a date but neither a score nor a winner is a
 * fixture, not a result.
 *
 * These come apart on migrated history: the 2011 divisional final is reported
 * as "Nawaqaliva beat Bala" with no frame score anywhere in the source. That is
 * a real, finished match, so it counts towards wins and losses — it just
 * contributes no frames. Treating it as unplayed would erase a championship;
 * inventing a score to make it look complete would be worse.
 */
export function isDecided(match: Match): boolean {
  return isCompleted(match) || match.winner_id !== null
}

/**
 * Winner of a completed match. Prefers the explicit `winner_id` an admin
 * entered; falls back to whoever took more frames. Returns null for a draw, or
 * when the winning side has no player recorded.
 */
export function winnerOf(match: Match): string | null {
  if (match.winner_id) return match.winner_id
  if (!isCompleted(match)) return null
  if (match.score1 === match.score2) return null
  return match.score1! > match.score2! ? match.player1_id : match.player2_id
}

interface Tally {
  played: number
  won: number
  lost: number
  drawn: number
  framesFor: number
  framesAgainst: number
}

function emptyTally(): Tally {
  return { played: 0, won: 0, lost: 0, drawn: 0, framesFor: 0, framesAgainst: 0 }
}

/**
 * Builds the standings table.
 *
 * Every player passed in appears in the result, including those with no
 * matches yet — a new player should show as 0–0 rather than vanish. Matches
 * referencing a player not in `players` are skipped, which is what happens
 * when the caller has filtered to one tournament's field.
 *
 * Sorted by wins, then frame difference, then frames won, then name. Snooker
 * has no universal points system and the association hasn't specified one, so
 * this orders by results rather than inventing a weighting.
 */
export function buildStandings(players: Player[], matches: Match[]): PlayerStanding[] {
  const tallies = new Map<string, Tally>()
  for (const player of players) {
    tallies.set(player.id, emptyTally())
  }

  for (const match of matches) {
    if (!isDecided(match)) continue

    const { player1_id: p1, player2_id: p2 } = match
    const winner = winnerOf(match)

    /* Frames are only counted where they were actually recorded. A decided but
     * unscored match adds a win and a loss but leaves both frame columns
     * alone, rather than logging a fictitious 0–0. */
    const scored = isCompleted(match)
    const [s1, s2] = scored ? [match.score1!, match.score2!] : [0, 0]

    for (const [id, own, against] of [
      [p1, s1, s2],
      [p2, s2, s1],
    ] as const) {
      if (!id) continue
      const tally = tallies.get(id)
      if (!tally) continue

      tally.played += 1
      tally.framesFor += own
      tally.framesAgainst += against
      if (winner === null) tally.drawn += 1
      else if (winner === id) tally.won += 1
      else tally.lost += 1
    }
  }

  const standings: PlayerStanding[] = players.map((player) => {
    const tally = tallies.get(player.id) ?? emptyTally()
    return {
      playerId: player.id,
      name: player.name,
      played: tally.played,
      won: tally.won,
      lost: tally.lost,
      drawn: tally.drawn,
      framesFor: tally.framesFor,
      framesAgainst: tally.framesAgainst,
      frameDifference: tally.framesFor - tally.framesAgainst,
      winRate: tally.played === 0 ? null : tally.won / tally.played,
    }
  })

  return standings.sort(
    (a, b) =>
      b.won - a.won ||
      b.frameDifference - a.frameDifference ||
      b.framesFor - a.framesFor ||
      a.name.localeCompare(b.name),
  )
}

/**
 * Competition ranks with ties sharing a position (1, 2, 2, 4). Returns the
 * rank for each standing, positionally aligned with the input.
 *
 * Two players tie only when every sorting criterion matches — the name
 * tiebreak in `buildStandings` decides display order but is not a difference
 * in performance, so it does not separate ranks.
 */
export function assignRanks(standings: PlayerStanding[]): number[] {
  const ranks: number[] = []
  for (let i = 0; i < standings.length; i += 1) {
    const current = standings[i]
    const previous = standings[i - 1]
    const tied =
      previous !== undefined &&
      previous.won === current.won &&
      previous.frameDifference === current.frameDifference &&
      previous.framesFor === current.framesFor
    ranks.push(tied ? ranks[i - 1] : i + 1)
  }
  return ranks
}

/** Highest break across a set of matches, or null if none was recorded. */
export function highestBreak(matches: Match[]): number | null {
  let best: number | null = null
  for (const match of matches) {
    if (match.highest_break === null) continue
    if (best === null || match.highest_break > best) best = match.highest_break
  }
  return best
}
