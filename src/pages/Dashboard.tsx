import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { naira, MONTHS, dateShort } from '@/lib/format'
import { Avatar, Badge, Spinner } from '@/components/ui'
import Icon from '@/components/ui/Icon'
import { localDate } from '@/lib/workflows'
import { isDemo } from '@/lib/demo'
import type { Employee, LeaveRequest, PayrollRun, Subject, AttendanceRecord } from '@/types'

export default function Dashboard() {
  const { org, session } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const now = new Date()
  const today = localDate(now)
  useEffect(() => {
    if (!org) return
    Promise.all([
      supabase
        .from('employees')
        .select('*, departments(name), salary_structures(*)')
        .eq('org_id', org.id)
        .neq('status', 'exited'),
      supabase
        .from('leave_requests')
        .select('*, employees(*)')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payroll_runs')
        .select('*')
        .eq('org_id', org.id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(6),
      supabase.from('subjects').select('*, employee_subjects(employee_id)').eq('org_id', org.id),
      supabase.from('attendance').select('*').eq('org_id', org.id).eq('date', today),
    ])
      .then(([e, l, r, s, a]) => {
        setEmployees((e.data ?? []) as Employee[])
        setRequests((l.data ?? []) as LeaveRequest[])
        setRuns((r.data ?? []) as PayrollRun[])
        setSubjects((s.data ?? []) as Subject[])
        setAttendance((a.data ?? []) as AttendanceRecord[])
        setError(!!(e.error || l.error || r.error || s.error || a.error))
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [org?.id])
  const latest = runs[0]
  const nextSalary = new Date(
    now.getFullYear(),
    now.getMonth() + (now.getDate() > (org?.salary_day ?? 25) ? 1 : 0),
    org?.salary_day ?? 25
  )
  const days = Math.max(0, Math.ceil((nextSalary.getTime() - now.getTime()) / 86400000))
  const pending = requests.filter((r) => r.status === 'pending')
  const onLeave = requests.filter(
    (r) => r.status === 'approved' && r.start_date <= today && r.end_date >= today
  )
  const unstaffed = subjects.filter((s) => !s.employee_subjects?.length)
  const atRisk = subjects.filter((s) => s.employee_subjects?.length === 1)
  const present = attendance.filter((a) => ['present', 'late'].includes(a.status)).length
  const teaching = employees.filter((e) => e.staff_category === 'teaching')
  const salary = (e: Employee) => {
    const s = [...(e.salary_structures ?? [])]
      .filter((s) => s.effective_from <= today)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
    return s
      ? Number(s.basic) + Number(s.housing) + Number(s.transport) + Number(s.other_allowances)
      : 0
  }
  const teachingCost = teaching.reduce((n, e) => n + salary(e), 0)
  const supportCost = employees
    .filter((e) => e.staff_category !== 'teaching')
    .reduce((n, e) => n + salary(e), 0)
  const costTotal = teachingCost + supportCost
  const teachingRatio = costTotal ? teachingCost / costTotal : 0
  const trend = [...runs].reverse()
  const maxGross = Math.max(...runs.map((r) => r.gross_total), 1) * 1.15
  const previous = runs[1]
  const change = previous?.gross_total
    ? (latest.gross_total / previous.gross_total - 1) * 100
    : null
  const userName = isDemo
    ? 'Tolu'
    : (session?.user.user_metadata?.name?.split(' ')[0] ??
      session?.user.email?.split('@')[0] ??
      'there')
  const compact = (n: number) => (n >= 1000000 ? `₦${(n / 1000000).toFixed(2)}m` : naira(n))
  if (loading) return <Spinner />
  return (
    <div className="overview">
      <div className="overview-heading">
        <div>
          <div className="eyebrow">A GOOD DAY TO MAKE THINGS HAPPEN</div>
          <h1>
            Hello, {userName}
            <span />
          </h1>
          <p>Here’s how things are looking at {org?.name} today.</p>
        </div>
        <div className="date-pill">
          <Icon name="leave" size={15} />
          {now.toLocaleDateString('en-NG', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>
      {error && (
        <div role="alert" className="panel p-4 mb-4 text-danger text-sm">
          Some data could not be loaded. Check your connection and refresh the page.
        </div>
      )}
      <section className="payday-banner">
        <div className="banner-left">
          <div className="banner-icon">
            <Icon name="payroll" size={24} />
          </div>
          <div>
            <div className="banner-kicker">PAYDAY, WITHOUT THE PRESSURE</div>
            <h2>
              {days === 0
                ? 'Today is payday. Let’s make it a good one.'
                : `Your next payday is ${days} day${days === 1 ? '' : 's'} away.`}
            </h2>
            <p>
              {nextSalary.toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })} ·{' '}
              {employees.length} people counting on a smooth payday.
            </p>
          </div>
        </div>
        <div className="banner-actions">
          <span>Let’s get everything ready</span>
          <Link to="/payroll" className="btn-primary">
            Open payroll
            <Icon name="arrow" size={15} />
          </Link>
        </div>
      </section>
      <div className="overview-stats">
        <Metric
          label="Total people"
          value={String(employees.length)}
          icon="staff"
          highlight={`${employees.filter((e) => e.status === 'active').length} active`}
          detail="across your school"
        />
        <Metric
          label="Monthly payroll"
          value={latest ? compact(latest.gross_total) : '—'}
          icon="payroll"
          highlight={
            change === null ? 'No previous run' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
          }
          detail={previous ? 'vs. previous run' : 'Run your first payroll'}
        />
        <Metric
          label="Present today"
          value={String(present)}
          icon="attendance"
          highlight={
            employees.length
              ? `${Math.round((present / employees.length) * 100)}% of people`
              : 'No staff yet'
          }
          detail="attendance recorded"
        />
        <Metric
          label="On leave today"
          value={String(onLeave.length)}
          icon="leave"
          highlight={`${pending.length} pending`}
          detail="requests to review"
          amber
        />
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="card-heading">
            <div>
              <h2>Payroll at a glance</h2>
              <p>Monthly gross payroll · Last {runs.length || 'six'} runs</p>
            </div>
            <Link to="/payroll">
              View payroll
              <Icon name="arrow" size={13} />
            </Link>
          </div>
          <div className="chart-legend">
            <span>
              <i />
              Gross payroll
            </span>
            <span>
              <i />
              Net payout
            </span>
          </div>
          {trend.length ? (
            <div
              className="payroll-chart"
              role="img"
              aria-label={`Payroll history. ${trend.map((r) => `${MONTHS[r.period_month - 1]} ${r.period_year}: gross ${naira(r.gross_total)}, net ${naira(r.net_total)}`).join('. ')}`}
            >
              <div className="chart-axis">
                {[1, 0.75, 0.5, 0.25, 0].map((n) => (
                  <span key={n}>
                    {maxGross * n >= 1000000
                      ? `${((maxGross * n) / 1000000).toFixed(1)}m`
                      : `${Math.round((maxGross * n) / 1000)}k`}
                  </span>
                ))}
              </div>
              <div className="chart-bars">
                {trend.map((r) => (
                  <div
                    key={r.id}
                    className="chart-group"
                    title={`${MONTHS[r.period_month - 1]}: gross ${naira(r.gross_total)}, net ${naira(r.net_total)}`}
                  >
                    <div style={{ height: `${(r.gross_total / maxGross) * 100}%` }} />
                    <div style={{ height: `${(r.net_total / maxGross) * 100}%` }} />
                    <span>{MONTHS[r.period_month - 1].slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-xs text-mut">
              Your payroll history will appear here after your first run.
            </div>
          )}
          <div className="chart-footer">
            <span>Latest net payout</span>
            <strong>{latest ? naira(latest.net_total) : 'No payroll yet'}</strong>
          </div>
        </section>
        <section className="panel">
          <div className="card-heading">
            <div>
              <h2>A little attention needed</h2>
              <p>Small actions. A smoother school day.</p>
            </div>
            <span className="action-count">
              {pending.length + unstaffed.length + atRisk.length}
            </span>
          </div>
          <div className="attention-items">
            <Link to="/leave" className="attention-item">
              <span className="attention-icon">
                <Icon name="leave" size={18} />
              </span>
              <div>
                <strong>
                  {pending.length} leave request{pending.length === 1 ? '' : 's'} to review
                </strong>
                <p>
                  {pending.length
                    ? 'Help your people plan their time away.'
                    : 'You’re all caught up on requests.'}
                </p>
              </div>
              <Icon name="chevron" size={14} />
            </Link>
            <Link to="/subjects" className="attention-item">
              <span className="attention-icon green">
                <Icon name="subjects" size={18} />
              </span>
              <div>
                <strong>
                  {unstaffed.length} subject{unstaffed.length === 1 ? '' : 's'} need a teacher
                </strong>
                <p>
                  {unstaffed.length
                    ? unstaffed.map((s) => s.name).join(', ')
                    : 'Every subject has someone assigned.'}
                </p>
              </div>
              <Icon name="chevron" size={14} />
            </Link>
            <Link to="/subjects" className="attention-item">
              <span className="attention-icon blue">
                <Icon name="compliance" size={18} />
              </span>
              <div>
                <strong>
                  {atRisk.length} coverage gap{atRisk.length === 1 ? '' : 's'} to plan for
                </strong>
                <p>
                  {atRisk.length
                    ? 'One teacher assigned. Consider a backup.'
                    : 'Your teaching coverage is looking good.'}
                </p>
              </div>
              <Icon name="chevron" size={14} />
            </Link>
          </div>
          <div className="attention-footer">A few minutes here can make a big difference.</div>
        </section>
      </div>
      <div className="overview-bottom">
        <section className="panel">
          <div className="card-heading">
            <div>
              <h2>Your people</h2>
              <p>The team making it all happen.</p>
            </div>
            <Link to="/staff">
              View everyone
              <Icon name="arrow" size={13} />
            </Link>
          </div>
          <div className="people-table-head">
            <span>TEAM MEMBER</span>
            <span>SECTION</span>
            <span>STATUS</span>
          </div>
          {employees.slice(0, 4).map((e) => (
            <div className="people-row" key={e.id}>
              <Avatar first={e.first_name} last={e.last_name} size={34} />
              <div className="person-info">
                <strong>
                  {e.first_name} {e.last_name}
                </strong>
                <small>{e.role}</small>
              </div>
              <span className="person-dept">
                {e.departments?.name?.replace(' school', '') ?? 'Unassigned'}
              </span>
              <Badge tone={!onLeave.some((l) => l.employee_id === e.id) ? 'ok' : 'warn'}>
                {!onLeave.some((l) => l.employee_id === e.id) ? 'Active' : 'On leave'}
              </Badge>
            </div>
          ))}
          {!employees.length && (
            <div className="p-6 text-xs text-mut">
              Your team starts here.{' '}
              <Link to="/staff" className="text-accent">
                Add your first person →
              </Link>
            </div>
          )}
          <div className="chart-footer">
            <span>Teaching · {teaching.length} people</span>
            <strong>
              {costTotal
                ? `${Math.round(teachingRatio * 100)}% of salary costs`
                : 'No salaries added'}
            </strong>
          </div>
        </section>
        <div className="right-stack">
          <section className="panel">
            <div className="card-heading">
              <div>
                <h2>Make your next move</h2>
                <p>Your everyday essentials, one click away.</p>
              </div>
            </div>
            <div className="quick-links">
              <Link to="/staff?add=1">
                <Icon name="plus" size={21} />
                Add a person
              </Link>
              <Link to="/attendance">
                <Icon name="attendance" size={21} />
                Attendance
              </Link>
              <Link to="/compliance">
                <Icon name="compliance" size={21} />
                Contributions
              </Link>
            </div>
          </section>
          <section className="panel">
            <div className="card-heading">
              <div>
                <h2>Away from the classroom</h2>
                <p>On leave today</p>
              </div>
              <Link to="/leave">
                <Icon name="arrow" size={14} />
              </Link>
            </div>
            <div className="leave-summary">
              {onLeave.map((l) => (
                <div key={l.id} className="leave-person">
                  <Avatar
                    first={l.employees?.first_name ?? '?'}
                    last={l.employees?.last_name ?? '?'}
                    size={28}
                  />
                  <div>
                    <strong>
                      {l.employees?.first_name} {l.employees?.last_name}
                    </strong>
                    <p>Back after {dateShort(l.end_date)}</p>
                  </div>
                  <span>{l.leave_type}</span>
                </div>
              ))}
              {!onLeave.length && (
                <p className="text-xs text-mut pt-5">Everyone’s in. Here’s to a productive day.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
function Metric({
  label,
  value,
  icon,
  highlight,
  detail,
  amber = false,
}: {
  label: string
  value: string
  icon: string
  highlight: string
  detail: string
  amber?: boolean
}) {
  return (
    <section className="panel overview-stat">
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon">
          <Icon name={icon} size={16} />
        </div>
      </div>
      <strong>{value}</strong>
      <div className="stat-bottom">
        <span className={`stat-highlight ${amber ? 'amber' : ''}`}>
          {!amber && <Icon name="trend" size={10} />} {highlight}
        </span>
        <span>{detail}</span>
      </div>
    </section>
  )
}
