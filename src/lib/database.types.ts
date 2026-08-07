/**
 * Row shapes mirroring schema.sql.
 *
 * Hand-written rather than generated, so the types live in this repo next to
 * the schema they describe. Nothing enforces the correspondence — if schema.sql
 * changes, change this file too.
 *
 * Postgres `date` and `timestamptz` both arrive over PostgREST as ISO-8601
 * strings, so both are typed `string`.
 *
 * Every row type below is a `type` alias, not an `interface`, and that is load
 * bearing. postgrest-js constrains a schema's tables to `Record<string,
 * unknown>`, and TypeScript only gives *type aliases* an implicit index
 * signature — an interface never satisfies that constraint. Declare one of
 * these as an interface and the whole schema silently stops matching
 * `GenericSchema`, which makes `select()` resolve to `never` and every property
 * access on a query result a compile error. See `npx tsc` output for
 * "Property 'name' does not exist on type 'never'" if this ever regresses.
 */

/** Columns Postgres fills in itself, so an insert may omit them. */
type WithDefaults<Row, K extends keyof Row> = Omit<Row, K> & Partial<Pick<Row, K>>

type TableDef<Row, Insert> = {
  Row: Row
  Insert: Insert
  Update: Partial<Row>
  Relationships: []
}

/** Mirrors the CHECK constraint on tournaments.status. */
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed'

export type Admin = {
  user_id: string
  created_at: string
}

export type Club = {
  id: string
  name: string
  created_at: string
}

export type Player = {
  id: string
  name: string
  age: number | null
  club_id: string | null
  photo_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export type CommitteeMember = {
  id: string
  name: string
  role: string
  term_start: string | null
  term_end: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
}

export type Tournament = {
  id: string
  name: string
  start_date: string
  end_date: string | null
  venue: string | null
  format: string | null
  status: TournamentStatus
  created_at: string
}

export type TournamentEntry = {
  id: string
  tournament_id: string
  player_id: string
  seed: number | null
}

export type Match = {
  id: string
  tournament_id: string
  round: string | null
  player1_id: string | null
  player2_id: string | null
  score1: number | null
  score2: number | null
  highest_break: number | null
  winner_id: string | null
  played_at: string | null
  created_at: string
}

export type NewsPost = {
  id: string
  title: string
  slug: string
  body: string
  cover_image_url: string | null
  published_at: string
  created_at: string
}

/** Named to avoid colliding with the DOM's global `Event`. */
export type AssociationEvent = {
  id: string
  title: string
  event_date: string
  location: string | null
  description: string | null
  created_at: string
}

export type MediaItem = {
  id: string
  url: string
  caption: string | null
  tournament_id: string | null
  event_id: string | null
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      admins: TableDef<Admin, WithDefaults<Admin, 'created_at'>>
      clubs: TableDef<Club, WithDefaults<Club, 'id' | 'created_at'>>
      players: TableDef<Player, WithDefaults<Player, 'id' | 'created_at' | 'updated_at'>>
      committee_members: TableDef<
        CommitteeMember,
        WithDefaults<CommitteeMember, 'id' | 'created_at'>
      >
      tournaments: TableDef<
        Tournament,
        WithDefaults<Tournament, 'id' | 'status' | 'created_at'>
      >
      tournament_entries: TableDef<TournamentEntry, WithDefaults<TournamentEntry, 'id'>>
      matches: TableDef<Match, WithDefaults<Match, 'id' | 'created_at'>>
      news_posts: TableDef<
        NewsPost,
        WithDefaults<NewsPost, 'id' | 'published_at' | 'created_at'>
      >
      events: TableDef<AssociationEvent, WithDefaults<AssociationEvent, 'id' | 'created_at'>>
      media: TableDef<MediaItem, WithDefaults<MediaItem, 'id' | 'created_at'>>
    }
    /*
     * These must be `{ [_ in never]: never }`, not `Record<string, never>`.
     * postgrest-js resolves a relation as `Tables & Views`, so a string index
     * signature on `Views` intersects every table with `never` and `select('*')`
     * comes back typed as `never`. The empty mapped type has no index
     * signature, so the intersection leaves `Tables` alone. This is the same
     * shape `supabase gen types` emits.
     */
    Views: { [_ in never]: never }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
