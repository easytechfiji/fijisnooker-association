export function PageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <header className="mb-10">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <span className="rule mt-4" aria-hidden="true" />
      {description ? (
        <p className="mt-4 max-w-2xl text-stone-600">{description}</p>
      ) : null}
    </header>
  )
}
