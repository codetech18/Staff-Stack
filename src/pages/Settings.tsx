import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { dateShort } from '@/lib/format'
import PageHeader from '@/components/layout/PageHeader'
import AccountSecurity from '@/components/AccountSecurity'
import WorkspaceAccess from '@/components/WorkspaceAccess'
import Feedback from '@/components/ui/Feedback'
import { canManagePeople } from '@/lib/workflows'
import type { Term } from '@/types'

export default function Settings() {
  const { org, session, role, mfaVerified, refreshOrg, signOut } = useAuth()
  const navigate = useNavigate()

  const [terms, setTerms] = useState<Term[]>([])
  const [termName, setTermName] = useState('')
  const [termStart, setTermStart] = useState('')
  const [termEnd, setTermEnd] = useState('')
  const [feedback, setFeedback] = useState('')
  const editable = canManagePeople(role)
  const [savingTerm, setSavingTerm] = useState(false)

  const loadTerms = async () => {
    if (!org) return
    const { data } = await supabase
      .from('terms')
      .select('*')
      .eq('org_id', org.id)
      .order('start_date')
    setTerms((data ?? []) as Term[])
  }
  useEffect(() => {
    loadTerms()
  }, [org?.id])

  const addTerm = async () => {
    if (!org || !termName || !termStart || !termEnd) return
    setSavingTerm(true)
    if (termEnd < termStart) {
      setSavingTerm(false)
      return setFeedback('Term end must be after its start.')
    }
    const { error } = await supabase
      .from('terms')
      .insert({ org_id: org.id, name: termName, start_date: termStart, end_date: termEnd })
    if (error) {
      setSavingTerm(false)
      return setFeedback(error.message)
    }
    setTermName('')
    setTermStart('')
    setTermEnd('')
    setSavingTerm(false)
    loadTerms()
  }

  const removeTerm = async (id: string) => {
    const { error } = await supabase.from('terms').delete().eq('id', id)
    if (error) return setFeedback(error.message)
    loadTerms()
  }

  const [orgConfirm, setOrgConfirm] = useState('')
  const [deletingOrg, setDeletingOrg] = useState(false)
  const [orgError, setOrgError] = useState('')

  const [acctConfirm, setAcctConfirm] = useState('')
  const [deletingAcct, setDeletingAcct] = useState(false)
  const [acctError, setAcctError] = useState('')

  const orgMatch = org && orgConfirm.trim() === org.name
  const acctMatch = acctConfirm.trim() === 'DELETE'

  const deleteOrg = async () => {
    if (!org || !orgMatch) return
    setDeletingOrg(true)
    setOrgError('')
    const { error } = await supabase.rpc('delete_workspace', { p_org: org.id, p_name: orgConfirm })
    setDeletingOrg(false)
    if (error) return setOrgError(error.message)
    await refreshOrg()
    navigate('/onboarding')
  }

  const deleteAccount = async () => {
    if (!acctMatch) return
    setDeletingAcct(true)
    setAcctError('')
    const { error } = await supabase.functions.invoke('delete-account', {
      body: { confirmation: acctConfirm },
    })
    setDeletingAcct(false)
    if (error)
      return setAcctError('Could not delete account — check the edge function is deployed.')
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="p-6 max-w-2xl">
        <Feedback message={feedback} error />
        <AccountSecurity />
        {role === 'owner' && mfaVerified && org && <WorkspaceAccess org={org.id} />}
        <div className="panel mb-6">
          <div className="panel-head">
            <div className="panel-title">Organisation</div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-mut">Name</span>
            <span className="text-ink font-medium text-right">{org?.name ?? '—'}</span>
            <span className="text-mut">State</span>
            <span className="text-right">{org?.state ?? '—'}</span>
            <span className="text-mut">Industry</span>
            <span className="text-right">{org?.industry ?? '—'}</span>
            <span className="text-mut">Salary day</span>
            <span className="text-right">{org?.salary_day ?? '—'}</span>
            <span className="text-mut">Signed in as</span>
            <span className="text-right">{session?.user.email}</span>
          </div>
        </div>

        <div className="panel mb-6">
          <div className="panel-head">
            <div className="panel-title">Term dates</div>
          </div>
          <div className="p-4">
            <p className="text-xs text-mut mb-3 leading-relaxed">
              Add your school's terms so Attendance knows the difference between a real absence and
              a normal mid-term break. Without any terms set, every weekday is treated as a school
              day.
            </p>
            {terms.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-4">
                {terms.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between bg-surface2 border border-line2 rounded-lg px-3 py-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink">{t.name}</div>
                      <div className="text-[11px] text-mut">
                        {dateShort(t.start_date)} – {dateShort(t.end_date)}
                      </div>
                    </div>
                    <button
                      className="text-mut hover:text-danger text-sm"
                      disabled={!editable}
                      aria-label="Remove term"
                      onClick={() => removeTerm(t.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <input
                className="input"
                value={termName}
                onChange={(e) => setTermName(e.target.value)}
                placeholder="e.g. First Term 2026/2027"
              />
              <input
                className="input"
                type="date"
                value={termStart}
                onChange={(e) => setTermStart(e.target.value)}
              />
              <input
                className="input"
                type="date"
                value={termEnd}
                onChange={(e) => setTermEnd(e.target.value)}
              />
            </div>
            <button
              className="btn-primary mt-3"
              onClick={addTerm}
              disabled={!editable || savingTerm || !termName || !termStart || !termEnd}
            >
              {savingTerm ? 'Adding…' : '+ Add term'}
            </button>
          </div>
        </div>

        <div className="panel border-danger/30 mb-6">
          <div className="panel-head border-danger/20">
            <div className="panel-title text-danger">Delete organisation</div>
          </div>
          <div className="p-4">
            <p className="text-xs text-mut mb-3 leading-relaxed">
              This permanently deletes <strong className="text-ink">{org?.name}</strong> and every
              staff record, payroll run, payslip, leave request, attendance record, subject, and
              document tied to it. Removal is blocked while payroll history exists. This cannot be
              undone.
            </p>
            <label className="label">
              Type <span className="text-ink font-semibold">{org?.name}</span> to confirm
            </label>
            <input
              className="input mb-3"
              value={orgConfirm}
              onChange={(e) => setOrgConfirm(e.target.value)}
              placeholder={org?.name}
            />
            {orgError && (
              <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">
                {orgError}
              </div>
            )}
            <button
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={role !== 'owner' || !orgMatch || deletingOrg}
              onClick={deleteOrg}
            >
              {deletingOrg ? 'Deleting…' : 'Delete organisation permanently'}
            </button>
          </div>
        </div>

        <div className="panel border-danger/30">
          <div className="panel-head border-danger/20">
            <div className="panel-title text-danger">Delete account</div>
          </div>
          <div className="p-4">
            <p className="text-xs text-mut mb-3 leading-relaxed">
              This permanently deletes your login and removes you as a member of every organisation.
              If you own an organisation, delete it above first — this will not delete organisations
              you own on its own.
            </p>
            <label className="label">
              Type <span className="text-ink font-semibold">DELETE</span> to confirm
            </label>
            <input
              className="input mb-3"
              value={acctConfirm}
              onChange={(e) => setAcctConfirm(e.target.value)}
              placeholder="DELETE"
            />
            {acctError && (
              <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">
                {acctError}
              </div>
            )}
            <button
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={!acctMatch || deletingAcct}
              onClick={deleteAccount}
            >
              {deletingAcct ? 'Deleting…' : 'Delete account permanently'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
