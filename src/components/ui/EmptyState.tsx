export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-stone-300 px-4 py-10 text-center text-stone-500">
      {message}
    </p>
  )
}
