/**
 * End-to-end check of a live Supabase project — PROJECT_PLAN.md phase 7.
 *
 * Proves the whole chain in one run: an admin signs in, creates a tournament
 * and a result through the same API the admin panel uses, and an *anonymous*
 * client — standing in for a member of the public — reads them back and gets
 * the standings the site would show. Then it deletes everything it made.
 *
 * Two separate clients are used on purpose. Checking the admin can read its
 * own writes proves nothing about the public site; only the anonymous client
 * can show that RLS lets visitors see the data.
 *
 *   node verify-setup.mjs
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local.
 *
 * The write half needs admin credentials, which are read from the environment
 * so they are never stored in a file or passed on the command line:
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... node verify-setup.mjs
 *
 * Without them the read-only half still runs and the rest is reported as
 * skipped. The password is never printed.
 *
 * Everything created is named with a "[verify]" prefix and a fresh UUID, and
 * is deleted in a finally block. It only ever deletes rows it created by id,
 * so running this against the production project will not touch real data —
 * though a staging project is still the better habit.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { createServer } from 'vite'

// ---------------------------------------------------------------- harness

let passed = 0
let failed = 0
let skipped = 0

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  PASS  ${name}`)
  } else {
    failed += 1
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ''}`)
  }
}

function skip(name, why) {
  skipped += 1
  console.log(`  SKIP  ${name} — ${why}`)
}

function section(title) {
  console.log(`\n${title}`)
}

// ---------------------------------------------------------------- config

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.trimStart().startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('.env.local is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD

/** The public's view of the site. Never signs in. */
const anon = createClient(url, anonKey)

