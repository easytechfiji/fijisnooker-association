import type { PostgrestError } from '@supabase/supabase-js'

import { supabase } from './supabase.ts'
import type { Player } from './database.types.ts'

/**
 * Fetches the given players and returns them keyed by id.
 *
 * Pages that show matches need names for the ids on each row. `database.types.ts`
 * declares `Relationships: []` for every table, so PostgREST's embedded-resource
 * syntax (`select('*, player1:players(*)')`) would not type-check — this does the
 * join in one extra round trip instead, which also avoids fetching the same
 * player object once per match.
 *
 * Returns an empty map for an empty id list without touching the network.
 */
export async function fetchPlayersByIds(
  ids: readonly string[],
): Promise<{ data: Map<string, Player> | null; error: PostgrestError | null }> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return { data: new Map(), error: null }

  const { data, error } = await supabase.from('players').select('*').in('id', unique)
  if (error) return { data: null, error }

  return { data: new Map((data ?? []).map((player) => [player.id, player])), error: null }
}

/** Non-null player ids referenced by a set of matches. */
export function playerIdsInMatches(
  matches: readonly { player1_id: string | null; player2_id: string | null }[],
): string[] {
  const ids: string[] = []
  for (const match of matches) {
    if (match.player1_id) ids.push(match.player1_id)
    if (match.player2_id) ids.push(match.player2_id)
  }
  return ids
}
