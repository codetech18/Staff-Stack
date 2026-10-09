import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './auth/Login'
import Feedback from '@/components/ui/Feedback'
export default function Invitation() {
  const { token } = useParams(),
    { session, refreshOrg } = useAuth(),
    navigate = useNavigate()
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const accept = async () => {
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
      if (error) throw error
      await refreshOrg()
      navigate('/dashboard')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthLayout
      title="Join your workspace"
      sub="This invitation is tied to the email address your administrator invited."
    >
      <Feedback error message={error} />
      {session ? (
        <button className="btn-primary w-full justify-center" disabled={busy} onClick={accept}>
          {busy ? 'Joining…' : 'Accept invitation'}
        </button>
      ) : (
        <>
          <p className="text-xs text-mut mb-4">
            Sign in or create an account with the invited email, verify it, then return to this
            link.
          </p>
          <Link className="btn-primary w-full justify-center" to="/login">
            Sign in
          </Link>
          <Link className="btn-ghost w-full justify-center mt-3" to="/signup">
            Create account
          </Link>
        </>
      )}
    </AuthLayout>
  )
}
