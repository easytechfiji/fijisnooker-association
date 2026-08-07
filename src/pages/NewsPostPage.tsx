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
          <Link
            to="/"
            className="text-baize-700 underline underline-offset-2 hover:text-baize-500"
          >
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
        className="text-sm text-baize-700 underline underline-offset-2 hover:text-baize-500"
      >
        ← All news
      </Link>

      <header className="mt-4 mb-8 border-b border-stone-200 pb-6">
        <time
          dateTime={data.published_at}
          className="text-xs tracking-wide text-stone-500 uppercase"
        >
          {formatDate(data.published_at)}
        </time>
        <h1 className="mt-2 text-3xl">{data.title}</h1>
      </header>

      {data.cover_image_url ? (
        <img
          src={data.cover_image_url}
          alt=""
          className="mb-8 w-full rounded-lg bg-stone-100 object-cover"
        />
      ) : null}

      <Markdown>{data.body}</Markdown>
    </article>
  )
}
