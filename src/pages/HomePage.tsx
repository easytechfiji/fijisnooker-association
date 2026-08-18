import { Link } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { excerpt, formatDate, formatDateRange, todayInFiji } from '../lib/format.ts'
import { ASSOCIATION_NAME, ASSOCIATION_SHORT, TAGLINE } from '../lib/brand.ts'
import type { AssociationEvent, NewsPost, Tournament } from '../lib/database.types.ts'

import { QueryBoundary } from '../components/ui/QueryBoundary.tsx'
import { Card, CardLink, SectionHeading } from '../components/ui/Card.tsx'
import { StatusBadge } from '../components/ui/StatusBadge.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'

interface HomeData {
  posts: NewsPost[]
  tournaments: Tournament[]
  events: AssociationEvent[]
  counts: { players: number; tournaments: number; matches: number }
}

async function loadHome(): Promise<QueryResult<HomeData>> {
  const today = todayInFiji()

  /*
   * The three `head: true` queries return a count and no rows, so the totals
   * strip costs three cheap round trips rather than pulling every player and
   * match down the wire just to call `.length` on them.
   */
  const [posts, tournaments, events, playerCount, tournamentCount, matchCount] =
    await Promise.all([
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
      supabase.from('players').select('*', { count: 'exact', head: true }),
      supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      supabase.from('matches').select('*', { count: 'exact', head: true }),
    ])

  const failure =
    posts.error ??
    tournaments.error ??
    events.error ??
    playerCount.error ??
    tournamentCount.error ??
    matchCount.error
  if (failure) return { data: null, error: failure }

  return {
    data: {
      posts: posts.data ?? [],
      tournaments: tournaments.data ?? [],
      events: events.data ?? [],
      counts: {
        players: playerCount.count ?? 0,
        tournaments: tournamentCount.count ?? 0,
        matches: matchCount.count ?? 0,
      },
    } satisfies HomeData,
    error: null,
  }
}

function Hero() {
  return (
    <section className="hero-balls relative mb-10 overflow-hidden rounded-2xl px-6 py-12 shadow-xl shadow-laurel-950/20 ring-1 ring-white/10 ring-inset sm:px-10 sm:py-16 lg:py-20">
      <div className="relative max-w-xl lg:max-w-2xl">
        <p className="eyebrow text-brass-300">{ASSOCIATION_SHORT}</p>
        <h1 className="mt-3 text-3xl text-white drop-shadow-sm sm:text-4xl sm:leading-[1.15]">
          {ASSOCIATION_NAME}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-laurel-50 sm:text-lg">
          {TAGLINE} Tournament results, player profiles, rankings and fixtures —
          from club nights at Merchants and the Fiji Club to the divisional
          championship.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/tournaments"
            className="rounded-lg bg-brass-400 px-5 py-2.5 text-sm font-semibold text-stone-900 shadow-sm transition-colors hover:bg-brass-300"
          >
            Tournaments
          </Link>
          <Link
            to="/rankings"
            className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/40 ring-inset backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            Rankings
          </Link>
        </div>
      </div>
    </section>
  )
}

function Totals({ counts }: { counts: HomeData['counts'] }) {
  const stats = [
    { label: 'Registered players', value: counts.players, to: '/players' },
    { label: 'Tournaments', value: counts.tournaments, to: '/tournaments' },
    { label: 'Matches recorded', value: counts.matches, to: '/rankings' },
  ]

  return (
    <dl className="mb-12 grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          to={stat.to}
          className="rounded-xl bg-white px-5 py-4 shadow-sm ring-1 ring-stone-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-crimson-950/5 hover:ring-crimson-300"
        >
          <dt className="eyebrow text-stone-500">{stat.label}</dt>
          <dd className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-crimson-600 tabular-nums">
            {stat.value}
          </dd>
        </Link>
      ))}
    </dl>
  )
}

/** The most recent post, given the full width of the column. */
function FeaturedPost({ post }: { post: NewsPost }) {
  return (
    <CardLink to={`/news/${post.slug}`} className="!p-0 overflow-hidden">
      {post.cover_image_url ? (
        <img
          src={post.cover_image_url}
          alt=""
          className="h-52 w-full bg-stone-100 object-cover sm:h-64"
        />
      ) : (
        <div className="news-balls h-40 w-full sm:h-52" aria-hidden="true" />
      )}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brass-100 px-2 py-0.5 text-xs font-semibold text-brass-700">
            Latest
          </span>
          <time
            dateTime={post.published_at}
            className="text-xs tracking-wide text-stone-500 uppercase"
          >
            {formatDate(post.published_at)}
          </time>
        </div>
        <h3 className="mt-3 text-2xl">{post.title}</h3>
        <p className="mt-2 text-stone-600">{excerpt(post.body, 220)}</p>
        <p className="mt-4 text-sm font-medium text-crimson-600">
          Read the full report <span aria-hidden="true">→</span>
        </p>
      </div>
    </CardLink>
  )
}

export function HomePage() {
  const { data, error, loading } = useSupabaseQuery(loadHome, 'home')

  return (
    <>
      <Hero />

      <QueryBoundary loading={loading} error={error} data={data}>
        {({ posts, tournaments, events, counts }) => {
          const [featured, ...rest] = posts

          return (
            <>
              <Totals counts={counts} />

              <div className="grid gap-10 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <SectionHeading title="Latest news" />
                  {posts.length === 0 ? (
                    <EmptyState message="No news posts yet. Once posts are added in the admin panel they appear here." />
                  ) : (
                    <div className="space-y-4">
                      <FeaturedPost post={featured} />

                      {rest.map((post) => (
                        <CardLink key={post.id} to={`/news/${post.slug}`}>
                          <article className="flex gap-4">
                            {post.cover_image_url ? (
                              <img
                                src={post.cover_image_url}
                                alt=""
                                loading="lazy"
                                className="hidden size-24 shrink-0 rounded-lg bg-stone-100 object-cover sm:block"
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
                            <h3 className="mt-2.5 text-base">{tournament.name}</h3>
                            <p className="mt-1 text-sm text-stone-600">
                              {formatDateRange(
                                tournament.start_date,
                                tournament.end_date,
                              )}
                            </p>
                            {tournament.venue ? (
                              <p className="text-sm text-stone-500">
                                {tournament.venue}
                              </p>
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
                      <Card className="!p-0 overflow-hidden">
                        <ul className="divide-y divide-stone-100">
                          {events.map((event) => (
                            <li
                              key={event.id}
                              className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-stone-50"
                            >
                              <span
                                aria-hidden="true"
                                className="mt-1 h-auto w-0.5 shrink-0 rounded-full bg-laurel-300"
                              />
                              <div className="min-w-0">
                                <time
                                  dateTime={event.event_date}
                                  className="text-xs font-semibold tracking-wide text-laurel-700 uppercase"
                                >
                                  {formatDate(event.event_date)}
                                </time>
                                <p className="text-sm font-medium text-stone-800">
                                  {event.title}
                                </p>
                                {event.location ? (
                                  <p className="text-sm text-stone-500">
                                    {event.location}
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </section>
                </aside>
              </div>
            </>
          )
        }}
      </QueryBoundary>
    </>
  )
}
