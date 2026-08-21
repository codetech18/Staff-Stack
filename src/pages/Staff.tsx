import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { naira, dateShort } from '@/lib/format'
import { NIGERIAN_BANKS } from '@/lib/banks'
import { StatCard, Avatar, Badge, Modal, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import type { Employee, Department } from '@/types'

export default function Staff() {
  const { org } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    if (!org) return
    const [e, d] = await Promise.all([
      supabase.from('employees')
        .select('*, departments(name), salary_structures(*)')
        .eq('org_id', org.id).neq('status', 'exited').order('created_at'),
      supabase.from('departments').select('*').eq('org_id', org.id),
    ])
    setEmployees((e.data ?? []) as Employee[])
    setDepartments((d.data ?? []) as Department[])
    setLoading(false)
  }
  useEffect(() => { load() }, [org?.id])

  const currentSalary = (e: Employee) => {
    const s = [...(e.salary_structures ?? [])].sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
    return s ? s.basic + s.housing + s.transport + s.other_allowances : 0
  }

  if (loading) return <><PageHeader title="Staff" /><Spinner /></>

  return (
    <>
      <PageHeader title="Staff" actions={<button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add staff</button>} />
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total staff" value={String(employees.length)} sub={`${departments.length} department${departments.length === 1 ? '' : 's'}`} />
          <StatCard label="Full-time" value={String(employees.filter(e => e.employment_type === 'full-time').length)} />
          <StatCard label="Contract" value={String(employees.filter(e => e.employment_type === 'contract').length)} />
          <StatCard label="On leave" value={String(employees.filter(e => e.status === 'on-leave').length)} />
        </div>

        <div className="panel">
          <div className="panel-head"><div className="panel-title">All staff</div></div>
          {employees.length === 0 ? (
            <EmptyState icon="👥" text="No staff added yet. Add your first employee to get started."
              action={<button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add staff</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface2">
                    {['Name', 'Department', 'Role', 'Start date', 'Salary', 'Status'].map(h => (
                      <th key={h} className="text-left font-mono text-[9px] uppercase tracking-widest text-mut px-4 py-2.5 border-b border-line">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id} className="hover:bg-surface2 transition-colors">
                      <td className="px-4 py-3 border-b border-line">
                        <div className="flex items-center gap-2.5">
                          <Avatar first={e.first_name} last={e.last_name} size={28} />
                          <div>
                            <div className="text-[13px] font-semibold text-white">{e.first_name} {e.last_name}</div>
                            <div className="text-[11px] text-mut">{e.email ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-line text-[13px]">{e.departments?.name ?? '—'}</td>
                      <td className="px-4 py-3 border-b border-line text-[13px]">{e.role}</td>
                      <td className="px-4 py-3 border-b border-line font-mono text-[11px] text-mut2">{dateShort(e.start_date)}</td>
                      <td className="px-4 py-3 border-b border-line font-mono text-xs">{naira(currentSalary(e))}</td>
                      <td className="px-4 py-3 border-b border-line">
                        {e.status === 'active' && <Badge tone="ok">Active</Badge>}
                        {e.status === 'on-leave' && <Badge tone="warn">On leave</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddStaffModal departments={departments} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </>
  )
}

function AddStaffModal({ departments, onClose, onSaved }: {
  departments: Department[]; onClose: () => void; onSaved: () => void
}) {
  const { org } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({
    first_name: '', last_name: '', email: '', phone: '', role: '',
    department_id: departments[0]?.id ?? '', employment_type: 'full-time',
    start_date: new Date().toISOString().slice(0, 10),
    basic: '', housing: '', transport: '', other_allowances: '', annual_rent: '',
    bank_code: '', account_number: '', account_name: '',
    pension_enabled: true, nhf_enabled: true, nsitf_enabled: true,
  })
  const set = (k: string, v: string | boolean) => setF(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!org) return
    setBusy(true); setError('')
    const bank = NIGERIAN_BANKS.find(b => b.code === f.bank_code)

    const { data: emp, error: e1 } = await supabase.from('employees').insert({
      org_id: org.id,
      department_id: f.department_id || null,
      first_name: f.first_name, last_name: f.last_name,
      email: f.email || null, phone: f.phone || null,
      role: f.role, employment_type: f.employment_type,
      start_date: f.start_date,
      bank_code: f.bank_code || null, bank_name: bank?.name ?? null,
      account_number: f.account_number || null, account_name: f.account_name || null,
    }).select().single()

    if (e1 || !emp) { setBusy(false); return setError(e1?.message ?? 'Failed to save') }

    await supabase.from('salary_structures').insert({
      employee_id: emp.id,
      basic: Number(f.basic) || 0,
      housing: Number(f.housing) || 0,
      transport: Number(f.transport) || 0,
      other_allowances: Number(f.other_allowances) || 0,
      annual_rent: Number(f.annual_rent) || 0,
      pension_enabled: f.pension_enabled,
      nhf_enabled: f.nhf_enabled,
      nsitf_enabled: f.nsitf_enabled,
    })

    await supabase.from('leave_balances').insert({ employee_id: emp.id, year: new Date().getFullYear() })

    setBusy(false)
    onSaved()
  }

  return (
    <Modal title="Add staff member" onClose={onClose}>
      {error && <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{error}</div>}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><label className="label">First name</label><input className="input" value={f.first_name} onChange={e => set('first_name', e.target.value)} /></div>
        <div><label className="label">Last name</label><input className="input" value={f.last_name} onChange={e => set('last_name', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><label className="label">Email</label><input className="input" type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="for payslips" /></div>
        <div><label className="label">Phone</label><input className="input" value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><label className="label">Role</label><input className="input" value={f.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Accountant" /></div>
        <div>
          <label className="label">Department</label>
          <select className="input" value={f.department_id} onChange={e => set('department_id', e.target.value)}>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label">Employment type</label>
          <select className="input" value={f.employment_type} onChange={e => set('employment_type', e.target.value)}>
            <option value="full-time">Full-time</option>
            <option value="contract">Contract</option>
            <option value="part-time">Part-time</option>
          </select>
        </div>
        <div><label className="label">Start date</label><input className="input" type="date" value={f.start_date} onChange={e => set('start_date', e.target.value)} /></div>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2 pt-2 border-t border-line">Monthly salary structure</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className="label">Basic (₦)</label><input className="input" type="number" value={f.basic} onChange={e => set('basic', e.target.value)} /></div>
        <div><label className="label">Housing (₦)</label><input className="input" type="number" value={f.housing} onChange={e => set('housing', e.target.value)} /></div>
        <div><label className="label">Transport (₦)</label><input className="input" type="number" value={f.transport} onChange={e => set('transport', e.target.value)} /></div>
        <div><label className="label">Other allowances (₦)</label><input className="input" type="number" value={f.other_allowances} onChange={e => set('other_allowances', e.target.value)} /></div>
      </div>

      <div className="mb-4">
        <label className="label">Annual rent paid (₦) — optional, for rent relief</label>
        <input className="input" type="number" value={f.annual_rent} onChange={e => set('annual_rent', e.target.value)} placeholder="0" />
        <div className="text-[10px] text-mut mt-1">Reduces taxable income by 20% of this, capped at ₦500,000.</div>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2 pt-2 border-t border-line">Statutory deductions</div>
      <div className="text-[11px] text-mut mb-3">Not every staff member is enrolled in every scheme — set what applies to this person.</div>
      <div className="flex flex-col gap-2.5 mb-5">
        <label className="flex items-center gap-2.5 bg-surface2 border border-line2 rounded-lg px-3 py-2.5 cursor-pointer">
          <input type="checkbox" checked={f.pension_enabled} onChange={e => set('pension_enabled', e.target.checked)} className="accent-accent w-4 h-4" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-white">Pension (8% employee + 10% employer)</div>
            <div className="text-[10px] text-mut">PRA 2014 · on basic + housing + transport</div>
          </div>
        </label>
        <label className="flex items-center gap-2.5 bg-surface2 border border-line2 rounded-lg px-3 py-2.5 cursor-pointer">
          <input type="checkbox" checked={f.nhf_enabled} onChange={e => set('nhf_enabled', e.target.checked)} className="accent-accent w-4 h-4" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-white">NHF (2.5% of basic)</div>
            <div className="text-[10px] text-mut">National Housing Fund contribution</div>
          </div>
        </label>
        <label className="flex items-center gap-2.5 bg-surface2 border border-line2 rounded-lg px-3 py-2.5 cursor-pointer">
          <input type="checkbox" checked={f.nsitf_enabled} onChange={e => set('nsitf_enabled', e.target.checked)} className="accent-accent w-4 h-4" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-white">NSITF (1% of gross)</div>
            <div className="text-[10px] text-mut">Employer-paid cost, not deducted from staff</div>
          </div>
        </label>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2 pt-2 border-t border-line">Bank details (for salary CSV)</div>
      <div className="mb-3">
        <label className="label">Bank</label>
        <select className="input" value={f.bank_code} onChange={e => set('bank_code', e.target.value)}>
          <option value="">Select bank</option>
          {NIGERIAN_BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div><label className="label">Account number</label><input className="input" value={f.account_number} onChange={e => set('account_number', e.target.value)} maxLength={10} /></div>
        <div><label className="label">Account name</label><input className="input" value={f.account_name} onChange={e => set('account_name', e.target.value)} placeholder="must match bank records" /></div>
      </div>

      <button className="btn-primary w-full justify-center py-2.5" onClick={save} disabled={busy || !f.first_name || !f.last_name || !f.role || !f.basic}>
        {busy ? 'Saving…' : 'Add staff member'}
      </button>
    </Modal>
  )
}
