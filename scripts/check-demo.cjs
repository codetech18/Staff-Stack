const assert = require('node:assert/strict')
const { build } = require('esbuild')
const { mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const temporary = mkdtempSync(join(tmpdir(), 'staffstack-check-'))
const store = new Map()
global.location = { search: '?demo=1' }
global.sessionStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
}
async function check() {
  const file = join(temporary, 'demo.cjs')
  await build({
    entryPoints: ['src/lib/demo.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: file,
    define: { 'import.meta.env.DEV': 'true' },
  })
  const { demoQuery: q, demoRpc: rpc, isDemo } = require(file)
  assert.equal(isDemo, true)
  const people = await q('employees').select('*').eq('org_id', 'demo-org')
  assert.equal(people.data.length, 12)
  assert.equal(people.data[0].salary_structures.length, 1)
  assert.equal(people.data[0].departments.name, 'Secondary school')
  assert.equal((await q('leave_requests').select('*').eq('status', 'pending')).data.length, 3)
  await q('leave_requests').update({ status: 'approved' }).eq('id', 'leave-0')
  assert.equal((await q('leave_requests').select('*').eq('status', 'pending')).data.length, 2)
  const emp = await q('employees')
    .insert({
      org_id: 'demo-org',
      first_name: 'Test',
      last_name: 'Person',
      department_id: 'dept-0',
      start_date: '2026-01-01',
      account_number: '0123456789',
      bank_code: '058',
      account_name: 'Test Person',
    })
    .select()
    .single()
  assert.equal(emp.data.status, 'active')
  await q('salary_structures').insert({
    employee_id: emp.data.id,
    basic: 250000,
    housing: 0,
    transport: 0,
    other_allowances: 0,
    pension_enabled: false,
    nhf_enabled: false,
    nsitf_enabled: false,
    effective_from: '2026-01-01',
  })
  assert.equal(
    (await q('employees').select('*').eq('id', emp.data.id).single()).data.salary_structures[0]
      .basic,
    250000
  )
  const today = new Date().toISOString().slice(0, 10)
  await q('attendance').upsert(
    { employee_id: 'emp-0', date: today, status: 'present' },
    { onConflict: 'employee_id,date' }
  )
  await q('attendance').upsert(
    { employee_id: 'emp-0', date: today, status: 'late' },
    { onConflict: 'employee_id,date' }
  )
  const attendance = await q('attendance').select('*').eq('employee_id', 'emp-0').eq('date', today)
  assert.equal(attendance.data.length, 1)
  assert.equal(attendance.data[0].status, 'late')
  const subjects = await q('subjects').select('*')
  assert.equal(subjects.data.filter((s) => !s.employee_subjects.length).length, 1)
  const runs = await q('payroll_runs')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
  const slips = await q('payslips').select('*').eq('payroll_run_id', runs.data[0].id)
  assert.equal(slips.data.length, 12)
  assert.ok(slips.data.every((s) => s.net_pay > 0 && s.employees.account_number))
  assert.equal(
    slips.data.reduce((n, s) => n + s.gross, 0),
    runs.data[0].gross_total
  )
  assert.ok(store.has('staffstack-demo-data-v2'))
  const prepared = await rpc('prepare_payroll', { p_org: 'demo-org', p_month: 12, p_year: 2026 })
  assert.equal(prepared.error, null)
  assert.equal(
    (await rpc('transition_payroll', { p_run: prepared.data, p_status: 'review' })).error,
    null
  )
  assert.equal(
    (await rpc('transition_payroll', { p_run: prepared.data, p_status: 'approved' })).error,
    null
  )
  assert.ok((await rpc('prepare_payroll', { p_org: 'demo-org', p_month: 12, p_year: 2026 })).error)
  const prod = join(temporary, 'production.cjs')
  await build({
    entryPoints: ['src/lib/demo.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: prod,
    define: { 'import.meta.env.DEV': 'false' },
  })
  assert.equal(require(prod).isDemo, false, 'Demo cannot enable itself in a production build')
  console.log(
    'PASS: demo data, relationships, leave review, staff creation, attendance upsert, payroll totals, session persistence, and production isolation.'
  )
}
check()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => rmSync(temporary, { recursive: true, force: true }))
