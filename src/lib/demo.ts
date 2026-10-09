import { calculatePayslip } from './payroll'
import { workingDays } from './workflows'

// The sandbox is opt-in and development-only. It never calls the live backend.
export const isDemo =
  import.meta.env.DEV &&
  (new URLSearchParams(location.search).get('demo') === '1' ||
    sessionStorage.getItem('staffstack-demo') === '1')
if (isDemo) sessionStorage.setItem('staffstack-demo', '1')
export const demoOrg = {
  id: 'demo-org',
  name: 'Greenfield Academy',
  slug: 'greenfield',
  industry: 'Education',
  state: 'Lagos',
  salary_day: 25,
  owner_id: 'demo-user',
}
export const demoSession = {
  user: {
    id: 'demo-user',
    email: 'admin@greenfield.example',
    user_metadata: { name: 'Tolu' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  },
  access_token: 'local-demo',
  refresh_token: '',
  expires_in: 3600,
  token_type: 'bearer',
}
type Row = Record<string, any>
const today = new Date().toISOString().slice(0, 10)
const month = new Date().getMonth() + 1
const year = new Date().getFullYear()
const dateOffset = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const departments = ['Secondary school', 'Primary school', 'Administration', 'Operations'].map(
  (name, i) => ({ id: `dept-${i}`, org_id: demoOrg.id, name })
)
const people = [
  ['Adesola', 'Okafor', 'Mathematics teacher', 0, 310000],
  ['Chinedu', 'Eze', 'Science teacher', 0, 285000],
  ['Fatima', 'Bello', 'Head of primary', 1, 420000],
  ['Oluwaseun', 'Adeyemi', 'English teacher', 0, 295000],
  ['Amina', 'Yusuf', 'School administrator', 2, 340000],
  ['Emeka', 'Nwosu', 'ICT instructor', 0, 325000],
  ['Blessing', 'Obi', 'Class teacher', 1, 250000],
  ['David', 'Akinwale', 'Facilities manager', 3, 280000],
  ['Ngozi', 'Uche', 'Class teacher', 1, 265000],
  ['Ibrahim', 'Musa', 'Accounts officer', 2, 320000],
  ['Temitope', 'Balogun', 'Biology teacher', 0, 300000],
  ['Grace', 'Williams', 'School nurse', 3, 270000],
]
const employees: Row[] = people.map(([first, last, role, dept], i) => ({
  id: `emp-${i}`,
  org_id: demoOrg.id,
  first_name: first,
  last_name: last,
  role,
  department_id: `dept-${dept}`,
  staff_category: Number(dept) < 2 ? 'teaching' : 'non_teaching',
  employment_type: 'full-time',
  start_date: `2024-09-${String(i + 1).padStart(2, '0')}`,
  status: 'active',
  email: `${String(first).toLowerCase()}@greenfield.example`,
  phone: null,
  bank_name: 'GTBank',
  bank_code: '058',
  account_number: `01234567${String(i).padStart(2, '0')}`,
  account_name: `${first} ${last}`,
  created_at: `2024-09-${String(i + 1).padStart(2, '0')}`,
}))
const salaries: Row[] = people.map((p, i) => ({
  id: `salary-${i}`,
  employee_id: `emp-${i}`,
  basic: Number(p[4]) * 0.6,
  housing: Number(p[4]) * 0.25,
  transport: Number(p[4]) * 0.15,
  other_allowances: 0,
  annual_rent: 900000,
  pension_enabled: true,
  nhf_enabled: true,
  nsitf_enabled: true,
  effective_from: '2026-01-01',
}))
const computed = salaries.map((s) => calculatePayslip(s as Parameters<typeof calculatePayslip>[0]))
const sum = (key: string) => computed.reduce((total, c) => total + (c as any)[key], 0)
const runs: Row[] = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(year, month - 1 - i, 1)
  const factor = 1 - i * 0.018
  return {
    id: `run-${i}`,
    org_id: demoOrg.id,
    period_month: d.getMonth() + 1,
    period_year: d.getFullYear(),
    status: i === 0 ? 'draft' : 'paid',
    prepared_by: 'demo-user',
    calculation_version: 'NG-2026-v2',
    gross_total: sum('gross') * factor,
    net_total: sum('net_pay') * factor,
    total_paye: sum('paye') * factor,
    total_pension_employee: sum('pension_employee') * factor,
    total_pension_employer: sum('pension_employer') * factor,
    total_nhf: sum('nhf') * factor,
    total_nsitf: sum('nsitf') * factor,
  }
})
const initial: Record<string, Row[]> = {
  org_members: [{ id: 'demo-member', org_id: demoOrg.id, user_id: 'demo-user', role: 'owner' }],
  audit_events: [],
  invitations: [],
  documents: [],
  organisations: [demoOrg],
  departments,
  employees,
  salary_structures: salaries,
  payroll_runs: runs,
  payslips: runs.flatMap((r) =>
    computed.map((c, i) => ({
      ...salaries[i],
      ...Object.fromEntries(
        Object.entries(c).map(([key, value]) => [
          key,
          typeof value === 'number' ? value * (r.gross_total / sum('gross')) : value,
        ])
      ),
      id: `${r.id}-slip-${i}`,
      payroll_run_id: r.id,
      employee_id: `emp-${i}`,
      employee_snapshot: employees[i],
      token: `${r.id}-token-${i}`,
    }))
  ),
  leave_requests: [
    {
      id: 'leave-0',
      employee_id: 'emp-0',
      leave_type: 'annual',
      start_date: dateOffset(3),
      end_date: dateOffset(7),
      days: 5,
      reason: 'Family time',
      status: 'pending',
    },
    {
      id: 'leave-1',
      employee_id: 'emp-5',
      leave_type: 'study',
      start_date: dateOffset(5),
      end_date: dateOffset(6),
      days: 2,
      reason: 'Professional certification',
      status: 'pending',
    },
    {
      id: 'leave-2',
      employee_id: 'emp-3',
      leave_type: 'compassionate',
      start_date: dateOffset(2),
      end_date: dateOffset(4),
      days: 3,
      reason: 'Family commitment',
      status: 'pending',
    },
    {
      id: 'leave-3',
      employee_id: 'emp-2',
      leave_type: 'annual',
      start_date: dateOffset(-2),
      end_date: dateOffset(4),
      days: 5,
      status: 'approved',
    },
    {
      id: 'leave-4',
      employee_id: 'emp-8',
      leave_type: 'sick',
      start_date: dateOffset(-1),
      end_date: dateOffset(2),
      days: 3,
      status: 'approved',
    },
  ].map((r) => ({ ...r, org_id: demoOrg.id, created_at: today })),
  subjects: [
    'Mathematics',
    'English language',
    'Biology',
    'Computer science',
    'Basic science',
    'Fine arts',
  ].map((name, i) => ({
    id: `subject-${i}`,
    org_id: demoOrg.id,
    name,
    class_level: i < 4 ? 'SS2' : 'JSS1',
  })),
  employee_subjects: [
    [0, 0],
    [0, 1],
    [1, 3],
    [1, 6],
    [2, 10],
    [2, 1],
    [3, 5],
    [4, 6],
    [4, 8],
  ].map(([s, e], i) => ({ id: `es-${i}`, subject_id: `subject-${s}`, employee_id: `emp-${e}` })),
  attendance: employees
    .filter((e) => e.status === 'active')
    .slice(0, 8)
    .map((e, i) => ({
      id: `att-${i}`,
      org_id: demoOrg.id,
      employee_id: e.id,
      date: today,
      status: i === 6 ? 'late' : 'present',
      clock_in: `${today}T${i === 6 ? '09:15' : '07:45'}:00`,
      clock_out: null,
    })),
  leave_balances: employees.map((e, i) => ({
    id: `bal-${i}`,
    employee_id: e.id,
    year,
    annual_used: 0,
    sick_used: 0,
  })),
  terms: [
    {
      id: 'term-1',
      org_id: demoOrg.id,
      name: 'First term 2026/2027',
      start_date: `${year}-09-07`,
      end_date: `${year}-12-18`,
    },
  ],
}
let db: Record<string, Row[]>
try {
  db = JSON.parse(sessionStorage.getItem('staffstack-demo-data-v2') || 'null') || initial
} catch {
  db = initial
}
function hydrate(table: string, row: Row): Row {
  const out = { ...row }
  if (table === 'employees') {
    out.departments = db.departments.find((d) => d.id === row.department_id)
    out.salary_structures = db.salary_structures.filter((s) => s.employee_id === row.id)
  }
  if (['leave_requests', 'payslips', 'attendance', 'employee_subjects'].includes(table))
    out.employees = db.employees.find((e) => e.id === row.employee_id)
  if (table === 'subjects')
    out.employee_subjects = db.employee_subjects
      .filter((s) => s.subject_id === row.id)
      .map((s) => hydrate('employee_subjects', s))
  if (table === 'employee_subjects') out.subjects = db.subjects.find((s) => s.id === row.subject_id)
  return out
}
export function demoQuery(table: string) {
  let action = 'read',
    payload: Row[] = [],
    single = false,
    conflict = 'id'
  const filters: ((r: Row) => boolean)[] = [],
    sorts: { key: string; asc: boolean }[] = []
  let max = Infinity
  const query: any = {
    select: () => query,
    eq: (k: string, v: any) => {
      filters.push((r) => r[k] === v)
      return query
    },
    neq: (k: string, v: any) => {
      filters.push((r) => r[k] !== v)
      return query
    },
    lte: (k: string, v: any) => {
      filters.push((r) => r[k] <= v)
      return query
    },
    gte: (k: string, v: any) => {
      filters.push((r) => r[k] >= v)
      return query
    },
    in: (k: string, v: any[]) => {
      filters.push((r) => v.includes(r[k]))
      return query
    },
    order: (key: string, options?: { ascending?: boolean }) => {
      sorts.push({ key, asc: options?.ascending !== false })
      return query
    },
    limit: (n: number) => {
      max = n
      return query
    },
    single: () => {
      single = true
      return query
    },
    maybeSingle: () => {
      single = true
      return query
    },
    insert: (data: Row | Row[]) => {
      action = 'insert'
      payload = Array.isArray(data) ? data : [data]
      return query
    },
    upsert: (data: Row | Row[], options?: { onConflict?: string }) => {
      action = 'upsert'
      payload = Array.isArray(data) ? data : [data]
      conflict = options?.onConflict || 'id'
      return query
    },
    update: (data: Row) => {
      action = 'update'
      payload = [data]
      return query
    },
    delete: () => {
      action = 'delete'
      return query
    },
    then: (resolve: (v: any) => any, reject?: (reason: any) => any) =>
      Promise.resolve()
        .then(() => {
          const records = db[table] ?? (db[table] = [])
          let results = records.filter((r) => filters.every((f) => f(r)))
          if (action === 'insert' || action === 'upsert')
            results = payload.map((p) => {
              const found =
                action === 'upsert'
                  ? records.find((r) => conflict.split(',').every((k) => r[k] === p[k]))
                  : undefined
              if (found) {
                Object.assign(found, p)
                return found
              }
              const row = {
                id: crypto.randomUUID(),
                status: table === 'employees' ? 'active' : 'pending',
                created_at: new Date().toISOString(),
                effective_from: today,
                token: crypto.randomUUID(),
                ...p,
              }
              records.push(row)
              return row
            })
          if (action === 'update') results.forEach((r) => Object.assign(r, payload[0]))
          if (action === 'delete') db[table] = records.filter((r) => !results.includes(r))
          if (action !== 'read')
            sessionStorage.setItem('staffstack-demo-data-v2', JSON.stringify(db))
          results = [...results]
            .sort((a, b) => {
              for (const s of sorts) {
                if (a[s.key] !== b[s.key]) return (a[s.key] > b[s.key] ? 1 : -1) * (s.asc ? 1 : -1)
              }
              return 0
            })
            .slice(0, max)
            .map((r) => hydrate(table, r))
          return { data: single ? (results[0] ?? null) : results, error: null }
        })
        .then(resolve, reject),
  }
  return query
}

