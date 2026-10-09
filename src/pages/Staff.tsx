import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '@/components/ui/Icon'
import ImportPeople from '@/components/ImportPeople'
import EmployeeProfile from '@/components/EmployeeProfile'
import Feedback from '@/components/ui/Feedback'
import { canManagePeople, localDate } from '@/lib/workflows'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { naira, dateShort } from '@/lib/format'
import { NIGERIAN_BANKS } from '@/lib/banks'
import { StatCard, Avatar, Badge, Modal, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { EMPLOYMENT_TYPES, STAFF_CATEGORIES } from '@/lib/school'
import type { Employee, Department, LeaveRequest } from '@/types'

export default function Staff() {
  const { org, role } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [away, setAway] = useState<LeaveRequest[]>([])
  const [params, setParams] = useSearchParams()
  const [showAdd, setShowAdd] = useState(params.get('add') === '1')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1),
    [profile, setProfile] = useState<Employee | null>(null),
    [importing, setImporting] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const editable = canManagePeople(role)
  useEffect(() => setPage(1), [search, category])
  const closeAdd = () => {
    setShowAdd(false)
    if (params.has('add')) setParams({})
  }

  const load = async () => {
    if (!org) return
    const [e, d, leaves] = await Promise.all([
      supabase
        .from('employees')
        .select('*, departments(name), salary_structures(*)')
        .eq('org_id', org.id)
        .order('created_at'),
      supabase.from('departments').select('*').eq('org_id', org.id),
      supabase
        .from('leave_requests')
        .select('*')
        .eq('org_id', org.id)
        .eq('status', 'approved')
        .lte('start_date', localDate())
        .gte('end_date', localDate()),
    ])
    if (e.error || d.error) setError(e.error?.message ?? d.error?.message ?? 'Could not load staff')
    setAway((leaves.data ?? []) as LeaveRequest[])
    setEmployees((e.data ?? []) as Employee[])
    setDepartments((d.data ?? []) as Department[])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [org?.id])

  const currentSalary = (e: Employee) => {
    const s = [...(e.salary_structures ?? [])]
      .filter((s) => s.effective_from <= localDate())
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
    return s
      ? Number(s.basic) + Number(s.housing) + Number(s.transport) + Number(s.other_allowances)
      : 0
  }

  const filtered = employees.filter(
    (e) =>
      `${e.first_name} ${e.last_name} ${e.role} ${e.email ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (category === 'all' || e.staff_category === category)
  )

  if (loading)
    return (
      <>
        <PageHeader title="Staff" />
        <Spinner />
      </>
    )

  return (
    <>
      <PageHeader
        title="Staff"
        actions={
          editable && (
            <>
              <button className="btn-ghost" onClick={() => setImporting(true)}>
                Import CSV
              </button>
              <button className="btn-primary" onClick={() => setShowAdd(true)}>
                + Add staff
              </button>
            </>
          )
        }
      />
      <div className="p-6">
        <Feedback message={error} error />
        <Feedback message={notice} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Total staff"
            value={String(employees.length)}
            sub={`${departments.length} section${departments.length === 1 ? '' : 's'}`}
          />
          <StatCard
            label="Teaching staff"
            value={String(employees.filter((e) => e.staff_category === 'teaching').length)}
          />
          <StatCard
            label="Non-teaching staff"
            value={String(employees.filter((e) => e.staff_category === 'non_teaching').length)}
          />
          <StatCard label="On leave" value={String(away.length)} />
        </div>

        <div className="panel">
          <div className="panel-head flex-wrap gap-3">
            <div className="panel-title">
              All people <span className="text-mut font-normal ml-2">{filtered.length}</span>
            </div>
            <div className="flex gap-2">
              <input
                className="input !w-44 !text-xs"
                aria-label="Search people"
                placeholder="Search name or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="input !w-auto !text-xs"
                aria-label="Filter staff category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                <option value="teaching">Teaching</option>
                <option value="non_teaching">Non-teaching</option>
              </select>
            </div>
          </div>
          {employees.length === 0 ? (
            <EmptyState
              icon="👥"
              text="No staff added yet. Add your first staff member to get started."
              action={
                <button className="btn-primary" onClick={() => setShowAdd(true)}>
                  + Add staff
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface2">
                    {['Name', 'Category', 'Section', 'Role', 'Start date', 'Salary', 'Status'].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left font-mono text-[9px] uppercase tracking-widest text-mut px-4 py-2.5 border-b border-line"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * 10, page * 10).map((e) => (
                    <tr key={e.id} className="hover:bg-surface2 transition-colors">
                      <td className="px-4 py-3 border-b border-line">
                        <div className="flex items-center gap-2.5">
                          <Avatar first={e.first_name} last={e.last_name} size={28} />
                          <div>
                            <button
                              className="text-[13px] font-semibold text-accent hover:underline text-left"
                              onClick={() => setProfile(e)}
                            >
                              {e.first_name} {e.last_name}
                            </button>
                            <div className="text-[11px] text-mut">{e.email ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-line">
                        {e.staff_category === 'teaching' ? (
                          <Badge tone="info">Teaching</Badge>
                        ) : (
                          <Badge tone="warn">Non-teaching</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b border-line text-[13px]">
                        {e.departments?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-line text-[13px]">
                        {e.role}
                        {e.employment_type === 'nysc' && (
                          <span className="ml-1.5 text-[10px] text-accent">NYSC</span>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b border-line font-mono text-[11px] text-mut2">
                        {dateShort(e.start_date)}
                      </td>
                      <td className="px-4 py-3 border-b border-line font-mono text-xs">
                        {naira(currentSalary(e))}
                      </td>
                      <td className="px-4 py-3 border-b border-line">
                        {e.status === 'active' && !away.some((l) => l.employee_id === e.id) && (
                          <Badge tone="ok">Active</Badge>
                        )}
                        {(e.status === 'on-leave' || away.some((l) => l.employee_id === e.id)) && (
                          <Badge tone="warn">On leave</Badge>
                        )}
                        {e.status === 'exited' && <Badge tone="danger">Exited</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-10 text-center text-sm text-mut">
                  No people match your search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 pb-6 text-xs">
        <span>
          {filtered.length} people · Page {page} of {Math.max(1, Math.ceil(filtered.length / 10))}
        </span>
        <button className="btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <button
          className="btn-ghost"
          disabled={page * 10 >= filtered.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      {profile && (
        <EmployeeProfile
          employee={profile}
          departments={departments}
          editable={editable}
          onClose={() => setProfile(null)}
          onSaved={() => {
            setProfile(null)
            setNotice('Profile updated.')
            void load()
          }}
        />
      )}
      {importing && org && (
        <ImportPeople
          org={org.id}
          onClose={() => setImporting(false)}
          onSaved={() => {
            setImporting(false)
            setNotice('People imported successfully.')
            void load()
          }}
        />
      )}
      {showAdd && (
        <AddStaffModal
          departments={departments}
          onClose={closeAdd}
          onSaved={() => {
            closeAdd()
            load()
          }}
        />
      )}
    </>
  )
}

function AddStaffModal({
  departments,
  onClose,
  onSaved,
}: {
  departments: Department[]
  onClose: () => void
  onSaved: () => void
}) {
  const { org } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [f, setF] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    department_id: departments[0]?.id ?? '',
    employment_type: 'full-time',
    staff_category: 'teaching',
    start_date: new Date().toISOString().slice(0, 10),
    basic: '',
    housing: '',
    transport: '',
    other_allowances: '',
    annual_rent: '',
    bank_code: '',
    account_number: '',
    account_name: '',
    pension_enabled: true,
    nhf_enabled: true,
    nsitf_enabled: true,
  })
  const set = (k: string, v: string | boolean) => setF((prev) => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!org) return
    setBusy(true)
    setError('')
    const bank = NIGERIAN_BANKS.find((b) => b.code === f.bank_code)

    const { error } = await supabase.rpc('import_employees', {
      p_org: org.id,
      p_rows: [
        {
          ...f,
          basic: Number(f.basic) || 0,
          housing: Number(f.housing) || 0,
          transport: Number(f.transport) || 0,
          other_allowances: Number(f.other_allowances) || 0,
          annual_rent: Number(f.annual_rent) || 0,
          department_id: f.department_id || null,
          bank_name: bank?.name ?? null,
          effective_from: f.start_date,
        },
      ],
    })
    if (error) {
      setBusy(false)
      return setError(error.message)
    }

    setBusy(false)
    onSaved()
  }

  return (
    <Modal title="Add staff member" onClose={onClose}>
      {error && (
        <div className="text-danger text-xs mb-3 bg-danger/10 rounded-lg px-3 py-2">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="staff-field-1" className="label">
            First name
          </label>
          <input
            id="staff-field-1"
            className="input"
            value={f.first_name}
            onChange={(e) => set('first_name', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="staff-field-2" className="label">
            Last name
          </label>
          <input
            id="staff-field-2"
            className="input"
            value={f.last_name}
            onChange={(e) => set('last_name', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="staff-field-3" className="label">
            Email
          </label>
          <input
            id="staff-field-3"
            className="input"
            type="email"
            value={f.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="for payslips"
          />
        </div>
        <div>
          <label htmlFor="staff-field-4" className="label">
            Phone
          </label>
          <input
            id="staff-field-4"
            className="input"
            value={f.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="staff-field-5" className="label">
            Role
          </label>
          <input
            id="staff-field-5"
            className="input"
            value={f.role}
            onChange={(e) => set('role', e.target.value)}
            placeholder="e.g. Mathematics Teacher"
          />
        </div>
        <div>
          <label htmlFor="staff-field-6" className="label">
            Section / Department
          </label>
          <select
            id="staff-field-6"
            className="input"
            value={f.department_id}
            onChange={(e) => set('department_id', e.target.value)}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="staff-field-7" className="label">
            Staff category
          </label>
          <select
            id="staff-field-7"
            className="input"
            value={f.staff_category}
            onChange={(e) => set('staff_category', e.target.value)}
          >
            {STAFF_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="staff-field-8" className="label">
            Employment type
          </label>
          <select
            id="staff-field-8"
            className="input"
            value={f.employment_type}
            onChange={(e) => set('employment_type', e.target.value)}
          >
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="staff-field-9" className="label">
            Start date
          </label>
          <input
            id="staff-field-9"
            className="input"
            type="date"
            value={f.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
        </div>
        <div></div>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2 pt-2 border-t border-line">
        Monthly salary structure
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="staff-field-10" className="label">
            Basic (₦)
          </label>
          <input
            id="staff-field-10"
            className="input"
            type="number"
            value={f.basic}
            onChange={(e) => set('basic', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="staff-field-11" className="label">
            Housing (₦)
          </label>
          <input
            id="staff-field-11"
            className="input"
            type="number"
            value={f.housing}
            onChange={(e) => set('housing', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="staff-field-12" className="label">
            Transport (₦)
          </label>
          <input
            id="staff-field-12"
            className="input"
            type="number"
            value={f.transport}
            onChange={(e) => set('transport', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="staff-field-13" className="label">
            Other allowances (₦)
          </label>
          <input
            id="staff-field-13"
            className="input"
            type="number"
            value={f.other_allowances}
            onChange={(e) => set('other_allowances', e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="staff-field-14" className="label">
          Annual rent paid (₦) — optional, for rent relief
        </label>
        <input
          id="staff-field-14"
          className="input"
          type="number"
          value={f.annual_rent}
          onChange={(e) => set('annual_rent', e.target.value)}
          placeholder="0"
        />
        <div className="text-[10px] text-mut mt-1">
          Reduces taxable income by 20% of this, capped at ₦500,000.
        </div>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2 pt-2 border-t border-line">
        Statutory deductions
      </div>
      <div className="text-[11px] text-mut mb-3">
        Not every staff member is enrolled in every scheme — set what applies to this person.
      </div>
      <div className="flex flex-col gap-2.5 mb-5">
        <label className="flex items-center gap-2.5 bg-surface2 border border-line2 rounded-lg px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={f.pension_enabled}
            onChange={(e) => set('pension_enabled', e.target.checked)}
            className="accent-accent w-4 h-4"
          />
          <div className="flex-1">
            <div className="text-xs font-semibold text-ink">
              Pension (8% employee + 10% employer)
            </div>
            <div className="text-[10px] text-mut">PRA 2014 · on basic + housing + transport</div>
          </div>
        </label>
        <label className="flex items-center gap-2.5 bg-surface2 border border-line2 rounded-lg px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={f.nhf_enabled}
            onChange={(e) => set('nhf_enabled', e.target.checked)}
            className="accent-accent w-4 h-4"
          />
          <div className="flex-1">
            <div className="text-xs font-semibold text-ink">NHF (2.5% of basic)</div>
            <div className="text-[10px] text-mut">National Housing Fund contribution</div>
          </div>
        </label>
        <label className="flex items-center gap-2.5 bg-surface2 border border-line2 rounded-lg px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={f.nsitf_enabled}
            onChange={(e) => set('nsitf_enabled', e.target.checked)}
            className="accent-accent w-4 h-4"
          />
          <div className="flex-1">
            <div className="text-xs font-semibold text-ink">NSITF (1% of gross)</div>
            <div className="text-[10px] text-mut">Employer-paid cost, not deducted from staff</div>
          </div>
        </label>
      </div>

      <div className="font-mono text-[10px] uppercase tracking-widest text-accent mb-2 pt-2 border-t border-line">
        Bank details (for salary CSV)
      </div>
      <div className="mb-3">
        <label htmlFor="staff-field-15" className="label">
          Bank
        </label>
        <select
          id="staff-field-15"
          className="input"
          value={f.bank_code}
          onChange={(e) => set('bank_code', e.target.value)}
        >
          <option value="">Select bank</option>
          {NIGERIAN_BANKS.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label htmlFor="staff-field-16" className="label">
            Account number
          </label>
          <input
            id="staff-field-16"
            className="input"
            value={f.account_number}
            onChange={(e) => set('account_number', e.target.value)}
            maxLength={10}
          />
        </div>
        <div>
          <label htmlFor="staff-field-17" className="label">
            Account name
          </label>
          <input
            id="staff-field-17"
            className="input"
            value={f.account_name}
            onChange={(e) => set('account_name', e.target.value)}
            placeholder="must match bank records"
          />
        </div>
      </div>

      <button
        className="btn-primary w-full justify-center py-2.5"
        onClick={save}
        disabled={busy || !f.first_name || !f.last_name || !f.role || !f.basic}
      >
        {busy ? 'Saving…' : 'Add staff member'}
      </button>
    </Modal>
  )
}
