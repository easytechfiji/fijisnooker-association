export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-stone-500">
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-stone-200 border-t-baize-500"
      />
      <span>{label}</span>
    </div>
  )
}
