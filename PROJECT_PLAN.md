# Fiji Southern Snooker Association — website rebuild

## Context

Rebuilding fijisnooker.wordpress.com, a WordPress.com blog for the Fiji
Southern Division Billiards & Snooker Association that hasn't been touched
since 2011. The old site is unstructured blog posts — tournament results,
AGM notices, committee news — with no queryable data, one static player
profile, and a calendar widget that doesn't plot anything.

## Stack

- **Frontend:** React (Vite, or Next.js if SEO on news posts matters)
- **Backend:** Supabase (Postgres + Auth + Storage) for almost everything;
  a small Node.js service only for logic that needs it (e.g. recalculating
  rankings after a match result is entered, sending notifications)
- **Hosting:** Vercel or Netlify for the React app, Supabase managed cloud
  for the backend, existing Namecheap domain pointed at the host via DNS

## Content the site needs to hold

- General/static info: about, history, clubs, committee, contact
- **Players** — profiles, stats, achievements (dynamic, many players)
- **Tournaments** — name, dates, venue, format, status
- **Matches/results** — scores, breaks, winners, tied to a tournament
- **Rankings** — derived from match results
- **News** — replaces the old blog posts
- **Events** — for an actual working calendar
- **Media** — tournament/event photos

## Admin approach (decided)

Custom admin panel/form built into the React app — not direct Supabase
table editing. Protected routes, requires login. Right now it's a single
admin (site owner); designed so more committee members can be added later
without rebuilding anything, just by adding rows to the `admins` table.

## Database schema

See `schema.sql` (in this same folder) — run once in the Supabase SQL
editor. Tables: `admins`, `clubs`, `players`, `committee_members`,
`tournaments`, `tournament_entries`, `matches`, `news_posts`, `events`,
`media`.

## Security model

- **SQL injection:** closed off by construction — always use the Supabase
  client (parameterized under the hood) or parameterized queries in any
  custom Node.js code. Never build raw SQL by concatenating user input.
- **Row Level Security (RLS):** on by default on every table. Public can
  `SELECT` everything; only rows matching `public.is_admin()` (a
  `security definer` function checking the `admins` table) can
  `INSERT`/`UPDATE`/`DELETE`. The database enforces this itself, not just
  the app — so even if the public API key leaks, writes are still blocked.
- **Keys:** `anon` key is safe for the browser (respects RLS).
  `service_role` key bypasses RLS entirely — server-side only, never in
  React code, never committed to git.
- **XSS:** sanitize any rich text (news post bodies, bios) before
  rendering — restrict to Markdown/plain text, or run HTML through
  DOMPurify before display.
- **File uploads:** validate type/size client-side for UX, enforce again
  via Supabase Storage policies — never trust the client alone.
- **Auth:** Supabase Auth handles password hashing/sessions; rate limiting
  on login is built in.
- **Data integrity:** CHECK constraints at the schema level (e.g.
  `score >= 0`) so bad data can't get in even via a manual edit.
- **HTTPS:** automatic once deployed on Vercel/Netlify with the custom domain.

## Admin bootstrap step (manual, one-time)

After the app is live: sign up for an account through the app's own auth
flow, then in Supabase Studio's table editor add one row to `admins` with
that user's ID from `auth.users`. That row is what makes the account an
admin — everything after that happens through the admin panel.

## Build phases

1. Run `schema.sql` in Supabase, confirm it applies cleanly
2. Scaffold the React app (routing for public pages + protected admin routes)
3. Build public pages: Home/news feed, Tournaments, Players, Rankings,
   Calendar, About/Committee/Contact
4. Build admin panel: forms for tournaments, match results, players, news,
   committee members, events, media uploads
5. Migrate old content: port the ~9 existing WordPress posts into
   `news_posts`, expand the one existing player profile into the `players`
   table
6. Deploy: React app to Vercel/Netlify, connect the Namecheap domain via DNS
7. Bootstrap the admin account (see above), test the full add-tournament-
   to-it-shows-on-site flow end to end

## Old site content to migrate

Source: https://fijisnooker.wordpress.com/ — ~9 posts from 2009-2011
(tournament results, AGM notice, committee election writeup, championship
announcements), one player profile (Praneel Singh), committee info
scattered across post text (Jay Kalyan - President, Abid Ali & Deepak Bala
- VP, Ashneel Nand - Secretary, Anup Kumar - Treasurer as of 2011 — verify
these are still current before migrating).
