import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Org } from '@/types'
import { isDemo, demoOrg, demoSession } from './demo'
import type { MemberRole } from './workflows'
type AuthCtx = {
  session: Session | null
  loading: boolean
  org: Org | null
  orgLoading: boolean
  role: MemberRole | null
  mfaVerified: boolean
  error: string
  refreshOrg: () => Promise<void>
  signOut: () => Promise<void>
}
const Ctx = createContext<AuthCtx>({} as AuthCtx)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(isDemo ? (demoSession as Session) : null)
  const [loading, setLoading] = useState(!isDemo),
    [orgLoading, setOrgLoading] = useState(!isDemo)
  const [org, setOrg] = useState<Org | null>(isDemo ? demoOrg : null),
    [role, setRole] = useState<MemberRole | null>(isDemo ? 'owner' : null),
    [error, setError] = useState('')
  const checked = useRef<string | null>(isDemo ? 'demo-user' : null),
    generation = useRef(0)
  useEffect(() => {
    if (isDemo) return
    let alive = true
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive) {
          setSession(data.session)
          setLoading(false)
          if (error) setError(error.message)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Unable to load your session. Refresh and try again.')
          setLoading(false)
        }
      })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])
  const refreshOrg = async () => {
    if (isDemo) return
    const ticket = ++generation.current
    if (!session) {
      setOrg(null)
      setRole(null)
      checked.current = null
      setOrgLoading(false)
      return
    }
    setOrgLoading(true)
    setError('')
    try {
      const { data: membership, error: memberError } = await supabase
        .from('org_members')
        .select('role,org_id')
        .eq('user_id', session.user.id)
        .order('created_at')
        .limit(1)
        .maybeSingle()
      if (memberError) throw memberError
      let query = supabase.from('organisations').select('*')
      const result = membership
        ? await query.eq('id', membership.org_id).maybeSingle()
        : await query.eq('owner_id', session.user.id).limit(1).maybeSingle()
      if (result.error) throw result.error
      if (ticket !== generation.current) return
      setOrg(result.data as Org | null)
      setRole((membership?.role as MemberRole) ?? (result.data ? 'owner' : null))
    } catch (e) {
      if (ticket === generation.current) {
        setError((e as Error).message)
        setOrg(null)
        setRole(null)
      }
    } finally {
      if (ticket === generation.current) {
        checked.current = session.user.id
        setOrgLoading(false)
      }
    }
  }
  useEffect(() => {
    if (!loading) void refreshOrg()
  }, [session?.user.id, loading])
  let mfaVerified = isDemo
  try {
    if (session?.access_token.includes('.'))
      mfaVerified =
        JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          .aal === 'aal2'
  } catch {}
  const signOut = async () => {
    if (isDemo) {
      sessionStorage.removeItem('staffstack-demo')
      location.href = '/login'
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        org,
        role,
        mfaVerified,
        error,
        orgLoading: orgLoading || (!!session && checked.current !== session.user.id),
        refreshOrg,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}
