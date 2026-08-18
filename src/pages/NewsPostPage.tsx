import { Link, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import { formatDate } from '../lib/format.ts'
import type { NewsPost } from '../lib/database.types.ts'

import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'
import { EmptyState } from '../components/ui/EmptyState.tsx'
import { Markdown } from '../components/Markdown.tsx'

export function NewsPostPage() {
  const { slug = '' } = useParams()

  /*
   * `maybeSingle` rather than `single`: a slug matching nothing is a 404, not a
   * query failure, so it returns null data instead of an error. That makes null
   * meaningful here, which is why this page does its own loading/error switch
   * instead of using QueryBoundary (where null means "something went wrong").
   */
  const { data, error, loading } = useSupabaseQuery<NewsPost | null>(
    () => supabase.from('news_posts').select('*').eq('slug', slug).maybeSingle(),
    `news:${slug}`,
  )

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} />

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState message="That post could not be found. It may have been removed, or the link may be wrong." />
        <p className="mt-4 text-center">
          <Link to="/" className="link">
            Back to the news feed
          </Link>
        </p>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        to="/"
        className="text-sm font-medium text-crimson-600 transition-colors hover:text-crimson-800"
      >
        <span aria-hidden="true">←</span> All news
      </Link>

      <header className="mt-4 mb-8 border-b border-stone-200 pb-6">
        <time
          dateTime={data.published_at}
          className="eyebrow text-brass-600"
        >
          {formatDate(data.published_at)}
        </time>
        <h1 className="mt-2 text-3xl sm:text-4xl sm:leading-tight">{data.title}</h1>
        <span className="rule mt-5" aria-hidden="true" />
      </header>

      {data.cover_image_url ? (
        <img
          src={data.cover_image_url}
          alt=""
          className="mb-8 w-full rounded-xl bg-stone-100 object-cover shadow-sm ring-1 ring-stone-200/80"
        />
      ) : null}

      <Markdown>{data.body}</Markdown>
    </article>
  )
}
