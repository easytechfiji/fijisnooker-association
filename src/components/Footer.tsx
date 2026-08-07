import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-12 border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          &copy; {new Date().getFullYear()} Fiji Southern Division Billiards &amp;
          Snooker Association
        </p>
        <Link to="/admin" className="hover:text-baize-700">
          Committee login
        </Link>
      </div>
    </footer>
  )
}
