/** Temporary verification: renders every route and the admin form components. */
import { createServer } from 'vite'
import assert from 'node:assert/strict'

process.env.VITE_SUPABASE_URL = 'https://verification.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_verification_only'

const server = await createServer({
  configFile: './vite.config.ts',
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

let passed = 0
let failed = 0
function check(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`  PASS  ${name}`)
  } catch (error) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    console.log(`        ${String(error.message).split('\n').slice(0, 5).join('\n        ')}`)
  }
}

const strip = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')

const entry = await server.ssrLoadModule('/render-entry.tsx')

const PUBLIC_ROUTES = [
  ['/', 'Fiji Billiards & Snooker Association'],
  ['/news/some-post', null],
  ['/tournaments', 'Tournaments'],
  ['/tournaments/abc', null],
  ['/players', 'Players'],
  ['/players/not-a-uuid', null],
  ['/rankings', 'Rankings'],
  ['/calendar', 'Calendar'],
  ['/about', 'About the association'],
  ['/committee', 'Committee'],
  ['/contact', 'Contact'],
  ['/definitely/not/a/page', null],
]

const ADMIN_ROUTES = [
  '/admin/login',
  '/admin',
  '/admin/tournaments',
  '/admin/matches',
  '/admin/players',
  '/admin/clubs',
  '/admin/news',
  '/admin/committee',
  '/admin/events',
  '/admin/media',
]

console.log('\npublic routes')

for (const [path, expected] of PUBLIC_ROUTES) {
  check(`${path} renders${expected ? ` and contains "${expected}"` : ''}`, () => {
    const html = entry.renderRoute(path)
    assert.ok(html.length > 0, 'rendered nothing')
    assert.ok(
      !strip(html).includes('Configuration needed'),
      'ConfigGate blocked the route',
    )
    if (expected) {
      assert.ok(strip(html).includes(expected), strip(html).slice(0, 250))
    }
  })
}

console.log('\nadmin routes (lazy chunks resolved first)')

await entry.warmLazyRoutes(ADMIN_ROUTES)

for (const path of ADMIN_ROUTES) {
  check(`${path} renders without throwing`, () => {
    const html = entry.renderRoute(path)
    assert.ok(html.length > 0, 'rendered nothing')
  })
}

check('the login page renders its form once loaded', () => {
  const text = strip(entry.renderRoute('/admin/login'))
  assert.ok(text.includes('Committee login'), text.slice(0, 250))
  assert.ok(text.includes('Email'))
  assert.ok(text.includes('Password'))
})

check('an unauthenticated visit to /admin does not render the panel', () => {
  // Session resolution happens in an effect, so SSR shows the loading state —
  // what matters is that no admin content leaks into the markup.
  const text = strip(entry.renderRoute('/admin'))
  assert.ok(!text.includes('Add tournament'), text.slice(0, 250))
  assert.ok(!text.includes('Sign out'))
})

console.log('\nform components')

const formHtml = entry.renderForm()
const formText = strip(formHtml)

check('renders labels and values', () => {
  assert.ok(formText.includes('New tournament'))
  assert.ok(formText.includes('Name'))
  assert.ok(formHtml.includes('value="Suva Open 2026"'))
})

check('marks required fields and labels optional ones', () => {
  assert.ok(formText.includes('optional'), 'optional fields should say so')
  assert.ok(formHtml.includes('aria-hidden="true">*<'), 'required marker missing')
})

check('shows a field error and links it to the input', () => {
  assert.ok(formText.includes('End date cannot be before the start date.'))
  const invalid = formHtml.match(/aria-invalid="true"[^>]*aria-describedby="([^"]+)"/)
  assert.ok(invalid, 'invalid input is not described by its error')
  const errorId = invalid[1].split(' ').at(-1)
  assert.ok(
    formHtml.includes(`id="${errorId}"`),
    `no element with id ${errorId} to describe the field`,
  )
})

check('shows the hint text', () => {
  assert.ok(formText.includes('Leave empty for a one-day tournament.'))
})

check('surfaces the save error next to the buttons', () => {
  assert.ok(formText.includes('The database refused this change.'))
  assert.ok(formHtml.includes('role="alert"'))
})

check('renders Save and Cancel', () => {
  assert.ok(formText.includes('Save'))
  assert.ok(formText.includes('Cancel'))
})

check('preselects the current value in a select', () => {
  assert.ok(/<option[^>]*value="ongoing"[^>]*selected/.test(formHtml), formHtml.slice(0, 400))
})

check('every input has a label pointing at it', () => {
  const forIds = [...formHtml.matchAll(/<label[^>]*for="([^"]+)"/g)].map((m) => m[1])
  assert.ok(forIds.length >= 5, `only ${forIds.length} labels found`)
  for (const id of forIds) {
    assert.ok(formHtml.includes(`id="${id}"`), `label points at missing id ${id}`)
  }
})

console.log('\nadmin table')

const tableHtml = entry.renderTable()
const tableText = strip(tableHtml)

check('lists rows with their columns', () => {
  assert.ok(tableText.includes('Suva Open 2026'))
  assert.ok(tableText.includes('Nausori Classic'))
  assert.ok(tableText.includes('12'))
})

check('offers Edit and Delete per row', () => {
  assert.equal((tableText.match(/Edit/g) ?? []).length, 2)
  assert.equal((tableText.match(/Delete/g) ?? []).length, 2)
})

check('right-aligns numeric columns', () => {
  assert.ok(tableHtml.includes('text-right tabular-nums'))
})

check('shows the empty state instead of an empty table', () => {
  const emptyText = strip(entry.renderTable(true))
  assert.ok(emptyText.includes('No tournaments yet.'))
  assert.ok(!emptyText.includes('Entrants'), 'headers should not render with no rows')
})

console.log('\ndelete confirmation and flash')

check('delete starts as a single button, not a confirmation', () => {
  const text = strip(entry.renderDeleteButton())
  assert.ok(text.includes('Delete'))
  assert.ok(!text.includes('Yes, delete'), 'must not start confirmed')
})

check('a success notice is announced politely, not as an alert', () => {
  const html = entry.renderFlash()
  assert.ok(strip(html).includes('Tournament updated.'))
  assert.ok(html.includes('role="status"'))
  assert.ok(!html.includes('role="alert"'))
})

await server.close()

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
