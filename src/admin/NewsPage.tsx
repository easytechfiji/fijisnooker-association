import { useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useAdminResource } from './useAdminResource.ts'
import {
  collect,
  firstOf,
  httpUrl,
  isValid,
  required,
  slugify,
  text,
  textOrNull,
  validSlug,
} from '../lib/validation.ts'
import { fijiLocalToIso, isoToFijiLocal } from '../lib/datetime.ts'
import { formatShortDate } from '../lib/format.ts'
import type { NewsPost } from '../lib/database.types.ts'

import { AdminSection, PrimaryButton, SecondaryButton } from './components/AdminSection.tsx'
import { AdminTable } from './components/AdminTable.tsx'
import { FieldRow, FormPanel } from './components/FormPanel.tsx'
import { TextAreaField, TextField } from './components/inputs.tsx'
import { Flash } from './components/Flash.tsx'
import { Markdown } from '../components/Markdown.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'

const BLANK = {
  title: '',
  slug: '',
  body: '',
  cover_image_url: '',
  published_at: '',
}

function nowInFijiLocal(): string {
  return isoToFijiLocal(new Date().toISOString())
}

export default function AdminNewsPage() {
  const resource = useAdminResource<NewsPost>({
    table: 'news_posts',
    cacheKey: 'admin-news',
    load: () =>
      supabase.from('news_posts').select('*').order('published_at', { ascending: false }),
  })

  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  /* Once the slug has been edited by hand, stop rewriting it from the title —
   * changing a published post's slug breaks every link to it. */
  const [slugLocked, setSlugLocked] = useState(false)

  const set = (field: keyof typeof BLANK) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  function setTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugLocked ? current.slug : slugify(value),
    }))
  }

  function setSlug(value: string) {
    setSlugLocked(true)
    set('slug')(value)
  }

  function open(post: NewsPost | 'new') {
    setErrors({})
    setPreview(false)
    setSlugLocked(post !== 'new')
    setForm(
      post === 'new'
        ? { ...BLANK, published_at: nowInFijiLocal() }
        : {
            title: post.title,
            slug: post.slug,
            body: post.body,
            cover_image_url: post.cover_image_url ?? '',
            published_at: isoToFijiLocal(post.published_at),
          },
    )
    if (post === 'new') resource.startCreate()
    else resource.startEdit(post)
  }

  async function submit() {
    const found = collect({
      title: required(form.title, 'Title'),
      slug: validSlug(form.slug),
      body: required(form.body, 'Body'),
      cover_image_url: httpUrl(form.cover_image_url, 'Cover image URL'),
      published_at: firstOf(
        required(form.published_at, 'Publish date'),
        fijiLocalToIso(form.published_at) === null
          ? 'Publish date could not be read.'
          : null,
      ),
    })
    setErrors(found)
    if (!isValid(found)) return

    const publishedAt = fijiLocalToIso(form.published_at)
    if (publishedAt === null) return

    const row = {
      title: text(form.title),
      slug: text(form.slug),
      body: form.body.trim(),
      cover_image_url: textOrNull(form.cover_image_url),
      published_at: publishedAt,
    }

    const editing = resource.editing
    if (editing === 'new') {
      await resource.save(() => supabase.from('news_posts').insert(row), 'Post published.')
    } else if (editing) {
      await resource.save(
        () => supabase.from('news_posts').update(row).eq('id', editing.id),
        'Post updated.',
      )
    }
  }

  const isFuture =
    form.published_at !== '' &&
    (fijiLocalToIso(form.published_at) ?? '') > new Date().toISOString()

  return (
    <AdminSection
      title="News posts"
      description="Written in Markdown. Posts appear on the home page newest first."
      action={
        resource.editing === null ? (
          <PrimaryButton onClick={() => open('new')}>Write post</PrimaryButton>
        ) : null
      }
    >
      <Flash message={resource.flash} />

      {resource.editing !== null ? (
        <FormPanel
          title={resource.editing === 'new' ? 'New post' : 'Edit post'}
          onSubmit={() => void submit()}
          onCancel={resource.cancel}
          error={resource.saveError}
          pending={resource.saving}
          submitLabel={resource.editing === 'new' ? 'Publish' : 'Save changes'}
        >
          {/*
            schema.sql has no draft column and the public SELECT policy is
            unconditional, so saving makes a post readable immediately. Say so
            here rather than letting someone discover it after the fact.
          */}
          <p className="rounded-md border border-brass-300 bg-brass-300/15 px-3 py-2 text-xs text-brass-600">
            There are no drafts — saving publishes. A future date hides the post
            from the site, but the row is still readable by anyone with the public
            key, so do not use it for anything confidential.
          </p>

          <TextField
            label="Title"
            value={form.title}
            onChange={setTitle}
            error={errors.title}
            required
            autoFocus
          />

          <TextField
            label="Web address"
            value={form.slug}
            onChange={setSlug}
            error={errors.slug}
            required
            hint={
              <>
                The post will live at <code>/news/{form.slug || '…'}</code>
                {resource.editing !== 'new'
                  ? '. Changing this breaks existing links to the post.'
                  : '. Generated from the title until you edit it.'}
              </>
            }
          />

          <FieldRow>
            <TextField
              label="Publish date"
              type="datetime-local"
              value={form.published_at}
              onChange={set('published_at')}
              error={errors.published_at}
              required
              hint={
                isFuture
                  ? 'Dated in the future — hidden from the site until then.'
                  : 'Fiji time.'
              }
            />
            <TextField
              label="Cover image URL"
              type="url"
              value={form.cover_image_url}
              onChange={set('cover_image_url')}
              error={errors.cover_image_url}
              hint="Upload under Media first, then paste the URL here."
            />
          </FieldRow>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-stone-700">
                Body
                <span className="ml-0.5 text-red-600" aria-hidden="true">
                  *
                </span>
              </span>
              <SecondaryButton onClick={() => setPreview((value) => !value)}>
                {preview ? 'Edit' : 'Preview'}
              </SecondaryButton>
            </div>

            {preview ? (
              <div className="min-h-40 rounded-md border border-stone-300 bg-white p-4">
                {form.body.trim() ? (
                  <Markdown>{form.body}</Markdown>
                ) : (
                  <p className="text-sm text-stone-400">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <TextAreaField
                label="Body"
                value={form.body}
                onChange={set('body')}
                error={errors.body}
                required
                rows={16}
                hint="Markdown: **bold**, *italic*, ## headings, - lists, [links](https://…). Raw HTML is escaped rather than rendered."
              />
            )}
          </div>
        </FormPanel>
      ) : null}

      {resource.loading ? <Spinner label="Loading posts…" /> : null}
      {resource.loadError ? <ErrorMessage message={resource.loadError} /> : null}

      {!resource.loading && !resource.loadError ? (
        <AdminTable
          rows={resource.rows}
          columns={[
            { header: 'Published', cell: (post) => formatShortDate(post.published_at) },
            { header: 'Title', cell: (post) => post.title },
            {
              header: 'Address',
              cell: (post) => <code className="text-xs text-stone-500">/news/{post.slug}</code>,
            },
            {
              header: 'Visible',
              cell: (post) =>
                post.published_at > new Date().toISOString() ? (
                  <span className="text-brass-600">Scheduled</span>
                ) : (
                  <span className="text-crimson-700">Live</span>
                ),
            },
          ]}
          onEdit={(post) => open(post)}
          onDelete={(post) => void resource.remove(post, 'Post deleted.')}
          deleteLabel={(post) => `“${post.title}”`}
          deletingId={resource.deletingId}
          empty="No posts yet."
        />
      ) : null}
    </AdminSection>
  )
}
