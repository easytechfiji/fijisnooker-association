import { ASSOCIATION_NAME } from '../lib/brand.ts'

/**
 * The association badge: the crimson disc inside its laurel wreath.
 *
 * The source is a 720×624 PNG with the white surround cut away, so it drops
 * onto the maroon masthead and the parchment page alike without a plate behind
 * it. `object-contain` keeps the wreath tips intact when a caller sizes it with
 * a square utility such as `size-12`.
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
      src="/logo.png"
      alt={decorative ? '' : ASSOCIATION_NAME}
      width={720}
      height={624}
      className={`object-contain ${className}`}
    />
  )
}
