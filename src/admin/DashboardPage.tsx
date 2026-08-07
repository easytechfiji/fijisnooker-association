import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import { PageHeader } from '../components/PageHeader.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'

const tables = [
  { name: 'news_posts', label: 'News posts', to: '/admin/news' },
  { name: 'tournaments', label: 'Tournaments', to: '/admin/tournaments' },
  { name: 'matches', label: 'Matches', to: '/admin/matches' },
  { name: 'players', label: 'Players', to: '/admin/players' },
  { name: 'clubs', label: 'Clubs', to: '/admin/clubs' },
  { name: 'committee_members', label: 'Committee', to: '/admin/committee' },
  { name: 'events', label: 'Events', to: '/admin/events' },
  { name: 'media', label: 'Media', to: '/admin/media' },
] as const

type Counts = Record<string, number>

export default function DashboardPage() {
  // Counts every table in one pass. Beyond being useful, this is the Phase 1
  // proof that the environment variables, the client, RLS's public SELECT
  // policies and the session all work together.
  const { data, error, loading } = useSupabaseQuery<Counts>(async () => {
    const results = await Promise.all(
      tables.map(async ({ name }) => {
        const response = await supabase
          .from(name)
          .select('*', { count: 'exact', head: true })
        return { name, count: response.count ?? 0, error: response.error }
      }),
    )

    const failure = results.find((result) => result.error)
    if (failure?.error) return { data: null, error: failure.error }

    return {
      data: Object.fromEntries(results.map((result) => [result.name, result.count])),
      error: null,
    }
  }, 'dashboard-counts')

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="What is currently in the database."
      />

      {loading ? <Spinner label="Counting records…" /> : null}
      {error ? <ErrorMessage message={error} /> : null}

      {data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map(({ name, label, to }) => (
            <Link
              key={name}
              to={to}
              className="rounded-lg border border-stone-200 bg-white p-4 transition hover:border-baize-300 hover:shadow-md"
            >
              <p className="text-3xl font-semibold text-baize-800">{data[name] ?? 0}</p>
              <p className="mt-1 text-sm text-stone-600">{label}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  )
}
