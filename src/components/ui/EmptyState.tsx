export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-stone-100 text-stone-400"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="size-5"
        >
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6.5v4M10 13.5h.01" />
        </svg>
      </span>
      <p className="mx-auto max-w-md text-sm text-stone-500">{message}</p>
    </div>
  )
}
