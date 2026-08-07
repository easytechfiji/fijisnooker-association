import { initials } from '../lib/format.ts'

const SIZES = {
  sm: 'size-9 text-xs',
  md: 'size-12 text-sm',
  lg: 'size-28 text-2xl',
} as const

/**
 * Player photo, falling back to initials when `photo_url` is empty — which it
 * will be for most players until someone uploads photos through the admin
 * panel in Phase 3.
 *
 * `photo_url` is admin-entered free text. An `<img src>` is safe for
 * `javascript:` URLs (browsers do not execute them there), so no scheme
 * filtering is needed; a broken or hostile URL simply fails to load.
 */
export function PlayerAvatar({
  name,
  photoUrl,
  size = 'md',
}: {
  name: string
  photoUrl?: string | null
  size?: keyof typeof SIZES
}) {
  const shared = `${SIZES[size]} shrink-0 rounded-full object-cover`

  if (photoUrl) {
    return <img src={photoUrl} alt="" className={`${shared} bg-stone-200`} loading="lazy" />
  }

  return (
    <span
      aria-hidden="true"
      className={`${shared} flex items-center justify-center bg-baize-100 font-semibold text-baize-700`}
    >
      {initials(name)}
    </span>
  )
}
