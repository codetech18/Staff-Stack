import { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const refreshOrg = async () => {
    if (!session) { setOrg(null); setOrgLoading(false); return }
    setOrgLoading(true)
    const { data } = await supabase
      .from('organisations')
      .select('*')
      .eq('owner_id', session.user.id)
      .limit(1)
      .maybeSingle()
    setOrg(data as Org | null)
    setOrgLoading(false)
  }

  useEffect(() => { refreshOrg() }, [session?.user?.id])

  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <Ctx.Provider value={{ session, loading, org, orgLoading, refreshOrg, signOut }}>
      {children}
    </Ctx.Provider>
  )
}
