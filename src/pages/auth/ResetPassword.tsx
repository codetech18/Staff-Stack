import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './Login'
import Feedback from '@/components/ui/Feedback'
import { Link } from 'react-router-dom'
export default function ResetPassword() {
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) throw Error('Open the reset link from your email first.')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AuthLayout
      title="Set a new password"
      sub="Choose a unique password of at least 12 characters."
    >
      <Feedback error message={error} />
      {done ? (
        <>
          <Feedback message="Password updated. You can return to your workspace." />
          <Link className="btn-primary" to="/dashboard">
            Open workspace
          </Link>
        </>
      ) : (
        <>
          <label htmlFor="new-password" className="label">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className="input mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label htmlFor="confirm-password" className="label">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className="input mb-4"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            className="btn-primary w-full justify-center"
            disabled={busy || password.length < 12 || password !== confirm}
            onClick={submit}
          >
            Update password
          </button>
        </>
      )}
    </AuthLayout>
  )
}
