# Southern Division Billiards and Snooker Association Fiji

Website for the Southern Division Billiards and Snooker Association Fiji —
tournaments, results, rankings, players, news and a working calendar.

Replaces [fijisnooker.wordpress.com](https://fijisnooker.wordpress.com/), a blog
last updated in 2011. See `PROJECT_PLAN.md` for the full brief and
`schema.sql` for the database.

## Stack

- **React 19 + TypeScript**, built with **Vite 8**
- **Tailwind CSS v4** for styling
- **Supabase** — Postgres, Auth and Storage
- **react-router-dom** for routing, **react-markdown** for post bodies

## Setup

Requires Node.js 20.19+ (developed on 24).

```bash
npm install
```

### 1. Set up the database

**The short way.** Paste `setup.sql` into Supabase Studio → SQL Editor and run
it. That is everything in one go: tables, Row Level Security, the storage
bucket and its policies, the 2009–2011 archive, and your admin grant. It needs
**one edit** — the email address in section 5 — and prints a summary table at
the end telling you what landed.

It is safe on a database that is already set up. Every statement is idempotent,
so running it twice changes nothing and will not overwrite edits made in the
admin panel. Verified by executing it twice against a real Postgres — see
`check-sql.mjs`.

**The modular way**, if you would rather apply things separately:

| File                | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `schema.sql`        | Tables, RLS policies, `public.is_admin()`           |
| `storage.sql`       | The `media` bucket and its policies                 |
| `seed-content.sql`  | The migrated WordPress archive                      |

Run them in that order. `setup.sql` is the same content combined, with
`if not exists` guards added; `schema.sql` is kept exactly as originally
written and is the canonical definition of the schema.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in both values from Supabase Studio → Project Settings → API:

| Variable                 | Value                              |
| ------------------------ | ---------------------------------- |
| `VITE_SUPABASE_URL`      | Project URL                        |
| `VITE_SUPABASE_ANON_KEY` | `anon` / publishable key           |

**Never put the `service_role` (or `sb_secret_…`) key here.** It bypasses Row
Level Security, and every `VITE_*` variable is compiled into the JavaScript
served to visitors. `src/lib/supabase.ts` inspects the key at startup and
refuses to run if it detects a privileged one.

`.env.local` is gitignored. Do not commit it.

### 3. Run it

```bash
npm run dev
```

If the environment variables are missing or wrong, the site is replaced by an
explanation of what to fix rather than failing one request at a time.

## Becoming an admin

Admin rights come from a row in the `admins` table — not from a flag on the
account, and not from anything in this codebase.

1. Create the account: Studio → Authentication → Users → **Add user**. Tick
   "Auto Confirm User" so you can sign in straight away.
2. Grant it admin rights. Rather than copying the UUID by hand, run this in the
   SQL editor with your own email:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```

   `admins` has exactly two columns — `user_id` and `created_at`. There is no
   `email` column; the address lives in `auth.users` and the join above is how
   you get from one to the other.

3. Sign in at `/admin/login`.

Signing in without that row gets you a "this account is not an admin" screen,
and the database would reject its writes regardless. Adding further committee
members later needs nothing more than another row.

To confirm it worked without clicking through the UI:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... node verify-setup.mjs
```

See the next section for what that checks.

## Scripts

| Command           | Does                                     |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Dev server with hot reload               |
| `npm run build`   | Type-check (`tsc -b`) then bundle        |
| `npm run preview` | Serve the production build locally       |
| `npm run lint`    | oxlint                                   |
| `npm test`        | Vitest, one run                          |
| `npm run test:watch` | Vitest in watch mode                  |

Three standalone checks that need no browser:

- **`node check-sql.mjs`** runs `setup.sql` against a real Postgres (PGlite,
  compiled to WASM) and asserts on the result — twice over, since the file's
  main promise is that re-applying it is safe. Run this after editing any SQL.
  Needs a one-off `npm install --no-save @electric-sql/pglite`.


- **`node render-check.mjs`** server-renders every route and asserts on the
  output. Catches the class of mistake type-checking cannot — a component that
  throws once it actually runs. Uses a dummy Supabase key; touches no network.
- **`node verify-setup.mjs`** runs against your **real** Supabase project. It
  confirms `schema.sql` and `storage.sql` applied, that RLS refuses anonymous
  writes, and — given admin credentials — performs the whole
  add-a-tournament-and-see-it-on-the-site flow that `PROJECT_PLAN.md` phase 7
  asks for, then deletes everything it created.

  ```bash
  node verify-setup.mjs                                    # read-only checks
  ADMIN_EMAIL=… ADMIN_PASSWORD=… node verify-setup.mjs     # + the write flow
  ```

  Credentials come from the environment so they are never written to a file.
  Rows it creates are prefixed `[verify]` and removed in a `finally` block; it
  deletes only by the ids it generated, so it will not touch real data.

  The write half uses two separate clients: an authenticated one to create the
  tournament, and an anonymous one to read it back. That distinction is the
  whole point — an admin reading its own writes proves nothing about what the
  public can see.

## Layout

```
src/
  lib/         Supabase client, row types mirroring schema.sql, and the pure
               helpers: rankings, calendar arithmetic, formatting, committee order
  auth/        Session context, useAuth, and the RequireAdmin route gate
  components/  Layout, nav, Markdown renderer, MatchList, StandingsTable, UI pieces
  hooks/       useSupabaseQuery
  pages/       Public pages
  admin/       Admin panel behind RequireAdmin
```

Business logic lives in `src/lib/` as pure functions rather than inside
components, so it can be checked without a browser — `rankings.ts` in
particular, since it is what a stored-rankings service would eventually run.

### Two type-level traps in `src/lib/database.types.ts`

Both cause `select()` to resolve to `never`, which surfaces as dozens of
"Property 'name' does not exist on type 'never'" errors far from the cause:

- Row types must be `type` aliases, **not** `interface`. postgrest-js constrains
  tables to `Record<string, unknown>`, and only type aliases get an implicit
  index signature.
- `Views` must be `{ [_ in never]: never }`, **not** `Record<string, never>`.
  postgrest-js resolves a relation as `Tables & Views`, so a string index
  signature there intersects every table with `never`.

Multi-query loader functions on page components also need an explicit
`Promise<QueryResult<T>>` return type; without it TypeScript infers a union
across the `return` statements and narrows `T` to `never` at the call site.

## Security notes

These follow the model in `PROJECT_PLAN.md`. The short version:

- **The database enforces access, not the app.** Every table has RLS: public
  `SELECT`, writes only for rows passing `public.is_admin()`. `RequireAdmin`
  controls what renders, nothing more — bypassing it in the browser grants no
  write access.
- **SQL injection** is closed off by construction: all queries go through the
  Supabase client, which parameterises them.
- **XSS** is handled structurally rather than by filtering. Post bodies and bios
  are Markdown, rendered by `src/components/Markdown.tsx` with `rehype-raw`
  deliberately absent, so embedded HTML is escaped and never executed.
  react-markdown's default URL handling also strips `javascript:` links. If you
  ever switch to a WYSIWYG editor that emits HTML, that protection disappears
  and you must run the output through DOMPurify before rendering.
- **Data integrity** is enforced by CHECK constraints in the schema, so bad
  values are rejected even when entered by hand in Studio.

## Build status

Numbered to match the seven build phases in `PROJECT_PLAN.md`, so the phase
references in `seed-content.sql` and `DEPLOYMENT.md` line up with this table.

| Phase | Scope                                        | State                      |
| ----- | -------------------------------------------- | -------------------------- |
| 1     | Run `schema.sql`                             | Done — verified live       |
| 2     | Scaffold the app, public + protected routing | Done                       |
| 3     | Public pages                                 | Done                       |
| 4     | Admin panel and media uploads                | Done                       |
| 5     | Migrate the WordPress archive                | Done — `seed-content.sql` loaded |
| 6     | Deploy and point the Namecheap domain        | Ready — needs your host    |
| 7     | Bootstrap the admin account, test end to end | Ready — `verify-setup.mjs` |

Phase 5 is loaded: the database holds 5 clubs, 12 players, 4 tournaments, 12
entries, 6 results, 5 committee members, 1 event and 10 news posts, recovered
from the old blog. Five judgement calls are documented at the top of
`seed-content.sql` — including why the committee loads as *past* office
bearers rather than current, and which single tournament date is a placeholder.

Phases 6 and 7 are built as far as they can be without your credentials:

- **Phase 6** is `vercel.json`, `netlify.toml` and `DEPLOYMENT.md`. Config for
  both hosts is committed and verified against the production build; what
  remains is connecting the repo to a host and changing DNS.
- **Phase 7** is `verify-setup.mjs`, which performs the whole
  add-a-tournament-and-see-it-on-the-site flow against the live project. It
  needs an admin account to exist first.

Still outstanding: **`storage.sql` has not been run**, so media uploads will
fail until it is. Everything else works.

Every public page is built and reads live data. Each renders an explicit empty
state when its table has no rows, so a site with an empty database reads as new
rather than broken.

### Rankings

There is no `rankings` table, so standings are computed from `matches` on each
page load by `src/lib/rankings.ts`. A match counts once **both** frame scores
are recorded — a row with players and a date but no scores is a fixture, not a
result. Ordering is wins, then frame difference, then frames won, then name;
tied players share a position. `winner_id` is used when set and otherwise
derived from the scores, so a result entered either way ranks correctly.

### Known gaps in the spec

- **No `rankings` table.** `PROJECT_PLAN.md` describes a Node.js service that
  recalculates rankings after a result is entered, but `schema.sql` has nowhere
  to store one. Phase 2 derives standings from `matches` at read time instead,
  which needs no schema change. Storing them would mean adding a table first.
- **`news_posts` has no draft flag.** `published_at` defaults to `now()` and the
  public `SELECT` policy is unconditional, so a saved post is immediately live.
  The news feed hides posts dated in the future, which gives a rough way to
  schedule one — but that is presentation only. The row is still readable by
  anyone with the anon key, so it is not a way to keep a draft private.
- **`matches.highest_break` belongs to the match, not a player.** No column says
  who made the break, so it cannot be attributed to one. It is therefore shown
  on match rows and as a tournament best — both accurate — but deliberately
  **not** as a player statistic, since the best break across a player's matches
  may well be their opponent's. Adding a `highest_break_player_id` column would
  make it a real player stat.
- **Storage buckets and policies are not in `schema.sql`.** They are defined in
  `storage.sql` instead, kept separate so `schema.sql` stays exactly as you
  wrote it. Run it before using media uploads.
- **Some 2011 results have no frame scores.** The old blog names the winners of
  the 2011 divisional tournament but no scoreline survives. Those matches are
  stored with a `winner_id` and null scores, and render as decided with "Frame
  score not recorded" — they count towards wins and losses but contribute no
  frames to the rankings. `isDecided()` in `src/lib/rankings.ts` is what
  distinguishes them from a fixture that has not been played.