export async function demoRpc(name: string, args: Row = {}) {
  try {
    const save = () => sessionStorage.setItem('staffstack-demo-data-v2', JSON.stringify(db))
    const event = (action: string, entity: string, id: string) =>
      db.audit_events.push({
        id: crypto.randomUUID(),
        org_id: demoOrg.id,
        actor_id: 'demo-user',
        action,
        entity_type: entity,
        entity_id: id,
        created_at: new Date().toISOString(),
      })
    let data: any = null
    if (name === 'prepare_payroll') {
      const first = `${args.p_year}-${String(args.p_month).padStart(2, '0')}-01`
      let run = db.payroll_runs.find(
        (r) => r.period_year === args.p_year && r.period_month === args.p_month
      )
      if (run && run.status !== 'draft') throw Error('Only a draft can be recalculated')
      const eligible = db.employees.filter((e) => e.start_date <= first && e.status !== 'exited')
      const calculated = eligible.map((e) => {
        const salary = [...db.salary_structures]
          .filter((s) => s.employee_id === e.id && s.effective_from <= first)
          .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
        if (!salary) throw Error('Missing effective salary')
        return {
          ...salary,
          ...calculatePayslip(salary as any),
          employee_id: e.id,
          employee_snapshot: { ...e },
          token: crypto.randomUUID(),
          id: crypto.randomUUID(),
        }
      })
      if (!calculated.length) throw Error('No eligible employees')
      run ??= {
        id: crypto.randomUUID(),
        org_id: demoOrg.id,
        period_year: args.p_year,
        period_month: args.p_month,
        status: 'draft',
      }
      if (!db.payroll_runs.includes(run)) db.payroll_runs.push(run)
      db.payslips = db.payslips.filter((s) => s.payroll_run_id !== run.id)
      db.payslips.push(...calculated.map((s) => ({ ...s, payroll_run_id: run!.id })))
      const total = (k: string) => calculated.reduce((n, s) => n + Number((s as any)[k]), 0)
      Object.assign(run, {
        prepared_by: 'demo-user',
        gross_total: total('gross'),
        net_total: total('net_pay'),
        total_paye: total('paye'),
        total_pension_employee: total('pension_employee'),
        total_pension_employer: total('pension_employer'),
        total_nhf: total('nhf'),
        total_nsitf: total('nsitf'),
        calculation_version: 'NG-2026-v2',
      })
      data = run.id
      event('prepare', 'payroll_runs', run.id)
    } else if (name === 'transition_payroll') {
      const r = db.payroll_runs.find((r) => r.id === args.p_run)
      if (!r) throw Error('Run not found')
      const next: Record<string, string[]> = {
        draft: ['review'],
        review: ['draft', 'approved'],
        approved: ['paid'],
        paid: [],
      }
      if (!next[r.status]?.includes(args.p_status)) throw Error('Invalid or locked transition')
      if (args.p_status === 'paid' && String(args.p_reference ?? '').trim().length < 3)
        throw Error('Payment reference required')
      if (
        args.p_status === 'approved' &&
        db.payslips
          .filter((s) => s.payroll_run_id === r.id)
          .some((s) => !/^\d{10}$/.test(s.employee_snapshot?.account_number ?? ''))
      )
        throw Error('Complete bank details first')
      // Sandbox simulates the second approver; the real RPC enforces two distinct users.
      r.status = args.p_status
      r.approved_by = args.p_status === 'approved' ? 'demo-reviewer' : r.approved_by
      r.payment_reference = args.p_reference
      event(args.p_status, 'payroll_runs', r.id)
    } else if (name === 'record_payroll_export') {
      const r = db.payroll_runs.find((r) => r.id === args.p_run)
      if (!r || !['approved', 'paid'].includes(r.status))
        throw Error('Approve payroll before export')
      event('bank_export', 'payroll_runs', r.id)
    } else if (name === 'review_leave') {
      const r = db.leave_requests.find((r) => r.id === args.p_request)
      if (!r || r.status !== 'pending') throw Error('Request already reviewed')
      if (!['approved', 'declined'].includes(args.p_status)) throw Error('Invalid decision')
      if (args.p_status === 'approved' && ['annual', 'sick'].includes(r.leave_type)) {
        let b = db.leave_balances.find(
          (b) => b.employee_id === r.employee_id && b.year === Number(r.start_date.slice(0, 4))
        )
        if (!b) {
          b = {
            id: crypto.randomUUID(),
            employee_id: r.employee_id,
            year: Number(r.start_date.slice(0, 4)),
            annual_total: 21,
            sick_total: 10,
            annual_used: 0,
            sick_used: 0,
          }
          db.leave_balances.push(b)
        }
        const key = r.leave_type + '_used',
          limit = r.leave_type === 'annual' ? 21 : 10
        if (b[key] + r.days > limit) throw Error('Insufficient leave balance')
        b[key] += r.days
      }
      r.status = args.p_status
      event(args.p_status, 'leave_requests', r.id)
    } else if (name === 'import_employees') {
      const snapshot = JSON.stringify(db)
      try {
        for (const row of args.p_rows) {
          if (!row.first_name || !row.last_name || !row.role || Number(row.basic) < 0)
            throw Error('Invalid employee')
          if (row.email && db.employees.some((e) => e.email === row.email))
            throw Error('Duplicate email')
          const id = crypto.randomUUID()
          db.employees.push({ id, org_id: args.p_org, status: 'active', ...row })
          db.salary_structures.push({
            id: crypto.randomUUID(),
            employee_id: id,
            ...row,
            effective_from: row.effective_from ?? row.start_date,
          })
          db.leave_balances.push({
            id: crypto.randomUUID(),
            employee_id: id,
            year,
            annual_used: 0,
            sick_used: 0,
          })
          event('insert', 'employees', id)
        }
        data = args.p_rows.length
      } catch (e) {
        db = JSON.parse(snapshot)
        throw e
      }
    } else if (name === 'save_salary') {
      const s = args.p_salary
      if (
        db.salary_structures.some(
          (r) => r.employee_id === args.p_employee && r.effective_from === s.effective_from
        )
      )
        throw Error('A salary already exists for this date')
      calculatePayslip(s)
      db.salary_structures.push({ id: crypto.randomUUID(), employee_id: args.p_employee, ...s })
      event('insert', 'salary_structures', args.p_employee)
    } else if (name === 'create_invitation') {
      data = crypto.randomUUID()
      db.invitations.push({
        id: crypto.randomUUID(),
        org_id: demoOrg.id,
        email: args.p_email,
        role: args.p_role,
        token: data,
        expires_at: dateOffset(7),
      })
      event('invite', 'invitations', data)
    } else if (name === 'revoke_invitation') {
      const i = db.invitations.find((i) => i.id === args.p_invitation)
      if (i) i.expires_at = '2000-01-01'
    } else if (name === 'remove_member') {
      throw Error('Member removal is unavailable in the sample workspace')
    } else if (name === 'delete_workspace') {
      throw Error('Demo workspace cannot be deleted')
    } else if (name === 'rotate_payslip_link') {
      const s = db.payslips.find((s) => s.id === args.p_slip)
      if (s) {
        s.token = crypto.randomUUID()
        s.token_revoked_at = args.p_revoke ? today : null
        data = s.token
      }
    } else if (name === 'save_subject') {
      const id = args.p_subject ?? crypto.randomUUID()
      let s = db.subjects.find((s) => s.id === id)
      if (!s) {
        s = { id, org_id: args.p_org }
        db.subjects.push(s)
      }
      Object.assign(s, { name: args.p_name, class_level: args.p_class })
      db.employee_subjects = db.employee_subjects.filter((r) => r.subject_id !== id)
      db.employee_subjects.push(
        ...args.p_teachers.map((employee_id: string) => ({
          id: crypto.randomUUID(),
          subject_id: id,
          employee_id,
        }))
      )
      data = id
      event('subject_saved', 'subjects', id)
    } else if (name === 'get_public_payslip') {
      const s = db.payslips.find((s) => s.token === args.p_token && !s.token_revoked_at)
      if (s) {
        const r = db.payroll_runs.find((r) => r.id === s.payroll_run_id)
        if (r && ['approved', 'paid'].includes(r.status))
          data = {
            ...s,
            employees: db.employees.find((e) => e.id === s.employee_id),
            payroll_runs: { ...r, organisations: demoOrg },
          }
      }
    } else if (name === 'employee_portal') {
      const emp = db.employees[0]
      data = {
        employee: emp,
        payslips: db.payslips
          .filter(
            (s) =>
              s.employee_id === emp.id &&
              ['approved', 'paid'].includes(
                db.payroll_runs.find((r) => r.id === s.payroll_run_id)?.status
              )
          )
          .map((s) => ({ ...s, ...db.payroll_runs.find((r) => r.id === s.payroll_run_id) })),
        requests: db.leave_requests.filter((r) => r.employee_id === emp.id),
        balances: db.leave_balances.filter((b) => b.employee_id === emp.id),
      }
    } else if (name === 'request_my_leave') {
      const days = workingDays(args.p_start, args.p_end)
      if (!days) throw Error('Invalid leave dates')
      db.leave_requests.push({
        id: crypto.randomUUID(),
        org_id: demoOrg.id,
        employee_id: db.employees[0].id,
        leave_type: args.p_type,
        start_date: args.p_start,
        end_date: args.p_end,
        reason: args.p_reason,
        days,
        status: 'pending',
        created_at: today,
      })
    } else throw Error('This action is not available in the demo')
    save()
    return { data, error: null }
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } }
  }
}
