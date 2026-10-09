import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { StatCard, Avatar, Badge, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import Feedback from '@/components/ui/Feedback'
import { canManagePeople, localDate } from '@/lib/workflows'
import type { Employee, AttendanceRecord, Term, LeaveRequest } from '@/types'

export default function Attendance() {
  const { org, session, role } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [away, setAway] = useState<LeaveRequest[]>([])
  const today = localDate()
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const permitted = canManagePeople(role)

  const load = async () => {
    if (!org) return
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    const [e, a, t, l] = await Promise.all([
      supabase.from('employees').select('*').eq('org_id', org.id).neq('status', 'exited'),
      supabase.from('attendance').select('*').eq('org_id', org.id).gte('date', weekAgo),
      supabase.from('terms').select('*').eq('org_id', org.id),
      supabase
        .from('leave_requests')
        .select('*')
        .eq('org_id', org.id)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today),
    ])
    if (e.error || a.error || t.error)
      setError(
        e.error?.message ?? a.error?.message ?? t.error?.message ?? 'Could not load attendance'
      )
    setAway((l.data ?? []) as LeaveRequest[])
    setEmployees((e.data ?? []) as Employee[])
    setRecords((a.data ?? []) as AttendanceRecord[])
    setTerms((t.data ?? []) as Term[])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [org?.id])

  // If no terms have been set up yet, fall back to treating every weekday as
  // a school day (backwards compatible). Once terms exist, a date only
  // counts as a school day if it falls within one of them — this is what
  // stops mid-term breaks from showing up as false absences.
  const isSchoolDay = (dateStr: string) => {
    const day = new Date(dateStr).getDay()
    if (day === 0 || day === 6) return false
    if (terms.length === 0) return true
    return terms.some((t) => dateStr >= t.start_date && dateStr <= t.end_date)
  }

  const todayRecord = (empId: string) =>
    records.find((r) => r.employee_id === empId && r.date === today)

  const mark = async (empId: string, status: 'present' | 'absent' | 'late') => {
    if (!org) return
    setBusy(true)
    setError('')
    const { error } = await supabase.from('attendance').upsert(
      {
        org_id: org.id,
        employee_id: empId,
        date: today,
        status,
        clock_in: status !== 'absent' ? new Date().toISOString() : null,
        marked_by: session?.user.id,
      },
      { onConflict: 'employee_id,date' }
    )
    setBusy(false)
    if (error) return setError(error.message)
    load()
  }

  const week = Array.from({ length: 5 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (4 - i))
    return d.toISOString().slice(0, 10)
  })

  const dot = (empId: string, date: string) => {
    if (!isSchoolDay(date)) return 'bg-surface2'
    const r = records.find((x) => x.employee_id === empId && x.date === date)
    if (!r) return 'bg-surface2'
    if (r.status === 'present') return 'bg-ok/30'
    if (r.status === 'late') return 'bg-warn/30'
    if (r.status === 'leave') return 'bg-accent/20'
    return 'bg-danger/25'
  }

  const todayIsSchoolDay = isSchoolDay(today)
  const presentToday = records.filter(
    (r) => r.date === today && (r.status === 'present' || r.status === 'late')
  ).length
  const lateToday = records.filter((r) => r.date === today && r.status === 'late').length
  const absentToday = records.filter((r) => r.date === today && r.status === 'absent').length

  if (loading)
    return (
      <>
        <PageHeader title="Attendance" />
        <Spinner />
      </>
    )

  return (
    <>
      <PageHeader title="Attendance" />
      <div className="p-6">
        <Feedback error message={error} />
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Present today"
            value={String(presentToday)}
            valueClass="text-ok"
            sub={`of ${employees.filter((e) => e.status === 'active').length} active staff`}
          />
          <StatCard label="Late arrivals" value={String(lateToday)} valueClass="text-warn" />
          <StatCard
            label="Absent"
            value={String(absentToday)}
            valueClass="text-danger"
            sub="No clock-in recorded"
          />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Today — mark attendance</div>
            <span className="font-mono text-[10px] text-mut">last 5 days shown</span>
          </div>
          {employees.length === 0 ? (
            <EmptyState icon="⏱" text="Add staff first to track attendance." />
          ) : !todayIsSchoolDay ? (
            <EmptyState
              icon="🏫"
              text="Today falls outside the current term — no attendance to mark. Set term dates in Settings if this isn't right."
            />
          ) : (
            employees.map((e) => {
              const rec = todayRecord(e.id)
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0"
                >
                  <Avatar first={e.first_name} last={e.last_name} size={28} />
                  <div className="flex-1 text-[13px] font-medium text-ink">
                    {e.first_name} {e.last_name}
                  </div>
                  <div className="hidden sm:flex gap-1">
                    {week.map((d) => (
                      <div key={d} className={`w-3.5 h-3.5 rounded ${dot(e.id, d)}`} title={d} />
                    ))}
                  </div>
                  {away.some((l) => l.employee_id === e.id) ? (
                    <Badge tone="warn">On leave</Badge>
                  ) : rec ? (
                    rec.status === 'present' ? (
                      <Badge tone="ok">
                        In ·{' '}
                        {rec.clock_in
                          ? new Date(rec.clock_in).toLocaleTimeString('en-NG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </Badge>
                    ) : rec.status === 'late' ? (
                      <Badge tone="warn">Late</Badge>
                    ) : (
                      <Badge tone="danger">Absent</Badge>
                    )
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        className="px-2.5 py-1 rounded text-[10px] font-semibold bg-ok/10 text-ok hover:bg-ok/25 transition-colors"
                        disabled={!permitted || busy}
                        onClick={() => mark(e.id, 'present')}
                      >
                        Present
                      </button>
                      <button
                        className="px-2.5 py-1 rounded text-[10px] font-semibold bg-warn/10 text-warn hover:bg-warn/25 transition-colors"
                        disabled={!permitted || busy}
                        onClick={() => mark(e.id, 'late')}
                      >
                        Late
                      </button>
                      <button
                        className="px-2.5 py-1 rounded text-[10px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                        disabled={!permitted || busy}
                        onClick={() => mark(e.id, 'absent')}
                      >
                        Absent
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
