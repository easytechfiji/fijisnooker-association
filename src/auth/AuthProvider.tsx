import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configError, supabase } from '../lib/supabase.ts'
import { AuthContext } from './authContext.ts'
import type { AuthContextValue } from './authContext.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [adminChecked, setAdminChecked] = useState(false)

  useEffect(() => {
    if (configError) {
      setSessionLoading(false)
      return
    }

    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // No awaited Supabase call belongs in this callback: supabase-js
      // serialises auth work, so calling back into the client here can
      // deadlock. The admin check runs in the effect below instead.
      setSession(nextSession)
      setSessionLoading(false)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  useEffect(() => {
    setAdminChecked(false)

    if (!userId || configError) {
      setIsAdmin(false)
      setAdminChecked(true)
      return
    }

    let active = true

    // `admins` has RLS enabled and deliberately no SELECT policy, so querying
    // the table directly returns zero rows even for genuine admins. is_admin()
    // is SECURITY DEFINER, which is what makes it readable from the browser.
    void supabase.rpc('is_admin').then(({ data, error }) => {
      if (!active) return
      setIsAdmin(!error && data === true)
      setAdminChecked(true)
    })

    return () => {
      active = false
    }
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? error.message : null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin,
      // Held true until the admin check settles, so protected routes never
      // flash "not an admin" at someone who is one.
      loading: sessionLoading || !adminChecked,
      signIn,
      signOut,
    }),
    [session, isAdmin, sessionLoading, adminChecked, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
