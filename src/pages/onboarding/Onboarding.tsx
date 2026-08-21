import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

const NIGERIAN_STATES = ['Lagos','Abuja (FCT)','Rivers','Ogun','Oyo','Kano','Kaduna','Delta','Enugu','Anambra','Edo','Akwa Ibom','Other']

export default function Onboarding() {
  const { session, refreshOrg } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — org
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [state, setState] = useState('Lagos')
  const [salaryDay, setSalaryDay] = useState(25)

  // Step 2 — departments
  const [departments, setDepartments] = useState<string[]>(['General'])
  const [deptInput, setDeptInput] = useState('')

  const finish = async () => {
    if (!session) return
    setBusy(true); setError('')
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6)

    const { data: org, error: orgErr } = await supabase
      .from('organisations')
      .insert({ name, slug, industry, state, salary_day: salaryDay, owner_id: session.user.id })
      .select()
      .single()

    if (orgErr || !org) { setBusy(false); return setError(orgErr?.message ?? 'Could not create organisation') }

    await supabase.from('org_members').insert({ org_id: org.id, user_id: session.user.id, role: 'owner' })
    if (departments.length) {
      await supabase.from('departments').insert(departments.map(d => ({ org_id: org.id, name: d })))
    }

    await refreshOrg()
    setBusy(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[1, 2].map(n => (
            <div key={n} className={`h-1 rounded-full transition-all ${step >= n ? 'bg-accent w-16' : 'bg-line2 w-8'}`} />
          ))}
        </div>

        <div className="panel p-6">
          {step === 1 && (
            <>
              <h1 className="font-display text-xl font-extrabold text-white mb-1">Set up your organisation</h1>
              <p className="text-xs text-mut mb-5">This takes about 2 minutes.</p>
              {error && <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{error}</div>}

              <label className="label">Business name</label>
              <input className="input mb-3" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Foleman Electricals" />

              <label className="label">Industry</label>
              <input className="input mb-3" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. School, Logistics, Retail" />

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="label">State (for PAYE)</label>
                  <select className="input" value={state} onChange={e => setState(e.target.value)}>
                    {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Salary day</label>
                  <select className="input" value={salaryDay} onChange={e => setSalaryDay(Number(e.target.value))}>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}{ordinal(d)} of the month</option>)}
                  </select>
                </div>
              </div>

              <button className="btn-primary w-full justify-center py-2.5" disabled={!name} onClick={() => setStep(2)}>
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="font-display text-xl font-extrabold text-white mb-1">Departments</h1>
              <p className="text-xs text-mut mb-5">Group your staff. You can skip this — everyone starts in "General".</p>

              <div className="flex gap-2 mb-3">
                <input
                  className="input flex-1"
                  value={deptInput}
                  onChange={e => setDeptInput(e.target.value)}
                  placeholder="e.g. Engineering, Finance, Teaching Staff"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && deptInput.trim()) {
                      setDepartments([...departments, deptInput.trim()])
                      setDeptInput('')
                    }
                  }}
                />
                <button
                  className="btn-ghost"
                  onClick={() => { if (deptInput.trim()) { setDepartments([...departments, deptInput.trim()]); setDeptInput('') } }}
                >Add</button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 min-h-[32px]">
                {departments.map((d, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-surface2 border border-line2 rounded-full px-3 py-1 text-xs text-mut2">
                    {d}
                    {d !== 'General' && (
                      <button className="text-mut hover:text-danger" onClick={() => setDepartments(departments.filter((_, j) => j !== i))}>×</button>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                <button className="btn-ghost flex-1 justify-center py-2.5" onClick={() => setStep(1)}>Back</button>
                <button className="btn-primary flex-1 justify-center py-2.5" onClick={finish} disabled={busy}>
                  {busy ? 'Setting up…' : 'Finish setup'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ordinal(n: number) {
  if (n % 10 === 1 && n !== 11) return 'st'
  if (n % 10 === 2 && n !== 12) return 'nd'
  if (n % 10 === 3 && n !== 13) return 'rd'
  return 'th'
}
