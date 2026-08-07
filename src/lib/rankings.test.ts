import { describe, expect, it } from 'vitest'

import {
  assignRanks,
  buildStandings,
  highestBreak,
  isCompleted,
  isDecided,
  winnerOf,
} from './rankings.ts'
import { makeMatch, makePlayer } from '../test/fixtures.ts'

const alice = makePlayer({ id: 'a', name: 'Alice Nand' })
const bob = makePlayer({ id: 'b', name: 'Bob Kumar' })
const cara = makePlayer({ id: 'c', name: 'Cara Ali' })

/** A completed match between two players. */
function result(p1: string, p2: string, s1: number, s2: number, over = {}) {
  return makeMatch({ player1_id: p1, player2_id: p2, score1: s1, score2: s2, ...over })
}

describe('isCompleted', () => {
  it('treats a match with both scores as played', () => {
    expect(isCompleted(result('a', 'b', 5, 3))).toBe(true)
  })

  it('treats a scheduled fixture as not played', () => {
    expect(isCompleted(makeMatch({ player1_id: 'a', player2_id: 'b' }))).toBe(false)
  })

  it('counts 0–0 as played, since 0 is a real score', () => {
    expect(isCompleted(result('a', 'b', 0, 0))).toBe(true)
  })

  it('does not count a half-entered result', () => {
    expect(isCompleted(makeMatch({ score1: 5, score2: null }))).toBe(false)
  })
})

describe('isDecided', () => {
  it('accepts a scored match', () => {
    expect(isDecided(result('a', 'b', 5, 3))).toBe(true)
  })

  it('accepts a recorded winner with no frame score', () => {
    // The migrated 2011 divisional final: the source names the winner but no
    // frame score survives anywhere.
    expect(
      isDecided(makeMatch({ player1_id: 'a', player2_id: 'b', winner_id: 'a' })),
    ).toBe(true)
  })

  it('still rejects a scheduled fixture', () => {
    expect(isDecided(makeMatch({ player1_id: 'a', player2_id: 'b' }))).toBe(false)
  })
})

describe('winnerOf', () => {
  it('derives the winner from the scores', () => {
    expect(winnerOf(result('a', 'b', 5, 3))).toBe('a')
    expect(winnerOf(result('a', 'b', 2, 6))).toBe('b')
  })

  it('prefers an explicitly recorded winner over the scores', () => {
    // A walkover or a correction entered by an admin should stand.
    expect(winnerOf(result('a', 'b', 5, 3, { winner_id: 'b' }))).toBe('b')
  })

  it('reports no winner for a draw', () => {
    expect(winnerOf(result('a', 'b', 4, 4))).toBeNull()
  })

  it('reports no winner for an unplayed fixture', () => {
    expect(winnerOf(makeMatch({ player1_id: 'a', player2_id: 'b' }))).toBeNull()
  })
})

