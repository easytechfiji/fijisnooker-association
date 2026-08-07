/**
 * Client-side rules for media uploads, and the naming of stored objects.
 *
 * These mirror the bucket configuration in `storage.sql` — 5 MB, images only.
 * The duplication is deliberate and the direction matters: the bucket is what
 * actually enforces the limits, since anyone with the public key can call the
 * Storage API without going through this form. These checks exist so a mistake
 * is caught before a 5 MB upload fails, not to make the upload safe.
 *
 * Keep the two in step. If you change one, change the other.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** The `accept` attribute for the file input. */
export const ACCEPT = ALLOWED_IMAGE_TYPES.join(',')

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface FileLike {
  name: string
  size: number
  type: string
}

/** A complaint about the chosen file, or null if it is acceptable. */
export function validateUpload(file: FileLike): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `That file is a ${file.type || 'unknown type'}. Choose a JPEG, PNG, WebP or GIF image.`
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`
  }
  if (file.size === 0) {
    return 'That file is empty.'
  }
  return null
}

/**
 * Reduces a filename to something safe to keep as a label. Path separators and
 * anything non-alphanumeric go, so a name can never climb out of its folder or
 * confuse the URL — the stored object name does not depend on this, but the
 * caption default does.
 */
export function safeName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]*$/, '')
  return (
    withoutExtension
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  )
}

/**
 * The object path within the bucket: a date folder plus a random name.
 *
 * The extension comes from the MIME type rather than the supplied filename, so
 * a file called `photo.php` uploaded as an image is stored as `.jpg`. The
 * random id avoids one upload silently overwriting another with the same name,
 * which `upsert: false` would otherwise turn into an error mid-session.
 */
export function storagePath(file: FileLike, id: string, now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const extension = EXTENSIONS[file.type] ?? 'bin'
  return `${year}/${month}/${id}-${safeName(file.name)}.${extension}`
}

/**
 * Recovers the object path from a public URL, so deleting a media row can also
 * delete the file rather than leaving it orphaned in the bucket.
 *
 * Returns null when the URL does not belong to this bucket — a row whose `url`
 * was typed in by hand points at someone else's server, and deleting the row
 * should not attempt anything in Storage.
 */
export function storagePathFromPublicUrl(url: string, bucket = 'media'): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  if (index === -1) return null

  const path = url.slice(index + marker.length).split('?')[0]
  if (path === '' || path.includes('..')) return null

  try {
    return decodeURIComponent(path)
  } catch {
    return null
  }
}
