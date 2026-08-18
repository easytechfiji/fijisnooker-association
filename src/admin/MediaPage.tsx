import { useRef, useState } from 'react'

import { supabase } from '../lib/supabase.ts'
import { useSupabaseQuery } from '../hooks/useSupabaseQuery.ts'
import type { QueryResult } from '../hooks/useSupabaseQuery.ts'
import { useMutation } from '../hooks/useMutation.ts'
import { describeError } from '../lib/errors.ts'
import { formatShortDate } from '../lib/format.ts'
import {
  ACCEPT,
  MAX_UPLOAD_BYTES,
  formatBytes,
  safeName,
  storagePath,
  storagePathFromPublicUrl,
  validateUpload,
} from '../lib/upload.ts'
import type { AssociationEvent, MediaItem, Tournament } from '../lib/database.types.ts'

import { AdminSection } from './components/AdminSection.tsx'
import { SelectField, TextField } from './components/inputs.tsx'
import { PrimaryButton } from './components/AdminSection.tsx'
import { DeleteButton } from './components/DeleteButton.tsx'
import { Flash } from './components/Flash.tsx'
import { Spinner } from '../components/ui/Spinner.tsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'

const BUCKET = 'media'

interface MediaData {
  items: MediaItem[]
  tournaments: Tournament[]
  events: AssociationEvent[]
}

async function loadMedia(): Promise<QueryResult<MediaData>> {
  const [items, tournaments, events] = await Promise.all([
    supabase.from('media').select('*').order('created_at', { ascending: false }),
    supabase.from('tournaments').select('*').order('start_date', { ascending: false }),
    supabase.from('events').select('*').order('event_date', { ascending: false }),
  ])

  const failure = items.error ?? tournaments.error ?? events.error
  if (failure) return { data: null, error: failure }

  return {
    data: {
      items: items.data ?? [],
      tournaments: tournaments.data ?? [],
      events: events.data ?? [],
    },
    error: null,
  }
}

export default function AdminMediaPage() {
  const { data, error, loading, refresh } = useSupabaseQuery(loadMedia, 'admin-media')
  const { run, pending, error: writeError, clearError } = useMutation()

  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [tournamentId, setTournamentId] = useState('')
  const [eventId, setEventId] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const items = data?.items ?? []
  const tournaments = data?.tournaments ?? []
  const events = data?.events ?? []

  const tournamentNames = new Map(tournaments.map((t) => [t.id, t.name]))
  const eventNames = new Map(events.map((event) => [event.id, event.title]))

  function chooseFile(chosen: File | null) {
    clearError()
    setFlash(null)
    setFile(chosen)
    setFileError(chosen ? validateUpload(chosen) : null)
    if (chosen && !caption.trim()) setCaption(safeName(chosen.name).replace(/-/g, ' '))
  }

  function reset() {
    setFile(null)
    setCaption('')
    setTournamentId('')
    setEventId('')
    setFileError(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function upload() {
    if (!file) return
    const complaint = validateUpload(file)
    setFileError(complaint)
    if (complaint) return

    setUploading(true)
    clearError()
    setFlash(null)

    try {
      const path = storagePath(file, crypto.randomUUID())

      /* Storage first: if the row were inserted first and the upload then
       * failed, the site would show a broken image. */
      const { error: uploadFailure } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadFailure) {
        setFileError(describeError(uploadFailure))
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const inserted = await run(() =>
        supabase.from('media').insert({
          url: publicUrl,
          caption: caption.trim() === '' ? null : caption.trim(),
          tournament_id: tournamentId === '' ? null : tournamentId,
          event_id: eventId === '' ? null : eventId,
        }),
      )

      if (!inserted) {
        /* Roll back the file so a failed insert does not leave an orphan. */
        await supabase.storage.from(BUCKET).remove([path])
        return
      }

      reset()
      setFlash('Image uploaded.')
      refresh()
    } finally {
      setUploading(false)
    }
  }

  async function remove(item: MediaItem) {
    setDeletingId(item.id)
    setFlash(null)

    const ok = await run(() => supabase.from('media').delete().eq('id', item.id))

    if (ok) {
      /* Delete the file too, but only if it is ours. A hand-entered URL points
       * somewhere else, and the row is already gone either way. */
      const path = storagePathFromPublicUrl(item.url, BUCKET)
      if (path) await supabase.storage.from(BUCKET).remove([path])
      setFlash('Image deleted.')
      refresh()
    }

    setDeletingId(null)
  }

  return (
    <AdminSection
      title="Media"
      description="Tournament and event photos. Uploaded files get a public URL you can paste into a news post, a player profile or a cover image."
    >
      <Flash message={flash} />

      <section className="mb-8 rounded-lg border border-crimson-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg">Upload an image</h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="media-file"
              className="mb-1 block text-sm font-medium text-stone-700"
            >
              Image
              <span className="ml-0.5 text-red-600" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="media-file"
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-crimson-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-crimson-600"
            />
            <p className="mt-1 text-xs text-stone-500">
              JPEG, PNG, WebP or GIF, up to {formatBytes(MAX_UPLOAD_BYTES)}. The same
              limits are enforced by the storage bucket, not just here.
            </p>
            {file && !fileError ? (
              <p className="mt-1 text-xs text-stone-600">
                {file.name} — {formatBytes(file.size)}
              </p>
            ) : null}
            {fileError ? (
              <p className="mt-1 text-xs font-medium text-red-700">{fileError}</p>
            ) : null}
          </div>

          <TextField
            label="Caption"
            value={caption}
            onChange={setCaption}
            placeholder="Final, Suva Open 2026"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Tournament"
              value={tournamentId}
              onChange={setTournamentId}
              options={tournaments.map((tournament) => ({
                value: tournament.id,
                label: tournament.name,
              }))}
              placeholder="— not linked —"
            />
            <SelectField
              label="Event"
              value={eventId}
              onChange={setEventId}
              options={events.map((event) => ({
                value: event.id,
                label: event.title,
              }))}
              placeholder="— not linked —"
            />
          </div>
        </div>

        {writeError ? (
          <div className="mt-4">
            <ErrorMessage message={writeError} />
          </div>
        ) : null}

        <div className="mt-5 border-t border-stone-100 pt-5">
          <PrimaryButton
            onClick={() => void upload()}
            disabled={!file || Boolean(fileError) || uploading || pending}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </PrimaryButton>
        </div>
      </section>

      {loading ? <Spinner label="Loading media…" /> : null}
      {error ? <ErrorMessage message={error} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 px-4 py-10 text-center text-stone-500">
            Nothing uploaded yet.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-lg border border-stone-200 bg-white"
              >
                <img
                  src={item.url}
                  alt={item.caption ?? ''}
                  loading="lazy"
                  className="aspect-video w-full bg-stone-100 object-cover"
                />
                <div className="p-3">
                  <p className="truncate text-sm text-stone-800">
                    {item.caption ?? <span className="text-stone-400">No caption</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {item.tournament_id
                      ? (tournamentNames.get(item.tournament_id) ?? 'Unknown tournament')
                      : item.event_id
                        ? (eventNames.get(item.event_id) ?? 'Unknown event')
                        : 'Not linked'}{' '}
                    · {formatShortDate(item.created_at)}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-crimson-700 underline underline-offset-2 hover:text-crimson-500"
                    >
                      Open URL
                    </a>
                    <DeleteButton
                      onDelete={() => void remove(item)}
                      label={item.caption ?? 'this image'}
                      consequence="The file is removed from storage as well."
                      pending={deletingId === item.id}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </AdminSection>
  )
}
