import { useEffect, useState } from 'react'
import { Modal, Avatar } from './ui'
import Feedback from './ui/Feedback'
import { supabase } from '@/lib/supabase'
import { isDemo } from '@/lib/demo'
import { localDate } from '@/lib/workflows'
import { NIGERIAN_BANKS } from '@/lib/banks'
import { naira, dateShort } from '@/lib/format'
import type { Employee, Department } from '@/types'
export default function EmployeeProfile({
  employee,
  departments,
  editable,
  onClose,
  onSaved,
}: {
  employee: Employee
  departments: Department[]
  editable: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [tab, setTab] = useState('details'),
    [f, setF] = useState(employee),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [documents, setDocuments] = useState<any[]>([])
  const last = [...(employee.salary_structures ?? [])].sort((a, b) =>
    b.effective_from.localeCompare(a.effective_from)
  )[0]
  const [salary, setSalary] = useState({
    basic: last?.basic ?? 0,
    housing: last?.housing ?? 0,
    transport: last?.transport ?? 0,
    other_allowances: last?.other_allowances ?? 0,
    annual_rent: last?.annual_rent ?? 0,
    pension_enabled: last?.pension_enabled ?? true,
    nhf_enabled: last?.nhf_enabled ?? true,
    nsitf_enabled: last?.nsitf_enabled ?? true,
    effective_from: `${new Date().getFullYear() + 1}-01-01`,
  })
  const set = (key: string, value: string) => setF((previous) => ({ ...previous, [key]: value }))
  const loadDocs = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setDocuments(data ?? [])
  }
  useEffect(() => {
    void loadDocs()
  }, [employee.id])
  const perform = async (work: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await work()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const saveDetails = () =>
    perform(async () => {
      if (!f.first_name.trim() || !f.last_name.trim() || !f.role.trim())
        throw Error('Name and role are required.')
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
        throw Error('Enter a valid email.')
      if (f.account_number && !/^\d{10}$/.test(f.account_number))
        throw Error('Account number must contain 10 digits.')
      if (f.status === 'exited' && !f.end_date)
        throw Error('Record the employment end date for an exited employee.')
      if (f.end_date && f.end_date < f.start_date)
        throw Error('End date cannot precede start date.')
      const fields = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'role',
        'department_id',
        'employment_type',
        'staff_category',
        'start_date',
        'end_date',
        'status',
        'bank_code',
        'bank_name',
        'account_number',
        'account_name',
      ] as const
      const payload = Object.fromEntries(fields.map((key) => [key, f[key] || null]))
      const { error } = await supabase.from('employees').update(payload).eq('id', employee.id)
      if (error) throw error
      onSaved()
    })
  const saveSalary = () =>
    perform(async () => {
      const { error } = await supabase.rpc('save_salary', {
        p_employee: employee.id,
        p_salary: salary,
      })
      if (error) throw error
      onSaved()
    })
  const upload = (file?: File) =>
    perform(async () => {
      if (!file) return
      if (isDemo)
        throw Error(
          'Document uploads require a connected Supabase workspace; sample data does not upload files.'
        )
      if (
        file.size > 5 * 1024 * 1024 ||
        !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)
      )
        throw Error('Choose a PDF, PNG, or JPEG smaller than 5 MB.')
      const path = `${employee.org_id}/${employee.id}/${crypto.randomUUID()}.${file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'}`
      const { error: uploadError } = await supabase.storage
        .from('staff-documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      const { error } = await supabase.from('documents').insert({
        org_id: employee.org_id,
        employee_id: employee.id,
        name: file.name,
        type: 'other',
        file_url: path,
      })
      if (error) {
        await supabase.storage.from('staff-documents').remove([path])
        throw error
      }
      setNotice('Document stored privately.')
      await loadDocs()
    })
  const openDoc = (doc: any) =>
    perform(async () => {
      const { data, error } = await supabase.storage
        .from('staff-documents')
        .createSignedUrl(doc.file_url, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    })
  const field = (key: string, label: string, type = 'text') => (
    <div key={key}>
      <label className="label" htmlFor={`profile-${key}`}>
        {label}
      </label>
      <input
        id={`profile-${key}`}
        className="input"
        disabled={!editable || busy}
        type={type}
        value={String((f as any)[key] ?? '')}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  )
  return (
    <Modal title={`${employee.first_name} ${employee.last_name}`} onClose={onClose}>
      <div className="flex gap-3 items-center mb-5">
        <Avatar first={employee.first_name} last={employee.last_name} size={45} />
        <div>
          <strong className="text-sm">{employee.role}</strong>
          <p className="text-xs text-mut mt-1">Employment since {dateShort(employee.start_date)}</p>
        </div>
      </div>
      <div className="flex gap-2 mb-5">
        {['details', 'salary', 'documents'].map((t) => (
          <button
            key={t}
            className={tab === t ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <Feedback message={error} error />
      <Feedback message={notice} />
      {tab === 'details' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {field('first_name', 'First name')}
            {field('last_name', 'Last name')}
            {field('email', 'Email', 'email')}
            {field('phone', 'Phone')}
            {field('role', 'Role')}
            <div>
              <label htmlFor="profile-dept" className="label">
                Department
              </label>
              <select
                id="profile-dept"
                className="input"
                disabled={!editable}
                value={f.department_id ?? ''}
                onChange={(e) => set('department_id', e.target.value)}
              >
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="profile-status" className="label">
                Employment status
              </label>
              <select
                id="profile-status"
                className="input"
                disabled={!editable}
                value={f.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="exited">Exited</option>
              </select>
            </div>
            <div>
              <label htmlFor="profile-type" className="label">
                Employment type
              </label>
              <select
                id="profile-type"
                className="input"
                disabled={!editable}
                value={f.employment_type}
                onChange={(e) => set('employment_type', e.target.value)}
              >
                {['full-time', 'part-time', 'contract', 'nysc'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            {field('start_date', 'Start date', 'date')}
            {field('end_date', 'End date', 'date')}
            <div className="col-span-2">
              <label htmlFor="profile-bank" className="label">
                Bank
              </label>
              <select
                id="profile-bank"
                disabled={!editable}
                className="input"
                value={f.bank_code ?? ''}
                onChange={(e) => {
                  const bank = NIGERIAN_BANKS.find((b) => b.code === e.target.value)
                  setF((prev) => ({
                    ...prev,
                    bank_code: bank?.code ?? null,
                    bank_name: bank?.name ?? null,
                  }))
                }}
              >
                <option value="">Choose bank</option>
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            {field('account_number', 'Account number')}
            {field('account_name', 'Account holder')}
          </div>
          {editable && (
            <button className="btn-primary mt-5" disabled={busy} onClick={saveDetails}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          )}
        </>
      )}
      {tab === 'salary' && (
        <>
          <p className="text-xs text-mut mb-4">
            Salary changes append to history. Existing salary records stay unchanged. Use a future
            effective date after submitted payroll.
          </p>
          <div className="space-y-2 mb-5">
            {[...(employee.salary_structures ?? [])]
              .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
              .map((s) => (
                <div className="bg-surface2 rounded-lg p-3 flex justify-between text-xs" key={s.id}>
                  <span>From {dateShort(s.effective_from)}</span>
                  <strong>
                    {naira(
                      Number(s.basic) +
                        Number(s.housing) +
                        Number(s.transport) +
                        Number(s.other_allowances)
                    )}
                  </strong>
                </div>
              ))}
          </div>
          {editable && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {['basic', 'housing', 'transport', 'other_allowances', 'annual_rent'].map((k) => (
                  <div key={k}>
                    <label className="label" htmlFor={`salary-${k}`}>
                      {k.replaceAll('_', ' ')} (₦)
                    </label>
                    <input
                      id={`salary-${k}`}
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      value={(salary as any)[k]}
                      onChange={(e) =>
                        setSalary((prev) => ({ ...prev, [k]: Number(e.target.value) }))
                      }
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="salary-date" className="label">
                    Effective from
                  </label>
                  <input
                    id="salary-date"
                    className="input"
                    type="date"
                    value={salary.effective_from}
                    onChange={(e) =>
                      setSalary((prev) => ({ ...prev, effective_from: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 my-4">
                {['pension_enabled', 'nhf_enabled', 'nsitf_enabled'].map((k) => (
                  <label key={k} className="text-xs flex gap-2">
                    <input
                      type="checkbox"
                      checked={(salary as any)[k]}
                      onChange={(e) => setSalary((prev) => ({ ...prev, [k]: e.target.checked }))}
                    />
                    {k.replace('_enabled', '').toUpperCase()}
                  </label>
                ))}
              </div>
              <button
                className="btn-primary"
                disabled={busy || !salary.effective_from}
                onClick={saveSalary}
              >
                Add salary change
              </button>
            </>
          )}
        </>
      )}
      {tab === 'documents' && (
        <>
          <p className="text-xs text-mut mb-4">
            Private storage. Download links expire after 60 seconds. PDF, PNG, and JPEG; maximum 5
            MB.
          </p>
          {documents.map((doc) => (
            <div
              className="flex items-center justify-between p-3 border-b border-line text-xs"
              key={doc.id}
            >
              <span>{doc.name}</span>
              <button className="text-accent" onClick={() => openDoc(doc)} disabled={busy}>
                Open securely
              </button>
            </div>
          ))}
          {!documents.length && <p className="text-sm text-mut py-5">No documents uploaded.</p>}
          {editable && (
            <>
              <label htmlFor="document-upload" className="label mt-5">
                Upload document
              </label>
              <input
                id="document-upload"
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                className="input"
                disabled={busy}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </>
          )}
        </>
      )}
    </Modal>
  )
}
