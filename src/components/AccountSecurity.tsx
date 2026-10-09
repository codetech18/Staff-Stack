import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isDemo } from '@/lib/demo'
import { useAuth } from '@/lib/auth'
import Feedback from './ui/Feedback'
export default function AccountSecurity() {
  const { mfaVerified } = useAuth()
  const [factor, setFactor] = useState(''),
    [qr, setQr] = useState(''),
    [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    if (isDemo) return
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) setError(error.message)
      else setFactor(data.totp.find((f) => f.status === 'verified')?.id ?? '')
    })
  }, [])
  const enroll = async () => {
    setBusy(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `StaffStack ${new Date().toISOString()}`,
      })
      if (error) throw error
      setFactor(data.id)
      setQr(data.totp.qr_code)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const verify = async () => {
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor, code })
      if (error) throw error
      setNotice('Two-step verification confirmed for this session.')
      setQr('')
      setCode('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="panel mb-6">
      <div className="panel-head">
        <h2 className="panel-title">Account security</h2>
      </div>
      <div className="p-4">
        <p className="text-xs text-mut mb-4">
          Payroll changes and member invitations require a verified authenticator code. Confirm a
          code again after each new sign-in.
        </p>
        <Feedback error message={error} />
        <Feedback message={notice} />
        {isDemo ? (
          <p className="text-xs text-ok">
            The local demo simulates verification. It does not enrol your real account.
          </p>
        ) : mfaVerified ? (
          <p className="text-xs text-ok">This session has completed two-step verification.</p>
        ) : (
          <>
            {!factor && (
              <button className="btn-primary" disabled={busy} onClick={enroll}>
                Set up authenticator
              </button>
            )}
            {qr && (
              <div className="my-4">
                <p className="text-xs text-mut mb-3">
                  Scan this QR code with your authenticator app, then enter its current code.
                </p>
                <img src={qr} alt="Authenticator enrolment QR code" width={180} height={180} />
              </div>
            )}
            {factor && (
              <>
                <label className="label" htmlFor="mfa-code">
                  Six-digit authenticator code
                </label>
                <input
                  id="mfa-code"
                  className="input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  className="btn-primary mt-3"
                  disabled={busy || code.length !== 6}
                  onClick={verify}
                >
                  {busy ? 'Verifying…' : 'Verify session'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
