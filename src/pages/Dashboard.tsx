import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { naira, MONTHS } from '@/lib/format'
import { StatCard, Avatar, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import type { Employee, LeaveRequest, PayrollRun } from '@/types'

export default function Dashboard() {
  const { org } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [onLeave, setOnLeave] = useState<LeaveRequest[]>([])
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      supabase.from('employees').select('*').eq('org_id', org.id).neq('status', 'exited'),
      supabase.from('leave_requests').select('*, employees(*)').eq('org_id', org.id)
        .eq('status', 'approved').lte('start_date', today).gte('end_date', today),
      supabase.from('payroll_runs').select('*').eq('org_id', org.id)
        .order('period_year', { ascending: false }).order('period_month', { ascending: false }).limit(6),
    ]).then(([e, l, r]) => {
      setEmployees((e.data ?? []) as Employee[])
      setOnLeave((l.data ?? []) as LeaveRequest[])
      setRuns((r.data ?? []) as PayrollRun[])
      setLoading(false)
    })
  }, [org?.id])

  const latestRun = runs[0]
  const now = new Date()
  const salaryDay = org?.salary_day ?? 25
  const nextSalary = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > salaryDay ? 1 : 0), salaryDay)
  const daysToSalary = Math.ceil((nextSalary.getTime() - now.getTime()) / 86400000)

  if (loading) return <><PageHeader title="Dashboard" /><Spinner /></>

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={<Link to="/payroll" className="btn-primary">Run payroll</Link>}
      />
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Monthly payroll"
            value={latestRun ? naira(latestRun.gross_total) : '—'}
            sub={latestRun ? `${MONTHS[latestRun.period_month - 1]} ${latestRun.period_year}` : 'No payroll run yet'}
          />
          <StatCard label="Total staff" value={String(employees.length)} sub={`${employees.filter(e => e.status === 'active').length} active`} />
          <StatCard label="On leave today" value={String(onLeave.length)} sub={onLeave.length ? onLeave.map(l => l.leave_type).join(' · ') : 'Everyone is in'} />
          <StatCard
            label="Tax liability"
            value={latestRun ? naira(latestRun.total_paye + latestRun.total_pension_employee + latestRun.total_pension_employer + latestRun.total_nhf + latestRun.total_nsitf) : '—'}
            sub={latestRun ? 'Latest processed run' : 'Run payroll to see'}
          />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Payroll history</div>
              <Link to="/payroll" className="text-[11px] text-accent font-medium">Open payroll →</Link>
            </div>
            {runs.length === 0 ? (
              <EmptyState icon="₦" text="No payroll runs yet. Add staff, then run your first payroll."
                action={<Link to="/staff" className="btn-primary">Add staff</Link>} />
            ) : (
              runs.map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
                  <div>
                    <div className="text-[13px] font-semibold text-white">{MONTHS[r.period_month - 1]} {r.period_year}</div>
                    <div className="text-[11px] text-mut capitalize">{r.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-white text-sm">{naira(r.net_total)}</div>
                    <div className="text-[10px] text-mut">net payout</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="panel">
              <div className="panel-head"><div className="panel-title">On leave this week</div></div>
              {onLeave.length === 0 ? (
                <div className="px-4 py-5 text-xs text-mut">Nobody is on leave right now.</div>
              ) : (
                <div className="p-4 flex flex-wrap gap-2">
                  {onLeave.map(l => (
                    <div key={l.id} className="flex items-center gap-2 bg-surface2 border border-line2 rounded-full pl-1 pr-3 py-1">
                      <Avatar first={l.employees?.first_name ?? '?'} last={l.employees?.last_name ?? '?'} size={20} />
                      <span className="text-[11px] text-mut2">{l.employees?.first_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-head"><div className="panel-title">Next salary date</div></div>
              <div className="px-4 py-4 flex items-center justify-between">
                <div>
                  <div className="font-display text-xl font-extrabold text-white">
                    {nextSalary.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-[11px] text-mut mt-0.5">{daysToSalary} day{daysToSalary === 1 ? '' : 's'} from today</div>
                </div>
                {latestRun && (
                  <div className="text-right">
                    <div className="text-[10px] text-mut">Est. total</div>
                    <div className="font-display font-bold text-accent">{naira(latestRun.net_total)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
