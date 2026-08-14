export function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3.5 text-sm text-red-800 ring-1 ring-red-200 ring-inset"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="mt-0.5 size-5 shrink-0 text-red-500"
      >
        <circle cx="10" cy="10" r="7.5" />
        <path d="M10 6v4.5M10 13.5h.01" />
      </svg>
      <span>{message}</span>
    </div>
  )
}
