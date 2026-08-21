import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { StatCard, Avatar, Badge, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import type { Employee, AttendanceRecord } from '@/types'

export default function Attendance() {
  const { org, session } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().slice(0, 10)

  const load = async () => {
    if (!org) return
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    const [e, a] = await Promise.all([
      supabase.from('employees').select('*').eq('org_id', org.id).neq('status', 'exited'),
      supabase.from('attendance').select('*').eq('org_id', org.id).gte('date', weekAgo),
    ])
    setEmployees((e.data ?? []) as Employee[])
    setRecords((a.data ?? []) as AttendanceRecord[])
    setLoading(false)
  }
  useEffect(() => { load() }, [org?.id])

  const todayRecord = (empId: string) => records.find(r => r.employee_id === empId && r.date === today)

  const mark = async (empId: string, status: 'present' | 'absent' | 'late') => {
    if (!org) return
    await supabase.from('attendance').upsert({
      org_id: org.id, employee_id: empId, date: today, status,
      clock_in: status !== 'absent' ? new Date().toISOString() : null,
      marked_by: session?.user.id,
    }, { onConflict: 'employee_id,date' })
    load()
  }

  const week = Array.from({ length: 5 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (4 - i))
    return d.toISOString().slice(0, 10)
  })

  const dot = (empId: string, date: string) => {
    const r = records.find(x => x.employee_id === empId && x.date === date)
    const day = new Date(date).getDay()
    if (day === 0 || day === 6) return 'bg-surface2'
    if (!r) return 'bg-surface2'
    if (r.status === 'present') return 'bg-ok/30'
    if (r.status === 'late') return 'bg-warn/30'
    if (r.status === 'leave') return 'bg-accent/20'
    return 'bg-danger/25'
  }

  const presentToday = records.filter(r => r.date === today && (r.status === 'present' || r.status === 'late')).length
  const lateToday = records.filter(r => r.date === today && r.status === 'late').length
  const absentToday = records.filter(r => r.date === today && r.status === 'absent').length

  if (loading) return <><PageHeader title="Attendance" /><Spinner /></>

  return (
    <>
      <PageHeader title="Attendance" />
      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Present today" value={String(presentToday)} valueClass="text-ok" sub={`of ${employees.filter(e => e.status === 'active').length} active staff`} />
          <StatCard label="Late arrivals" value={String(lateToday)} valueClass="text-warn" />
          <StatCard label="Absent" value={String(absentToday)} valueClass="text-danger" sub="No clock-in recorded" />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Today — mark attendance</div>
            <span className="font-mono text-[10px] text-mut">last 5 days shown</span>
          </div>
          {employees.length === 0 ? (
            <EmptyState icon="⏱" text="Add staff first to track attendance." />
          ) : employees.map(e => {
            const rec = todayRecord(e.id)
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                <Avatar first={e.first_name} last={e.last_name} size={28} />
                <div className="flex-1 text-[13px] font-medium text-white">{e.first_name} {e.last_name}</div>
                <div className="hidden sm:flex gap-1">
                  {week.map(d => <div key={d} className={`w-3.5 h-3.5 rounded ${dot(e.id, d)}`} title={d} />)}
                </div>
                {e.status === 'on-leave' ? (
                  <Badge tone="warn">On leave</Badge>
                ) : rec ? (
                  rec.status === 'present' ? <Badge tone="ok">In · {rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : ''}</Badge>
                  : rec.status === 'late' ? <Badge tone="warn">Late</Badge>
                  : <Badge tone="danger">Absent</Badge>
                ) : (
                  <div className="flex gap-1.5">
                    <button className="px-2.5 py-1 rounded text-[10px] font-semibold bg-ok/10 text-ok hover:bg-ok/25 transition-colors" onClick={() => mark(e.id, 'present')}>Present</button>
                    <button className="px-2.5 py-1 rounded text-[10px] font-semibold bg-warn/10 text-warn hover:bg-warn/25 transition-colors" onClick={() => mark(e.id, 'late')}>Late</button>
                    <button className="px-2.5 py-1 rounded text-[10px] font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors" onClick={() => mark(e.id, 'absent')}>Absent</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
