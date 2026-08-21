import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './Login'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const submit = async () => {
    setBusy(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/onboarding')
  }

  return (
    <AuthLayout title="Create your account" sub="Free 14-day trial. No card required.">
      {error && <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{error}</div>}
      <label className="label">Work email</label>
      <input className="input mb-3" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.ng" />
      <label className="label">Password</label>
      <input className="input mb-4" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" onKeyDown={e => e.key === 'Enter' && submit()} />
      <button className="btn-primary w-full justify-center py-2.5" onClick={submit} disabled={busy || !email || password.length < 8}>
        {busy ? 'Creating…' : 'Create account'}
      </button>
      <div className="text-xs text-mut text-center mt-4">
        Already have an account? <Link to="/login" className="text-accent hover:underline">Sign in</Link>
      </div>
    </AuthLayout>
  )
}
