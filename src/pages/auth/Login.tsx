import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const submit = async () => {
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/')
  }

  return (
    <AuthLayout title="Welcome back" sub="Sign in to manage your team">
      {error && <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{error}</div>}
      <label className="label">Email</label>
      <input className="input mb-3" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.ng" />
      <label className="label">Password</label>
      <input className="input mb-4" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && submit()} />
      <button className="btn-primary w-full justify-center py-2.5" onClick={submit} disabled={busy || !email || !password}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <div className="text-xs text-mut text-center mt-4">
        New to StaffStack? <Link to="/signup" className="text-accent hover:underline">Create an account</Link>
      </div>
    </AuthLayout>
  )
}

export function AuthLayout({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent grid place-items-center font-display text-sm font-extrabold text-white">S</div>
          <div className="font-display text-lg font-extrabold text-white">Staff<span className="text-accent">Stack</span></div>
        </div>
        <div className="panel p-6">
          <h1 className="font-display text-xl font-extrabold text-white mb-1">{title}</h1>
          <p className="text-xs text-mut mb-5">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
