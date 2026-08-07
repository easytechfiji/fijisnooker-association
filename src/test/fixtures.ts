/**
 * Row builders for tests.
 *
 * Each takes a partial override and fills the rest with schema-plausible
 * defaults, so a test states only the columns it actually cares about. Nothing
 * here is imported by the app — it exists so tests describe intent rather than
 * restating every nullable column.
 */
import type {
  AssociationEvent,
  Club,
  CommitteeMember,
  Match,
  NewsPost,
  Player,
  Tournament,
  TournamentEntry,
} from '../lib/database.types.ts'

let counter = 0
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${String(counter).padStart(4, '0')}`
}

const NOW = '2026-01-01T00:00:00Z'

export function makePlayer(over: Partial<Player> = {}): Player {
  return {
    id: nextId('player'),
    name: 'Test Player',
    age: null,
    club_id: null,
    photo_url: null,
    bio: null,
    created_at: NOW,
    updated_at: NOW,
    ...over,
  }
}

export function makeClub(over: Partial<Club> = {}): Club {
  return { id: nextId('club'), name: 'Test Club', created_at: NOW, ...over }
}

export function makeTournament(over: Partial<Tournament> = {}): Tournament {
  return {
    id: nextId('tournament'),
    name: 'Test Open',
    start_date: '2026-03-14',
    end_date: null,
    venue: null,
    format: null,
    status: 'upcoming',
    created_at: NOW,
    ...over,
  }
}

export function makeEntry(over: Partial<TournamentEntry> = {}): TournamentEntry {
  return {
    id: nextId('entry'),
    tournament_id: 'tournament-0001',
    player_id: 'player-0001',
    seed: null,
    ...over,
  }
}

/** Defaults to an unplayed fixture — pass scores to make it a result. */
export function makeMatch(over: Partial<Match> = {}): Match {
  return {
    id: nextId('match'),
    tournament_id: 'tournament-0001',
    round: null,
    player1_id: null,
    player2_id: null,
    score1: null,
    score2: null,
    highest_break: null,
    winner_id: null,
    played_at: null,
    created_at: NOW,
    ...over,
  }
}

export function makeNewsPost(over: Partial<NewsPost> = {}): NewsPost {
  return {
    id: nextId('post'),
    title: 'Test Post',
    slug: 'test-post',
    body: 'Body text.',
    cover_image_url: null,
    published_at: NOW,
    created_at: NOW,
    ...over,
  }
}

export function makeEvent(over: Partial<AssociationEvent> = {}): AssociationEvent {
  return {
    id: nextId('event'),
    title: 'Test Event',
    event_date: '2026-03-14',
    location: null,
    description: null,
    created_at: NOW,
    ...over,
  }
}

export function makeCommitteeMember(
  over: Partial<CommitteeMember> = {},
): CommitteeMember {
  return {
    id: nextId('member'),
    name: 'Test Member',
    role: 'Committee Member',
    term_start: null,
    term_end: null,
    contact_email: null,
    contact_phone: null,
    created_at: NOW,
    ...over,
  }
}
