import { ASSOCIATION_NAME } from '../lib/brand.ts'

/**
 * The association badge.
 *
 * The source file is a 244px square with the badge centred on white, so
 * `rounded-full` crops the corners away and leaves the disc reading as a
 * badge on any background. It is intentionally never rendered much above its
 * native size — beyond that the scan starts to show.
 */
export function Logo({
  className = '',
  decorative = true,
}: {
  className?: string
  /** Pass false where the badge is the only thing naming the association. */
  decorative?: boolean
}) {
  return (
    <img
      src="/logo.jpg"
      alt={decorative ? '' : ASSOCIATION_NAME}
      width={244}
      height={243}
      className={`rounded-full bg-white object-cover ${className}`}
    />
  )
}
