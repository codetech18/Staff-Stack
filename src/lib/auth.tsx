import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Org } from '@/types'

type AuthCtx = {
  session: Session | null
  loading: boolean
  org: Org | null
  orgLoading: boolean
  refreshOrg: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({} as AuthCtx)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<Org | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)

  // Tracks which user id we've actually finished checking an org for.
  // This is what prevents a leftover "no org" value from a previous
  // (or no) session from triggering a bad redirect right after login.
  const checkedFor = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const refreshOrg = async () => {
    if (!session) {
      setOrg(null)
      checkedFor.current = null
      setOrgLoading(false)
      return
    }
    setOrgLoading(true)
    const { data } = await supabase
      .from('organisations')
      .select('*')
      .eq('owner_id', session.user.id)
      .limit(1)
      .maybeSingle()
    setOrg(data as Org | null)
    checkedFor.current = session.user.id
    setOrgLoading(false)
  }

  useEffect(() => {
    // Don't attempt an org check until the initial auth check has resolved —
    // avoids an unnecessary extra flicker between "logged out" and "logged in".
    if (loading) return
    refreshOrg()
  }, [session?.user?.id, loading])

  const signOut = async () => { await supabase.auth.signOut() }

  // Derived, not relied-on effect timing: org is only considered "loaded"
  // once we've actually checked it for the CURRENT session's user id.
  // This is what fixes the premature onboarding redirect on login.
  const effectiveOrgLoading = orgLoading || (!!session && checkedFor.current !== session.user.id)

  return (
    <Ctx.Provider value={{ session, loading, org, orgLoading: effectiveOrgLoading, refreshOrg, signOut }}>
      {children}
    </Ctx.Provider>
  )
}
