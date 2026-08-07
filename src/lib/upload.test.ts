import { describe, expect, it } from 'vitest'

import {
  MAX_UPLOAD_BYTES,
  formatBytes,
  safeName,
  storagePath,
  storagePathFromPublicUrl,
  validateUpload,
} from './upload.ts'

const image = (over: Partial<{ name: string; size: number; type: string }> = {}) => ({
  name: 'photo.jpg',
  size: 1024,
  type: 'image/jpeg',
  ...over,
})

describe('validateUpload', () => {
  it('accepts the image types the bucket allows', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      expect(validateUpload(image({ type }))).toBeNull()
    }
  })

  it('rejects types the bucket would reject', () => {
    expect(validateUpload(image({ type: 'application/pdf' }))).toMatch(/JPEG, PNG/)
    expect(validateUpload(image({ type: 'text/html' }))).toMatch(/JPEG, PNG/)
    expect(validateUpload(image({ type: 'image/svg+xml' }))).toMatch(/JPEG, PNG/)
  })

  it('rejects a file with no detected type', () => {
    expect(validateUpload(image({ type: '' }))).toMatch(/unknown type/)
  })

  it('rejects a file over the bucket limit', () => {
    expect(validateUpload(image({ size: MAX_UPLOAD_BYTES + 1 }))).toMatch(/limit is/)
  })

  it('accepts a file exactly at the limit', () => {
    expect(validateUpload(image({ size: MAX_UPLOAD_BYTES }))).toBeNull()
  })

  it('rejects an empty file', () => {
    expect(validateUpload(image({ size: 0 }))).toMatch(/empty/)
  })
})

describe('formatBytes', () => {
  it('scales the unit to the size', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('safeName', () => {
  it('strips the extension and punctuation', () => {
    expect(safeName('Suva Open final.jpg')).toBe('Suva-Open-final')
  })

  it('removes path separators', () => {
    expect(safeName('../../etc/passwd.png')).toBe('etc-passwd')
  })

  it('strips accents', () => {
    expect(safeName('Nadī.png')).toBe('Nadi')
  })

  it('falls back to a placeholder when nothing usable remains', () => {
    expect(safeName('!!!.png')).toBe('image')
    expect(safeName('.png')).toBe('image')
  })

  it('caps the length', () => {
    expect(safeName(`${'a'.repeat(200)}.png`).length).toBeLessThanOrEqual(60)
  })
})

describe('storagePath', () => {
  const at = new Date('2026-03-14T00:00:00Z')

  it('files uploads under a year and month folder', () => {
    expect(storagePath(image(), 'abc123', at)).toBe('2026/03/abc123-photo.jpg')
  })

  it('takes the extension from the MIME type, not the filename', () => {
    // A file named .php but uploaded as an image must not be stored as .php.
    expect(storagePath(image({ name: 'shell.php', type: 'image/png' }), 'id', at)).toBe(
      '2026/03/id-shell.png',
    )
  })

  it('cannot be made to escape its folder', () => {
    const path = storagePath(image({ name: '../../../secret.jpg' }), 'id', at)
    expect(path).not.toContain('..')
    expect(path).toBe('2026/03/id-secret.jpg')
  })

  it('pads single-digit months', () => {
    expect(storagePath(image(), 'id', new Date('2026-01-05T00:00:00Z'))).toMatch(
      /^2026\/01\//,
    )
  })
})

describe('storagePathFromPublicUrl', () => {
  const base = 'https://abc.supabase.co/storage/v1/object/public/media/'

  it('recovers the object path so the file can be deleted with its row', () => {
    expect(storagePathFromPublicUrl(`${base}2026/03/id-photo.jpg`)).toBe(
      '2026/03/id-photo.jpg',
    )
  })

  it('ignores a query string', () => {
    expect(storagePathFromPublicUrl(`${base}2026/03/photo.jpg?width=200`)).toBe(
      '2026/03/photo.jpg',
    )
  })

  it('decodes percent-encoding', () => {
    expect(storagePathFromPublicUrl(`${base}2026/03/a%20b.jpg`)).toBe('2026/03/a b.jpg')
  })

  it('returns null for a URL that is not in this bucket', () => {
    // A hand-entered URL points at someone else's server; deleting the row
    // must not try to delete anything in Storage.
    expect(storagePathFromPublicUrl('https://example.com/photo.jpg')).toBeNull()
    expect(
      storagePathFromPublicUrl(
        'https://abc.supabase.co/storage/v1/object/public/other/x.jpg',
      ),
    ).toBeNull()
  })

  it('returns null for a traversal attempt or an empty path', () => {
    expect(storagePathFromPublicUrl(`${base}../secrets.jpg`)).toBeNull()
    expect(storagePathFromPublicUrl(base)).toBeNull()
  })
})
