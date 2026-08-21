import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { dateShort } from '@/lib/format'
import { Avatar, Badge, Modal, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import type { Employee, LeaveRequest, Subject } from '@/types'

const LEAVE_TYPES = ['annual', 'sick', 'casual', 'maternity'] as const

export default function Leave() {
  const { org, session } = useAuth()
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [subjectsByEmployee, setSubjectsByEmployee] = useState<Record<string, Subject[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    if (!org) return
    const [r, e, es] = await Promise.all([
      supabase.from('leave_requests').select('*, employees(*)').eq('org_id', org.id).order('created_at', { ascending: false }),
      supabase.from('employees').select('*').eq('org_id', org.id).eq('status', 'active'),
      supabase.from('employee_subjects').select('employee_id, subjects(*)').in(
        'employee_id',
        (await supabase.from('employees').select('id').eq('org_id', org.id)).data?.map(x => x.id) ?? [],
      ),
    ])
    setRequests((r.data ?? []) as LeaveRequest[])
    setEmployees((e.data ?? []) as Employee[])

    const map: Record<string, Subject[]> = {}
    for (const row of (es.data ?? []) as unknown as { employee_id: string; subjects: Subject | Subject[] | null }[]) {
      const subj = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects
      if (!subj) continue
      if (!map[row.employee_id]) map[row.employee_id] = []
      map[row.employee_id].push(subj)
    }
    setSubjectsByEmployee(map)

    setLoading(false)
  }
  useEffect(() => { load() }, [org?.id])

  const review = async (req: LeaveRequest, status: 'approved' | 'declined') => {
    await supabase.from('leave_requests').update({
      status, reviewed_by: session?.user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', req.id)

    if (status === 'approved') {
      // update employee status if leave covers today
      const today = new Date().toISOString().slice(0, 10)
      if (req.start_date <= today && req.end_date >= today) {
        await supabase.from('employees').update({ status: 'on-leave' }).eq('id', req.employee_id)
      }

      // increment used balance
      const year = new Date(req.start_date).getFullYear()
      const { data: bal } = await supabase.from('leave_balances').select('*').eq('employee_id', req.employee_id).eq('year', year).maybeSingle()
      if (bal) {
        const col = req.leave_type === 'annual' ? 'annual_used' : req.leave_type === 'sick' ? 'sick_used' : 'casual_used'
        await supabase.from('leave_balances').update({ [col]: (bal as any)[col] + req.days }).eq('id', bal.id)
      }
    }
    load()
  }

  const pending = requests.filter(r => r.status === 'pending')
  const history = requests.filter(r => r.status !== 'pending')

  if (loading) return <><PageHeader title="Leave" /><Spinner /></>

  return (
    <>
      <PageHeader title="Leave" actions={<button className="btn-primary" onClick={() => setShowAdd(true)}>+ Log leave request</button>} />
      <div className="p-6 grid lg:grid-cols-2 gap-4">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Pending approvals</div>
            {pending.length > 0 && <span className="font-mono text-[10px] text-danger">{pending.length} waiting</span>}
          </div>
          {pending.length === 0 ? (
            <div className="px-4 py-6 text-xs text-mut">No pending requests. All caught up.</div>
          ) : pending.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
              <Avatar first={r.employees?.first_name ?? '?'} last={r.employees?.last_name ?? '?'} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white">{r.employees?.first_name} {r.employees?.last_name}</div>
                <div className="text-[11px] text-mut capitalize">{r.leave_type} · {dateShort(r.start_date)} – {dateShort(r.end_date)} · {r.days} day{r.days === 1 ? '' : 's'}</div>
                {subjectsByEmployee[r.employee_id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {subjectsByEmployee[r.employee_id].map(s => (
                      <span key={s.id} className="text-[10px] bg-warn/10 text-warn px-1.5 py-0.5 rounded">
                        {s.name}{s.class_level ? ` · ${s.class_level}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-ok/10 text-ok hover:bg-ok/25 transition-colors" onClick={() => review(r, 'approved')}>Approve</button>
              <button className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors" onClick={() => review(r, 'declined')}>Decline</button>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel-head"><div className="panel-title">History</div></div>
          {history.length === 0 ? (
            <EmptyState icon="📅" text="No leave history yet." />
          ) : history.slice(0, 12).map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
              <Avatar first={r.employees?.first_name ?? '?'} last={r.employees?.last_name ?? '?'} size={28} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-white">{r.employees?.first_name} {r.employees?.last_name}</div>
                <div className="text-[11px] text-mut capitalize">{r.leave_type} · {r.days}d · {dateShort(r.start_date)}</div>
              </div>
              {r.status === 'approved' ? <Badge tone="ok">Approved</Badge> : <Badge tone="danger">Declined</Badge>}
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <LogLeaveModal
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
    </>
  )
}

function LogLeaveModal({ employees, onClose, onSaved }: {
  employees: Employee[]; onClose: () => void; onSaved: () => void
}) {
  const { org } = useAuth()
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({
    employee_id: employees[0]?.id ?? '',
    leave_type: 'annual',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
    reason: '',
  })
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }))

  const days = Math.max(1, Math.round((new Date(f.end_date).getTime() - new Date(f.start_date).getTime()) / 86400000) + 1)

  const save = async () => {
    if (!org) return
    setBusy(true)
    await supabase.from('leave_requests').insert({
      org_id: org.id, employee_id: f.employee_id, leave_type: f.leave_type,
      start_date: f.start_date, end_date: f.end_date, days, reason: f.reason || null,
    })
    setBusy(false)
    onSaved()
  }

  return (
    <Modal title="Log leave request" onClose={onClose}>
      <label className="label">Employee</label>
      <select className="input mb-3" value={f.employee_id} onChange={e => set('employee_id', e.target.value)}>
        {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
      </select>
      <label className="label">Leave type</label>
      <select className="input mb-3 capitalize" value={f.leave_type} onChange={e => set('leave_type', e.target.value)}>
        {LEAVE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><label className="label">Start date</label><input className="input" type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)} /></div>
        <div><label className="label">End date</label><input className="input" type="date" value={f.end_date} onChange={e => set('end_date', e.target.value)} /></div>
      </div>
      <div className="text-[11px] text-mut mb-3">{days} day{days === 1 ? '' : 's'} of leave</div>
      <label className="label">Reason (optional)</label>
      <input className="input mb-5" value={f.reason} onChange={e => set('reason', e.target.value)} />
      <button className="btn-primary w-full justify-center py-2.5" onClick={save} disabled={busy || !f.employee_id}>
        {busy ? 'Saving…' : 'Submit request'}
      </button>
    </Modal>
  )
}
