import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth.ts'
import { Spinner } from '../components/ui/Spinner.tsx'

/**
 * Gate on the admin routes.
 *
 * This is a user-experience control, not a security boundary. It decides what
 * the browser renders; it does not decide what the database accepts. Every
 * table in schema.sql has RLS policies requiring public.is_admin() for writes,
 * so a visitor who bypasses this component still cannot change anything.
 */
export default function RequireAdmin() {
  const { session, user, isAdmin, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Spinner label="Checking access…" />
  }

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <h1 className="mb-4 text-2xl">This account is not an admin</h1>
        <p className="mb-3 text-stone-600">
          You are signed in as <strong>{user?.email}</strong>, but that account has no
          row in the <code className="rounded bg-stone-100 px-1">admins</code> table.
          The database would reject any change it tried to make.
        </p>
        <p className="mb-6 text-stone-600">
          To grant access, copy this account&rsquo;s ID from{' '}
          <code className="rounded bg-stone-100 px-1">auth.users</code> in Supabase
          Studio, add it as a row in{' '}
          <code className="rounded bg-stone-100 px-1">admins</code>, then reload.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded bg-crimson-700 px-4 py-2 text-sm font-medium text-white hover:bg-crimson-600"
        >
          Sign out
        </button>
      </main>
    )
  }

  return <Outlet />
}
