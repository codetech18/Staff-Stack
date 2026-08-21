import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import PageHeader from '@/components/layout/PageHeader'

export default function Settings() {
  const { org, session, refreshOrg, signOut } = useAuth()
  const navigate = useNavigate()

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
    setDeletingOrg(true); setOrgError('')
    const { error } = await supabase.from('organisations').delete().eq('id', org.id)
    setDeletingOrg(false)
    if (error) return setOrgError(error.message)
    await refreshOrg()
    navigate('/onboarding')
  }

  const deleteAccount = async () => {
    if (!acctMatch) return
    setDeletingAcct(true); setAcctError('')
    const { error } = await supabase.functions.invoke('delete-account', { body: {} })
    setDeletingAcct(false)
    if (error) return setAcctError('Could not delete account — check the edge function is deployed.')
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="p-6 max-w-2xl">
        <div className="panel mb-6">
          <div className="panel-head"><div className="panel-title">Organisation</div></div>
          <div className="p-4 grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-mut">Name</span><span className="text-white font-medium text-right">{org?.name ?? '—'}</span>
            <span className="text-mut">State</span><span className="text-right">{org?.state ?? '—'}</span>
            <span className="text-mut">Industry</span><span className="text-right">{org?.industry ?? '—'}</span>
            <span className="text-mut">Salary day</span><span className="text-right">{org?.salary_day ?? '—'}</span>
            <span className="text-mut">Signed in as</span><span className="text-right">{session?.user.email}</span>
          </div>
        </div>

        <div className="panel border-danger/30 mb-6">
          <div className="panel-head border-danger/20">
            <div className="panel-title text-danger">Delete organisation</div>
          </div>
          <div className="p-4">
            <p className="text-xs text-mut mb-3 leading-relaxed">
              This permanently deletes <strong className="text-white">{org?.name}</strong> and every staff record, payroll
              run, payslip, leave request, attendance record, subject, and document tied to it. This cannot be undone.
            </p>
            <label className="label">
              Type <span className="text-white font-semibold">{org?.name}</span> to confirm
            </label>
            <input
              className="input mb-3"
              value={orgConfirm}
              onChange={e => setOrgConfirm(e.target.value)}
              placeholder={org?.name}
            />
            {orgError && <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{orgError}</div>}
            <button
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={!orgMatch || deletingOrg}
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
              This permanently deletes your login and removes you as a member of every organisation. If you own an
              organisation, delete it above first — this will not delete organisations you own on its own.
            </p>
            <label className="label">Type <span className="text-white font-semibold">DELETE</span> to confirm</label>
            <input
              className="input mb-3"
              value={acctConfirm}
              onChange={e => setAcctConfirm(e.target.value)}
              placeholder="DELETE"
            />
            {acctError && <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{acctError}</div>}
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
