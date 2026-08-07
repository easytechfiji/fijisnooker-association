import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader.tsx'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <p className="text-stone-600">
        That page does not exist.{' '}
        <Link to="/" className="text-baize-700 underline underline-offset-2">
          Back to the home page
        </Link>
        .
      </p>
    </>
  )
}
