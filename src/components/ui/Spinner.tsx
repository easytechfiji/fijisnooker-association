export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-stone-500">
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-stone-300 border-t-baize-600"
      />
      <span>{label}</span>
    </div>
  )
}