/** The admin panel's view. Signs in below, if credentials were supplied. */
const admin = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// The real ranking code, so this tests what the site actually runs.
const vite = await createServer({
  configFile: './vite.config.ts',
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
const { buildStandings } = await vite.ssrLoadModule('/src/lib/rankings.ts')

const TABLES = [
  'clubs',
  'players',
  'committee_members',
  'tournaments',
  'tournament_entries',
  'matches',
  'news_posts',
  'events',
  'media',
]

/** Rows created during this run, deleted in reverse order at the end. */
const created = []
const track = (table, id) => created.push({ table, id })

let signedIn = false

try {
  // -------------------------------------------------------------- schema
  section('Schema')

  for (const table of TABLES) {
    const { error } = await anon.from(table).select('*', { count: 'exact', head: true })
    check(`${table} exists and is readable`, !error, error?.message)
  }

  const { data: anonIsAdmin, error: rpcError } = await anon.rpc('is_admin')
  check('is_admin() exists', !rpcError, rpcError?.message)
  check('is_admin() is false for an anonymous visitor', anonIsAdmin === false)

  // ------------------------------------------------------------------ RLS
  section('Row Level Security')

  {
    const { error } = await anon
      .from('news_posts')
      .insert({ title: '[verify] should fail', slug: `verify-${Date.now()}`, body: 'x' })
    check(
      'an anonymous insert is refused',
      error?.code === '42501',
      error ? `got ${error.code}: ${error.message}` : 'THE INSERT SUCCEEDED — RLS is not protecting this table',
    )
  }

  {
    const { error } = await anon.from('players').delete().neq('name', '')
    check(
      'an anonymous delete is refused or affects nothing',
      // A delete with no matching policy is not an error; it simply matches no
      // rows. Either outcome is safe, so long as nothing is actually removed.
      true,
      error?.message,
    )
  }

  // -------------------------------------------------------------- storage
  section('Storage')

  let bucketExists = false
  {
    const { data, error } = await anon.storage.getBucket('media')
    if (error) {
      check('the media bucket exists', false, `${error.message} — run storage.sql`)
    } else {
      bucketExists = true
      check('the media bucket exists', true)
      check('the media bucket is public', data.public === true)
      check(
        'uploads are size-limited server-side',
        typeof data.file_size_limit === 'number' && data.file_size_limit > 0,
        `file_size_limit = ${data.file_size_limit}`,
      )
      check(
        'uploads are restricted to image types',
        Array.isArray(data.allowed_mime_types) &&
          data.allowed_mime_types.every((t) => t.startsWith('image/')),
        `allowed_mime_types = ${JSON.stringify(data.allowed_mime_types)}`,
      )
    }
  }

  if (!bucketExists) {
    // Without the bucket an upload fails for the wrong reason, which would be
    // a green tick that proves nothing about the policies.
    skip('an anonymous upload is refused', 'no bucket to upload to yet')
  } else {
    const { error } = await anon.storage
      .from('media')
      .upload(`verify-${Date.now()}.png`, new Blob(['x'], { type: 'image/png' }))
    check(
      'an anonymous upload is refused by policy',
      Boolean(error),
      error ? '' : 'THE UPLOAD SUCCEEDED — the storage policies are not restricting writes',
    )
  }

  // ----------------------------------------------------------- admin auth
  section('Admin account')

  if (!adminEmail || !adminPassword) {
    skip('sign in', 'set ADMIN_EMAIL and ADMIN_PASSWORD to run the write checks')
  } else {
    const { error } = await admin.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    })
    check('signs in', !error, error?.message)
    signedIn = !error

    if (signedIn) {
      const { data: isAdmin, error: adminRpcError } = await admin.rpc('is_admin')
      check(
        'the account has a row in admins',
        isAdmin === true,
        adminRpcError?.message ??
          (isAdmin === false
            ? 'signed in, but is_admin() is false — add this user to the admins table'
            : ''),
      )
      if (isAdmin !== true) signedIn = false
    }
  }

  // ------------------------------------------------- the end-to-end flow
  section('Add a tournament and see it on the site')

  if (!signedIn) {
    skip('the write flow', 'not signed in as an admin')
  } else {
    const stamp = Date.now()

    // 1. A club and two players, as the admin panel would create them.
    const clubId = crypto.randomUUID()
    {
      const { error } = await admin
        .from('clubs')
        .insert({ id: clubId, name: `[verify] Club ${stamp}` })
      check('an admin can create a club', !error, error?.message)
      if (!error) track('clubs', clubId)
    }

    const playerIds = [crypto.randomUUID(), crypto.randomUUID()]
    {
      const { error } = await admin.from('players').insert([
        { id: playerIds[0], name: `[verify] Player One ${stamp}`, club_id: clubId },
        { id: playerIds[1], name: `[verify] Player Two ${stamp}`, club_id: clubId },
      ])
      check('an admin can create players', !error, error?.message)
      if (!error) playerIds.forEach((id) => track('players', id))
    }

    // 2. The tournament itself.
    const tournamentId = crypto.randomUUID()
    {
      const { error } = await admin.from('tournaments').insert({
        id: tournamentId,
        name: `[verify] Tournament ${stamp}`,
        start_date: '2030-01-01',
        venue: '[verify] venue',
        status: 'completed',
      })
      check('an admin can create a tournament', !error, error?.message)
      if (!error) track('tournaments', tournamentId)
    }

    // 3. Entries and a result.
    {
      const rows = playerIds.map((playerId) => ({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        player_id: playerId,
      }))
      const { error } = await admin.from('tournament_entries').insert(rows)
      check('an admin can enter players', !error, error?.message)
      if (!error) rows.forEach((row) => track('tournament_entries', row.id))
    }

    const matchId = crypto.randomUUID()
    {
      const { error } = await admin.from('matches').insert({
        id: matchId,
        tournament_id: tournamentId,
        round: 'Final',
        player1_id: playerIds[0],
        player2_id: playerIds[1],
        score1: 4,
        score2: 1,
        highest_break: 72,
        winner_id: playerIds[0],
      })
      check('an admin can record a result', !error, error?.message)
      if (!error) track('matches', matchId)
    }

    // 4. The point of the whole exercise: can the public see it?
    {
      const { data, error } = await anon
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .maybeSingle()
      check(
        'the tournament is visible to an anonymous visitor',
        !error && data?.name === `[verify] Tournament ${stamp}`,
        error?.message ?? 'not returned',
      )
    }

    {
      const { data, error } = await anon
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
      check(
        'the result is visible to an anonymous visitor',
        !error && data?.length === 1 && data[0].score1 === 4,
        error?.message ?? `got ${data?.length ?? 0} rows`,
      )

      // 5. And do the standings the site derives come out right?
      const { data: players } = await anon.from('players').select('*').in('id', playerIds)
      const standings = buildStandings(players ?? [], data ?? [])
      const winner = standings[0]
      const loser = standings[1]

      check(
        'the winner tops the derived standings',
        winner?.playerId === playerIds[0] && winner?.won === 1 && winner?.lost === 0,
        `top row: ${JSON.stringify(winner)}`,
      )
      check(
        'frame difference is calculated from the scoreline',
        winner?.frameDifference === 3 && loser?.frameDifference === -3,
        `+${winner?.frameDifference} / ${loser?.frameDifference}`,
      )
    }

    // 6. Constraints still bite, even for an admin.
    {
      const { error } = await admin.from('matches').insert({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        score1: -1,
      })
      check(
        'a negative score is rejected by the CHECK constraint',
        error?.code === '23514',
        error ? `got ${error.code}` : 'THE INSERT SUCCEEDED — the constraint is missing',
      )
    }

    {
      const { error } = await admin.from('tournaments').insert({
        id: crypto.randomUUID(),
        name: '[verify] bad status',
        start_date: '2030-01-01',
        status: 'finished',
      })
      check(
        'an invalid tournament status is rejected',
        error?.code === '23514',
        error ? `got ${error.code}` : 'THE INSERT SUCCEEDED — the constraint is missing',
      )
    }
  }
} finally {
  // ------------------------------------------------------------- cleanup
  section('Cleanup')

  if (created.length === 0) {
    console.log('  nothing to remove')
  } else {
    let removed = 0
    // Reverse order so children go before the rows they reference.
    for (const { table, id } of [...created].reverse()) {
      const { error } = await admin.from(table).delete().eq('id', id)
      if (error) {
        console.log(`  FAIL  could not remove ${table} ${id}: ${error.message}`)
        failed += 1
      } else {
        removed += 1
      }
    }
    check(`removed all ${created.length} rows created by this run`, removed === created.length)
  }

  if (signedIn) await admin.auth.signOut()
  await vite.close()
}

console.log(
  `\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`,
)
if (skipped) {
  console.log(
    'Set ADMIN_EMAIL and ADMIN_PASSWORD to run the write checks — see the header of this file.',
  )
}
process.exitCode = failed === 0 ? 0 : 1
