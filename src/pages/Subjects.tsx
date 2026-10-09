import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Avatar, Badge, Modal, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { CLASS_LEVELS } from '@/lib/school'
import Feedback from '@/components/ui/Feedback'
import { canManagePeople } from '@/lib/workflows'
import type { Employee, Subject } from '@/types'

export default function Subjects() {
  const { org, role } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const editable = canManagePeople(role)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Subject | null>(null)

  const load = async () => {
    if (!org) return
    const [s, e] = await Promise.all([
      supabase
        .from('subjects')
        .select('*, employee_subjects(employee_id, employees(*))')
        .eq('org_id', org.id)
        .order('class_level')
        .order('name'),
      supabase.from('employees').select('*').eq('org_id', org.id).eq('status', 'active'),
    ])
    if (s.error || e.error)
      setError(s.error?.message ?? e.error?.message ?? 'Could not load subjects')
    setSubjects((s.data ?? []) as Subject[])
    setEmployees((e.data ?? []) as Employee[])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [org?.id])

  const unstaffed = subjects.filter((s) => (s.employee_subjects?.length ?? 0) === 0)
  const singlePoint = subjects.filter((s) => (s.employee_subjects?.length ?? 0) === 1)

  if (loading)
    return (
      <>
        <PageHeader title="Subjects" />
        <Spinner />
      </>
    )

  return (
    <>
      <PageHeader
        title="Subjects"
        actions={
          <button className="btn-primary" disabled={!editable} onClick={() => setShowAdd(true)}>
            + Add subject
          </button>
        }
      />
      <div className="p-6">
        <Feedback message={error} error />
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="panel p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-mut mb-1">
              Total subjects
            </div>
            <div className="font-display text-2xl font-extrabold text-ink">{subjects.length}</div>
          </div>
          <div className="panel p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-mut mb-1">
              Unstaffed
            </div>
            <div
              className={`font-display text-2xl font-extrabold ${unstaffed.length ? 'text-danger' : 'text-ink'}`}
            >
              {unstaffed.length}
            </div>
            {unstaffed.length > 0 && (
              <div className="text-[11px] text-mut mt-0.5">No teacher assigned</div>
            )}
          </div>
          <div className="panel p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-mut mb-1">
              Single point of failure
            </div>
            <div
              className={`font-display text-2xl font-extrabold ${singlePoint.length ? 'text-warn' : 'text-ink'}`}
            >
              {singlePoint.length}
            </div>
            {singlePoint.length > 0 && (
              <div className="text-[11px] text-mut mt-0.5">Only one teacher covers this</div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">All subjects</div>
          </div>
          {subjects.length === 0 ? (
            <EmptyState
              icon="📚"
              text="No subjects added yet. Add subjects and assign teachers to see coverage at a glance."
              action={
                <button
                  className="btn-primary"
                  disabled={!editable}
                  onClick={() => setShowAdd(true)}
                >
                  + Add subject
                </button>
              }
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-surface2">
                  {['Subject', 'Class', 'Teachers assigned', 'Coverage'].map((h) => (
                    <th
                      key={h}
                      className="text-left font-mono text-[9px] uppercase tracking-widest text-mut px-4 py-2.5 border-b border-line"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const teachers = (s.employee_subjects ?? [])
                    .map((es) => es.employees)
                    .filter(Boolean) as Employee[]
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-surface2 transition-colors cursor-pointer"
                      onClick={() => {
                        if (editable) setEditing(s)
                      }}
                    >
                      <td className="px-4 py-3 border-b border-line text-[13px] font-semibold text-ink">
                        {s.name}
                      </td>
                      <td className="px-4 py-3 border-b border-line text-[13px] text-mut2">
                        {s.class_level ?? '—'}
                      </td>
                      <td className="px-4 py-3 border-b border-line">
                        {teachers.length === 0 ? (
                          <span className="text-[12px] text-mut">Nobody assigned</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {teachers.slice(0, 4).map((t) => (
                              <Avatar
                                key={t.id}
                                first={t.first_name}
                                last={t.last_name}
                                size={24}
                              />
                            ))}
                            {teachers.length > 4 && (
                              <span className="text-[11px] text-mut ml-1">
                                +{teachers.length - 4}
                              </span>
                            )}
                            <span className="text-[12px] text-mut2 ml-1.5">
                              {teachers.map((t) => t.first_name).join(', ')}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b border-line">
                        {teachers.length === 0 && <Badge tone="danger">Unstaffed</Badge>}
                        {teachers.length === 1 && <Badge tone="warn">Single point</Badge>}
                        {teachers.length >= 2 && <Badge tone="ok">Covered</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && (
        <SubjectModal
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}
      {editing && (
        <SubjectModal
          subject={editing}
          employees={employees}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </>
  )
}

function SubjectModal({
  subject,
  employees,
  onClose,
  onSaved,
}: {
  subject?: Subject
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
}) {
  const { org } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [name, setName] = useState(subject?.name ?? '')
  const [classLevel, setClassLevel] = useState(subject?.class_level ?? '')
  const [selected, setSelected] = useState<Set<string>>(
    new Set((subject?.employee_subjects ?? []).map((es) => es.employee_id))
  )

  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const save = async () => {
    if (!org || !name.trim()) return
    setBusy(true)

    setError('')
    const { error } = await supabase.rpc('save_subject', {
      p_org: org.id,
      p_subject: subject?.id ?? null,
      p_name: name,
      p_class: classLevel,
      p_teachers: Array.from(selected),
    })
    if (error) {
      setBusy(false)
      return setError(error.message)
    }

    setBusy(false)
    onSaved()
  }

  const remove = async () => {
    if (!subject) return
    setBusy(true)
    const { error } = await supabase.from('subjects').delete().eq('id', subject.id)
    if (error) {
      setBusy(false)
      return setError(error.message)
    }
    setBusy(false)
    onSaved()
  }

  return (
    <Modal title={subject ? 'Edit subject' : 'Add subject'} onClose={onClose}>
      <Feedback message={error} error />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label htmlFor="subjects-field-1" className="label">
            Subject name
          </label>
          <input
            id="subjects-field-1"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Further Mathematics"
          />
        </div>
        <div>
          <label htmlFor="subjects-field-2" className="label">
            Class level (optional)
          </label>
          <select
            id="subjects-field-2"
            className="input"
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
          >
            <option value="">Not class-specific</option>
            {CLASS_LEVELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="label">Assign teachers</label>
      <div className="flex flex-col gap-1.5 mb-5 max-h-52 overflow-y-auto">
        {employees.length === 0 ? (
          <div className="text-xs text-mut py-2">
            Add staff first, then assign them to subjects.
          </div>
        ) : (
          employees.map((e) => (
            <label
              key={e.id}
              className="flex items-center gap-2.5 bg-surface2 border border-line2 rounded-lg px-3 py-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(e.id)}
                onChange={() => toggle(e.id)}
                className="accent-accent w-4 h-4"
              />
              <Avatar first={e.first_name} last={e.last_name} size={22} />
              <span className="text-xs font-medium text-ink">
                {e.first_name} {e.last_name}
              </span>
              <span className="text-[10px] text-mut ml-auto">{e.role}</span>
            </label>
          ))
        )}
      </div>

      {subject && (
        <div className="mb-4">
          <label className="label" htmlFor="delete-subject">
            To delete this subject, type {subject.name}
          </label>
          <input
            id="delete-subject"
            className="input"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
        </div>
      )}
      <div className="flex gap-3">
        {subject && (
          <button
            className="btn-ghost hover:!border-danger hover:!text-danger"
            onClick={remove}
            disabled={busy || deleteConfirm !== subject.name}
          >
            Delete
          </button>
        )}
        <button
          className="btn-primary flex-1 justify-center py-2.5"
          onClick={save}
          disabled={busy || !name.trim()}
        >
          {busy ? 'Saving…' : subject ? 'Save changes' : 'Add subject'}
        </button>
      </div>
    </Modal>
  )
}
