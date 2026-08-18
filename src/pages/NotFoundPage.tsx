import { Link } from 'react-router-dom'

import { Logo } from '../components/Logo.tsx'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <Logo className="mx-auto w-28 opacity-70" />
      <h1 className="mt-8 text-3xl">Page not found</h1>
      <p className="mt-4 text-stone-600">
        That page does not exist. It may have been moved, or the link may be
        wrong.
      </p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-crimson-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-crimson-700"
      >
        Back to the home page
      </Link>
    </div>
  )
}
