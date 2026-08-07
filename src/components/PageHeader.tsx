export function PageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <header className="mb-8 border-b border-stone-200 pb-4">
      <h1 className="text-3xl">{title}</h1>
      {description ? <p className="mt-2 text-stone-600">{description}</p> : null}
    </header>
  )
}
