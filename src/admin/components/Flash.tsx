/**
 * Confirmation that a change landed.
 *
 * `role="status"` rather than `role="alert"`: a save succeeding should be
 * announced to a screen reader without interrupting whatever it is reading.
 * The message persists until the next action rather than fading on a timer —
 * a notice that disappears before it is read is worse than none.
 */
export function Flash({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <p
      role="status"
      className="mb-6 rounded-md border border-laurel-200 bg-laurel-50 px-4 py-2.5 text-sm text-laurel-800"
    >
      {message}
    </p>
  )
}
