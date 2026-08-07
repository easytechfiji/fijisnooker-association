/**
 * Executes setup.sql against a real Postgres to prove it actually runs —
 * syntax, DO blocks, policies, constraints and the summary query — rather than
 * finding out on the production database.
 *
 * Uses PGlite, which is Postgres compiled to WASM, so no server is needed. It
 * is not a project dependency, since this is only run when the SQL changes:
 *
 *   npm install --no-save @electric-sql/pglite
 *   node check-sql.mjs
 *
 * Supabase supplies auth.users, storage.buckets, storage.objects and auth.uid()
 * for us; a bare Postgres has none of them, so they are stubbed first. The
 * stubs match the shapes setup.sql depends on and nothing more — this checks
 * that the file is valid Postgres and internally consistent, not that Supabase
 * behaves as documented.
 *
 * It runs setup.sql twice, because the file's main promise is that applying it
 * to an already-configured database is safe.
 */
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'

const db = await PGlite.create({ extensions: { pgcrypto } })

// ---- Supabase stubs -------------------------------------------------------
await db.exec(`
  create schema if not exists auth;
  create schema if not exists storage;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique
  );

  -- Supabase's auth.uid() reads a request-local GUC. Stubbed to return the
  -- setting if present, else null, which is what an anonymous request sees.
  create or replace function auth.uid() returns uuid
    language sql stable
  as $fn$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $fn$;

  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );

  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets(id),
    name text
  );
  alter table storage.objects enable row level security;

  -- The roles the storage policies grant to.
  do $do$ begin
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon;
    end if;
  end $do$;
`)

// A user to grant admin to, matching the placeholder email in setup.sql.
await db.exec(`insert into auth.users (email) values ('you@example.com');`)

// ---- the file under test --------------------------------------------------
const sql = readFileSync('setup.sql', 'utf8')

let failed = false
try {
  await db.exec(sql)
  console.log('PASS  setup.sql executed without error')
} catch (error) {
  failed = true
  console.log('FAIL  setup.sql threw')
  console.log(`      ${error.message}`)
  if (error.position) {
    const upto = sql.slice(0, Number(error.position))
    console.log(`      at line ${upto.split('\n').length}`)
    console.log(`      ...${sql.slice(Math.max(0, Number(error.position) - 90), Number(error.position) + 60).replace(/\n/g, ' ')}`)
  }
}

if (!failed) {
  // Re-run: the whole point is that it is safe to apply twice.
  try {
    await db.exec(sql)
    console.log('PASS  running it a second time is a no-op (idempotent)')
  } catch (error) {
    failed = true
    console.log(`FAIL  second run threw: ${error.message}`)
  }
}

if (!failed) {
  const check = async (label, sqlText, expected) => {
    const { rows } = await db.query(sqlText)
    const actual = Number(Object.values(rows[0])[0])
    const ok = actual === expected
    if (!ok) failed = true
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${actual}${ok ? '' : ` (expected ${expected})`}`)
  }

  await check('clubs', 'select count(*) from public.clubs', 5)
  await check('players', 'select count(*) from public.players', 12)
  await check('tournaments', 'select count(*) from public.tournaments', 4)
  await check('entries', 'select count(*) from public.tournament_entries', 12)
  await check('matches', 'select count(*) from public.matches', 6)
  await check('committee', 'select count(*) from public.committee_members', 5)
  await check('events', 'select count(*) from public.events', 1)
  await check('news posts', 'select count(*) from public.news_posts', 10)
  await check('admin row created from the email', 'select count(*) from public.admins', 1)
  await check('media bucket', "select count(*) from storage.buckets where id='media'", 1)

  // 9 tables x 2 policies, and no leftovers from schema.sql's short names.
  await check(
    'public policies',
    "select count(*) from pg_policies where schemaname='public'",
    18,
  )
  await check(
    'no duplicate short-name policies',
    "select count(*) from pg_policies where schemaname='public' and policyname in ('Public can view committee','Public can view entries','Public can view news')",
    0,
  )
  await check(
    'storage policies',
    "select count(*) from pg_policies where schemaname='storage'",
    4,
  )
  await check(
    'RLS enabled on every public table',
    "select count(*) from pg_tables t join pg_class c on c.relname=t.tablename where t.schemaname='public' and c.relrowsecurity",
    10,
  )

  // The constraints must actually bite.
  const rejects = async (label, statement) => {
    try {
      await db.exec(statement)
      failed = true
      console.log(`FAIL  ${label}: the insert was allowed`)
    } catch {
      console.log(`PASS  ${label}`)
    }
  }
  await rejects(
    'negative score rejected',
    `insert into public.matches (tournament_id, score1) values ('33333333-3333-4333-8333-000000000003', -1)`,
  )
  await rejects(
    'bad tournament status rejected',
    `insert into public.tournaments (name, start_date, status) values ('x','2030-01-01','finished')`,
  )
  await rejects(
    'duplicate news slug rejected',
    `insert into public.news_posts (title, slug, body) values ('x','welcome','y')`,
  )

  // is_admin() must exist, be SECURITY DEFINER, and be false when anonymous.
  const { rows: fn } = await db.query(
    "select prosecdef from pg_proc where proname='is_admin'",
  )
  const secdef = fn[0]?.prosecdef === true
  if (!secdef) failed = true
  console.log(`${secdef ? 'PASS' : 'FAIL'}  is_admin() is SECURITY DEFINER`)

  const { rows: anon } = await db.query('select public.is_admin() as v')
  const isFalse = anon[0].v === false
  if (!isFalse) failed = true
  console.log(`${isFalse ? 'PASS' : 'FAIL'}  is_admin() is false with no session`)

  // The summary query at the end must run and report ok on every row.
  const { rows: summary } = await db.query(`
    with counts as (
      select 'admin accounts' as item, (select count(*) from public.admins) as actual, 1 as expected
      union all select 'media bucket', (select count(*) from storage.buckets where id='media'), 1
      union all select 'clubs', (select count(*) from public.clubs), 5
      union all select 'players', (select count(*) from public.players), 12
      union all select 'tournaments', (select count(*) from public.tournaments), 4
      union all select 'tournament entries', (select count(*) from public.tournament_entries), 12
      union all select 'matches', (select count(*) from public.matches), 6
      union all select 'committee members', (select count(*) from public.committee_members), 5
      union all select 'events', (select count(*) from public.events), 1
      union all select 'news posts', (select count(*) from public.news_posts), 10
    )
    select item, actual, expected,
      case
        when item='admin accounts' and actual>=1 then 'ok'
        when item='admin accounts' then 'MISSING'
        when actual=expected then 'ok'
        when actual>expected then 'ok (extra rows you added)'
        else 'CHECK THIS'
      end as status
    from counts order by item;
  `)
  const allOk = summary.every((r) => r.status.startsWith('ok'))
  if (!allOk) failed = true
  console.log(`${allOk ? 'PASS' : 'FAIL'}  the summary reports ok on all ${summary.length} rows`)
  if (!allOk) console.table(summary)
}

await db.close()
console.log(failed ? '\nPROBLEMS FOUND.' : '\nsetup.sql verified against real Postgres.')
process.exitCode = failed ? 1 : 0
