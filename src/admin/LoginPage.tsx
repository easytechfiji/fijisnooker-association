import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'
import { ErrorMessage } from '../components/ui/ErrorMessage.tsx'
import { Logo } from '../components/Logo.tsx'
import { ASSOCIATION_NAME } from '../lib/brand.ts'

export default function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await signIn(email, password)
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
      return
    }

    navigate(from, { replace: true })
  }

  if (!loading && session) {
    return <Navigate to={from} replace />
  }

  return (
    <main className="felt flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl shadow-baize-950/30">
        <Logo className="mx-auto size-16" />
        <h1 className="mt-5 text-center text-2xl">Committee login</h1>
        <p className="mt-2 mb-6 text-center text-sm text-stone-600">
          {ASSOCIATION_NAME} administration.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-stone-300 px-3 py-2 focus:border-baize-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-stone-300 px-3 py-2 focus:border-baize-500"
            />
          </div>

          {error ? <ErrorMessage message={error} /> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-baize-700 px-4 py-2 font-medium text-white hover:bg-baize-600 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-stone-500 hover:text-baize-700">
            Back to the site
          </Link>
        </p>
      </div>
    </main>
  )
}
