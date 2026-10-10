import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const submit = async () => {
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    navigate('/dashboard')
  }

  return (
    <AuthLayout title="Welcome back" sub="Sign in to manage your team">
      {notice && (
        <div role="status" className="text-ok text-xs mb-4">
          {notice}
        </div>
      )}
      {error && (
        <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{error}</div>
      )}
      <label htmlFor="login-email" className="label">
        Email
      </label>
      <input
        id="login-email"
        autoComplete="email"
        className="input mb-3"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@business.ng"
      />
      <label htmlFor="login-password" className="label">
        Password
      </label>
      <input
        id="login-password"
        autoComplete="current-password"
        className="input mb-2"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <label className="flex items-center gap-2 text-xs text-mut mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          aria-controls="login-password"
          className="accent-accent"
        />
        Show password
      </label>
      <button
        className="btn-primary w-full justify-center py-2.5"
        onClick={submit}
        disabled={busy || !email || !password}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <button
        className="text-xs text-accent mt-3"
        disabled={!email || busy}
        onClick={async () => {
          setError('')
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/reset-password`,
          })
          if (error) setError(error.message)
          else setNotice('If this email has an account, a password reset link will arrive shortly.')
        }}
      >
        Forgot password?
      </button>
      {import.meta.env.DEV && (
        <a className="btn-ghost w-full justify-center mt-3" href="/dashboard?demo=1">
          Explore the demo workspace →
        </a>
      )}
      <div className="text-xs text-mut text-center mt-4">
        New to StaffStack?{' '}
        <Link to="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
      </div>
    </AuthLayout>
  )
}

export function AuthLayout({
  title,
  sub,
  children,
}: {
  title: string
  sub: string
  children: React.ReactNode
}) {
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <span className="eyebrow">PEOPLE FIRST. ALWAYS.</span>
        <h2>
          Great schools start
          <br />
          with supported people.
        </h2>
        <p>
          Make room for what matters. Bring your people, payroll, and everyday operations together
          in one thoughtful workspace.
        </p>
        <div className="auth-story-card">
          <span>LESS ADMIN. MORE CLARITY.</span>
          <strong>
            A better day for your team
            <br />
            starts right here.
          </strong>
        </div>
        <small>StaffStack · Made for Nigerian teams</small>
      </aside>
      <div className="auth-form">
        <Link
          to="/"
          aria-label="StaffStack home"
          className="flex items-center gap-2.5 justify-center mb-8"
        >
          <div className="w-8 h-8 rounded-lg bg-accent grid place-items-center font-display text-sm font-extrabold text-white">
            S
          </div>
          <div className="font-display text-lg font-extrabold text-ink">
            Staff<span className="text-accent">Stack</span>
          </div>
        </Link>
        <div className="panel p-8">
          <h1 className="font-display text-xl font-extrabold text-ink mb-1">{title}</h1>
          <p className="text-xs text-mut mb-5">{sub}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