describe('buildStandings', () => {
  it('counts a decided but unscored match without inventing frames', () => {
    const standings = buildStandings(
      [alice, bob],
      [makeMatch({ player1_id: 'a', player2_id: 'b', winner_id: 'a' })],
    )
    const a = standings.find((s) => s.playerId === 'a')!
    const b = standings.find((s) => s.playerId === 'b')!

    expect(a.played).toBe(1)
    expect(a.won).toBe(1)
    expect(b.lost).toBe(1)
    // No frame score existed, so neither frame column moves.
    expect(a.framesFor).toBe(0)
    expect(a.framesAgainst).toBe(0)
    expect(b.frameDifference).toBe(0)
  })

  it('tallies played, won, lost and frames', () => {
    const standings = buildStandings(
      [alice, bob],
      [result('a', 'b', 5, 3), result('b', 'a', 5, 1)],
    )
    const byId = Object.fromEntries(standings.map((s) => [s.playerId, s]))

    expect(byId.a).toMatchObject({
      played: 2,
      won: 1,
      lost: 1,
      framesFor: 6,
      framesAgainst: 8,
      frameDifference: -2,
    })
    expect(byId.b).toMatchObject({ played: 2, won: 1, lost: 1, frameDifference: 2 })
  })

  it('includes a player with no matches rather than dropping them', () => {
    const [only] = buildStandings([cara], [])
    expect(only).toMatchObject({ played: 0, won: 0, winRate: null })
  })

  it('ignores unplayed fixtures', () => {
    const standings = buildStandings(
      [alice, bob],
      [makeMatch({ player1_id: 'a', player2_id: 'b' })],
    )
    expect(standings.every((s) => s.played === 0)).toBe(true)
  })

  it('ignores matches whose players are outside the given field', () => {
    // This is what a tournament page passes: only that tournament's entrants.
    const standings = buildStandings([alice], [result('b', 'c', 5, 0)])
    expect(standings).toHaveLength(1)
    expect(standings[0].played).toBe(0)
  })

  it('counts a draw as played for both and won for neither', () => {
    const standings = buildStandings([alice, bob], [result('a', 'b', 4, 4)])
    for (const standing of standings) {
      expect(standing).toMatchObject({ played: 1, won: 0, lost: 0, drawn: 1 })
    }
  })

  it('still counts a match where only one player was recorded', () => {
    const standings = buildStandings(
      [alice],
      [makeMatch({ player1_id: 'a', player2_id: null, score1: 5, score2: 0 })],
    )
    expect(standings[0]).toMatchObject({ played: 1, won: 1 })
  })

  it('orders by wins, then frame difference', () => {
    const standings = buildStandings(
      [alice, bob, cara],
      [
        result('b', 'c', 5, 0), // Bob 1
        result('b', 'a', 5, 4), // Bob 2
        result('a', 'c', 5, 0), // Alice 1, big margin
        result('c', 'a', 5, 4), // Cara 1, small margin
      ],
    )
    expect(standings.map((s) => s.playerId)).toEqual(['b', 'a', 'c'])
  })

  it('breaks a full tie by name so the order is stable', () => {
    const standings = buildStandings([bob, alice], [])
    expect(standings.map((s) => s.name)).toEqual(['Alice Nand', 'Bob Kumar'])
  })

  it('computes win rate as a fraction of matches played', () => {
    const standings = buildStandings(
      [alice, bob],
      [result('a', 'b', 5, 0), result('a', 'b', 5, 0), result('b', 'a', 5, 0)],
    )
    const byId = Object.fromEntries(standings.map((s) => [s.playerId, s]))
    expect(byId.a.winRate).toBeCloseTo(2 / 3)
    expect(byId.b.winRate).toBeCloseTo(1 / 3)
  })

  it('does not mutate the matches it is given', () => {
    const matches = [result('a', 'b', 5, 3)]
    const snapshot = structuredClone(matches)
    buildStandings([alice, bob], matches)
    expect(matches).toEqual(snapshot)
  })
})

describe('assignRanks', () => {
  const standing = (over: Record<string, unknown>) => ({
    playerId: 'x',
    name: 'X',
    played: 0,
    won: 0,
    lost: 0,
    drawn: 0,
    framesFor: 0,
    framesAgainst: 0,
    frameDifference: 0,
    winRate: null,
    ...over,
  })

  it('gives tied players the same rank and skips the next', () => {
    const ranks = assignRanks([
      standing({ won: 3, frameDifference: 5, framesFor: 15 }),
      standing({ won: 3, frameDifference: 5, framesFor: 15 }),
      standing({ won: 1, frameDifference: -5, framesFor: 5 }),
    ])
    expect(ranks).toEqual([1, 1, 3])
  })

  it('separates players who differ on any criterion', () => {
    const ranks = assignRanks([
      standing({ won: 3, frameDifference: 6, framesFor: 15 }),
      standing({ won: 3, frameDifference: 5, framesFor: 15 }),
    ])
    expect(ranks).toEqual([1, 2])
  })

  it('returns an empty list for no standings', () => {
    expect(assignRanks([])).toEqual([])
  })
})

describe('highestBreak', () => {
  it('returns the maximum recorded break', () => {
    expect(
      highestBreak([
        makeMatch({ highest_break: 32 }),
        makeMatch({ highest_break: null }),
        makeMatch({ highest_break: 71 }),
      ]),
    ).toBe(71)
  })

  it('returns null when no break was recorded', () => {
    expect(highestBreak([makeMatch(), makeMatch()])).toBeNull()
  })

  it('distinguishes a recorded break of 0 from no break at all', () => {
    expect(highestBreak([makeMatch({ highest_break: 0 })])).toBe(0)
  })
})
