import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { excerpt, formatDate, formatDateRange, todayInFiji } from '../lib/format.ts'
import type { AssociationEvent, NewsPost, Tournament } from '../lib/database.types.ts'

import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { Card, CardLink, SectionHeading } from '../components/ui/Card.tsx'
import { StatusBadge } from '../components/ui/StatusBadge.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'

interface HomeData {
  posts: NewsPost[]
  tournaments: Tournament[]
  events: AssociationEvent[]
}

async function loadHome(): Promise<QueryResult<HomeData>> {
  const today = todayInFiji()

  const [posts, tournaments, events] = await Promise.all([
    supabase
      .from('news_posts')
      .select('*')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(6),
    supabase
      .from('tournaments')
      .select('*')
      .in('status', ['upcoming', 'ongoing'])
      .order('start_date', { ascending: true })
      .limit(4),
    supabase
      .from('events')
      .select('*')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(5),
  ])

  const failure = posts.error ?? tournaments.error ?? events.error
  if (failure) return { data: null, error: failure }

  return {
    data: {
      posts: posts.data ?? [],
      tournaments: tournaments.data ?? [],
      events: events.data ?? [],
    } satisfies HomeData,
    error: null,
  }
}

export function HomePage() {
  const { data, error, loading } = useSupabaseQuery(loadHome, 'home')

  return (
    <>
      <section className="mb-10 rounded-xl bg-baize-800 px-6 py-10 text-baize-50 sm:px-10 sm:py-14">
        <p className="text-xs font-semibold tracking-widest text-brass-300 uppercase">
          Southern Division
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl text-white sm:text-4xl">
          Fiji Billiards &amp; Snooker Association
        </h1>
        <p className="mt-4 max-w-2xl text-baize-100">
          Tournament results, player profiles, rankings and fixtures for the
          Southern Division — Suva, Nausori and the surrounding clubs.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/tournaments"
            className="rounded-md bg-brass-400 px-4 py-2 text-sm font-semibold text-baize-950 hover:bg-brass-300"
          >
            Tournaments
          </Link>
          <Link
            to="/rankings"
            className="rounded-md ring-1 ring-baize-300/50 ring-inset px-4 py-2 text-sm font-semibold text-baize-50 hover:bg-baize-700"
          >
            Rankings
          </Link>
        </div>
      </section>

      <QueryBoundary loading={loading} error={error} data={data}>
        {({ posts, tournaments, events }) => (
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionHeading title="Latest news" />
              {posts.length === 0 ? (
                <EmptyState message="No news posts yet. Once posts are added in the admin panel they appear here." />
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <CardLink key={post.id} to={`/news/${post.slug}`}>
                      <article className="flex gap-4">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt=""
                            loading="lazy"
                            className="hidden size-24 shrink-0 rounded-md bg-stone-100 object-cover sm:block"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <time
                            dateTime={post.published_at}
                            className="text-xs tracking-wide text-stone-500 uppercase"
                          >
                            {formatDate(post.published_at)}
                          </time>
                          <h3 className="mt-1 text-lg">{post.title}</h3>
                          <p className="mt-1 text-sm text-stone-600">
                            {excerpt(post.body)}
                          </p>
                        </div>
                      </article>
                    </CardLink>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-10">
              <section>
                <SectionHeading
                  title="Tournaments"
                  action={{ to: '/tournaments', label: 'All' }}
                />
                {tournaments.length === 0 ? (
                  <EmptyState message="Nothing scheduled right now." />
                ) : (
                  <div className="space-y-3">
                    {tournaments.map((tournament) => (
                      <CardLink
                        key={tournament.id}
                        to={`/tournaments/${tournament.id}`}
                        className="!p-4"
                      >
                        <StatusBadge status={tournament.status} />
                        <h3 className="mt-2 text-base">{tournament.name}</h3>
                        <p className="mt-1 text-sm text-stone-600">
                          {formatDateRange(tournament.start_date, tournament.end_date)}
                        </p>
                        {tournament.venue ? (
                          <p className="text-sm text-stone-500">{tournament.venue}</p>
                        ) : null}
                      </CardLink>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <SectionHeading
                  title="Coming up"
                  action={{ to: '/calendar', label: 'Calendar' }}
                />
                {events.length === 0 ? (
                  <EmptyState message="No upcoming events." />
                ) : (
                  <Card className="!p-0">
                    <ul className="divide-y divide-stone-100">
                      {events.map((event) => (
                        <li key={event.id} className="px-4 py-3">
                          <time
                            dateTime={event.event_date}
                            className="text-xs tracking-wide text-baize-700 uppercase"
                          >
                            {formatDate(event.event_date)}
                          </time>
                          <p className="text-sm font-medium text-stone-800">
                            {event.title}
                          </p>
                          {event.location ? (
                            <p className="text-sm text-stone-500">{event.location}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </section>
            </aside>
          </div>
        )}
      </QueryBoundary>
    </>
  )
}
