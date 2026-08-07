-- ============================================================
-- Fiji Southern Snooker Association — database schema
-- Run this in the Supabase SQL editor (Studio → SQL Editor → New query)
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. ADMINS
-- Presence of a row here = that Supabase Auth user can write.
-- Starts with just you; add more rows later for committee members.
-- No public policies on this table on purpose — it's only ever
-- edited by you directly in Supabase Studio using your own login,
-- which has full access regardless of RLS.
-- ------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Helper function: checks if the currently logged-in user is an admin.
-- SECURITY DEFINER means this function runs with elevated rights, so it
-- can read the admins table even though admins itself has no public
-- read policy. Every other table's policies call this function instead
-- of repeating the admin check inline everywhere.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- 2. CLUBS
-- ------------------------------------------------------------
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

create policy "Public can view clubs"
  on public.clubs for select
  using (true);

create policy "Admins can manage clubs"
  on public.clubs for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 3. PLAYERS
-- ------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age int check (age is null or age > 0),
  club_id uuid references public.clubs(id) on delete set null,
  photo_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "Public can view players"
  on public.players for select
  using (true);

create policy "Admins can manage players"
  on public.players for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 4. COMMITTEE MEMBERS
-- ------------------------------------------------------------
create table public.committee_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  term_start date,
  term_end date,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

alter table public.committee_members enable row level security;

create policy "Public can view committee"
  on public.committee_members for select
  using (true);

create policy "Admins can manage committee"
  on public.committee_members for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 5. TOURNAMENTS
-- ------------------------------------------------------------
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date,
  venue text,
  format text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'ongoing', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

create policy "Public can view tournaments"
  on public.tournaments for select
  using (true);

create policy "Admins can manage tournaments"
  on public.tournaments for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 6. TOURNAMENT ENTRIES (which players are in which tournament)
-- ------------------------------------------------------------
create table public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  seed int,
  unique (tournament_id, player_id)
);

alter table public.tournament_entries enable row level security;

create policy "Public can view entries"
  on public.tournament_entries for select
  using (true);

create policy "Admins can manage entries"
  on public.tournament_entries for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 7. MATCHES / RESULTS
-- ------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round text,
  player1_id uuid references public.players(id),
  player2_id uuid references public.players(id),
  score1 int check (score1 >= 0),
  score2 int check (score2 >= 0),
  highest_break int check (highest_break >= 0),
  winner_id uuid references public.players(id),
  played_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.matches enable row level security;

create policy "Public can view matches"
  on public.matches for select
  using (true);

create policy "Admins can manage matches"
  on public.matches for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 8. NEWS POSTS
-- ------------------------------------------------------------
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  body text not null,
  cover_image_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.news_posts enable row level security;

create policy "Public can view news"
  on public.news_posts for select
  using (true);

create policy "Admins can manage news"
  on public.news_posts for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 9. EVENTS (for the calendar)
-- ------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  location text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Public can view events"
  on public.events for select
  using (true);

create policy "Admins can manage events"
  on public.events for all
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 10. MEDIA (tournament / event photos)
-- ------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  tournament_id uuid references public.tournaments(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.media enable row level security;

create policy "Public can view media"
  on public.media for select
  using (true);

create policy "Admins can manage media"
  on public.media for all
  using (public.is_admin())
  with check (public.is_admin());
