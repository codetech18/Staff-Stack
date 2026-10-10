import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './Login'

export default function Signup() {
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
    if (password.length < 12) return setBusy(false)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: location.origin },
    })
    setBusy(false)
    if (error) return setError(error.message)
    if (!data.session)
      return setNotice(
        'Check your email to verify your account, then sign in. If you were invited, return to your invitation link after verification.'
      )
    navigate('/onboarding')
  }

  return (
    <AuthLayout title="Create your account" sub="Bring your people and payroll together.">
      {notice && (
        <div role="status" className="text-ok text-xs mb-4">
          {notice}
        </div>
      )}
      {error && (
        <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{error}</div>
      )}
      <label htmlFor="signup-email" className="label">
        Work email
      </label>
      <input
        id="signup-email"
        autoComplete="email"
        className="input mb-3"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@business.ng"
      />
      <label htmlFor="signup-password" className="label">
        Password
      </label>
      <input
        id="signup-password"
        autoComplete="new-password"
        className="input mb-2"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 12 characters"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <label className="flex items-center gap-2 text-xs text-mut mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          aria-controls="signup-password"
          className="accent-accent"
        />
        Show password
      </label>
      <button
        className="btn-primary w-full justify-center py-2.5"
        onClick={submit}
        disabled={busy || !email || password.length < 12}
      >
        {busy ? 'Creating…' : 'Create account'}
      </button>
      <div className="text-xs text-mut text-center mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
