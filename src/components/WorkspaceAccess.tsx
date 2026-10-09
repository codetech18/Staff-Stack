import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Feedback from './ui/Feedback'
export default function WorkspaceAccess({ org }: { org: string }) {
  const [members, setMembers] = useState<any[]>([]),
    [invites, setInvites] = useState<any[]>([]),
    [employees, setEmployees] = useState<any[]>([])
  const [email, setEmail] = useState(''),
    [role, setRole] = useState('hr_manager'),
    [employee, setEmployee] = useState(''),
    [link, setLink] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  const load = async () => {
    const [m, i, e] = await Promise.all([
      supabase.from('org_members').select('*').eq('org_id', org),
      supabase
        .from('invitations')
        .select('*')
        .eq('org_id', org)
        .order('created_at', { ascending: false }),
      supabase.from('employees').select('id,first_name,last_name,email,user_id').eq('org_id', org),
    ])
    if (m.error || i.error || e.error)
      setError(m.error?.message ?? i.error?.message ?? e.error?.message ?? 'Could not load access')
    setMembers(m.data ?? [])
    setInvites(i.data ?? [])
    setEmployees(e.data ?? [])
  }
  useEffect(() => {
    void load()
  }, [org])
  const perform = async (name: string, args: any, success: string) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { data, error } = await supabase.rpc(name, args)
      if (error) throw error
      if (name === 'create_invitation') setLink(`${location.origin}/invite/${data}`)
      setNotice(success)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="panel mb-6">
      <div className="panel-head">
        <h2 className="panel-title">Workspace access</h2>
      </div>
      <div className="p-4">
        <p className="text-xs text-mut mb-4">
          Invite another administrator for payroll approval, or link an employee to their
          self-service account. Invitations expire after seven days and require the exact verified
          email. Share the generated link directly with its intended recipient.
        </p>
        <Feedback message={error} error />
        <Feedback message={notice} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="invite-role">
              Role
            </label>
            <select
              id="invite-role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="hr_manager">HR manager</option>
              <option value="payroll_manager">Payroll manager</option>
              <option value="employee">Employee</option>
              <option value="auditor">Auditor (read only)</option>
            </select>
          </div>
          {role === 'employee' && (
            <div className="col-span-2">
              <label className="label" htmlFor="invite-employee">
                Link employee
              </label>
              <select
                id="invite-employee"
                className="input"
                value={employee}
                onChange={(e) => {
                  setEmployee(e.target.value)
                  setEmail(employees.find((p) => p.id === e.target.value)?.email ?? '')
                }}
              >
                <option value="">Select employee</option>
                {employees
                  .filter((e) => !e.user_id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
        <button
          className="btn-primary mt-3"
          disabled={busy || !email || (role === 'employee' && !employee)}
          onClick={() =>
            perform(
              'create_invitation',
              {
                p_org: org,
                p_email: email,
                p_role: role,
                p_employee: role === 'employee' ? employee : null,
              },
              'Invitation created. Share its link with the invited person.'
            )
          }
        >
          Create invitation
        </button>
        {link && (
          <div className="mt-4">
            <label className="label" htmlFor="invitation-link">
              Invitation link
            </label>
            <input id="invitation-link" className="input" readOnly value={link} />
            <button
              className="btn-ghost mt-2"
              onClick={() =>
                navigator.clipboard
                  .writeText(link)
                  .then(() => setNotice('Invitation link copied.'))
                  .catch(() => setError('Copy the link from the field above.'))
              }
            >
              Copy link
            </button>
          </div>
        )}
        <div className="mt-5">
          <h3 className="text-xs font-semibold mb-2">Members</h3>
          {members.map((m) => (
            <div
              className="flex justify-between gap-3 border-b border-line py-3 text-xs"
              key={m.id}
            >
              <span>
                {m.role.replaceAll('_', ' ')} · {String(m.user_id).slice(0, 8)}
              </span>
              {m.role !== 'owner' && (
                <button
                  disabled={busy}
                  className="text-danger"
                  onClick={() =>
                    perform('remove_member', { p_member: m.id }, 'Member access removed.')
                  }
                >
                  Remove access
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <h3 className="text-xs font-semibold mb-2">Invitations</h3>
          {invites.map((i) => (
            <div
              className="flex justify-between gap-3 border-b border-line py-3 text-xs"
              key={i.id}
            >
              <span>
                {i.email} ·{' '}
                {i.accepted_at
                  ? 'Accepted'
                  : new Date(i.expires_at) < new Date()
                    ? 'Expired'
                    : i.role.replaceAll('_', ' ')}
              </span>
              {!i.accepted_at && new Date(i.expires_at) > new Date() && (
                <button
                  disabled={busy}
                  className="text-danger"
                  onClick={() =>
                    perform('revoke_invitation', { p_invitation: i.id }, 'Invitation revoked.')
                  }
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
