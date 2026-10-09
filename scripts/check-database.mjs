import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
const db = new PGlite({ extensions: { pgcrypto } })
const bootstrap = `
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',coalesce(nullif(current_setting('request.jwt.claim.aal',true),''),'aal1')) $$;
grant execute on function auth.jwt() to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
alter default privileges in schema public grant all on tables to authenticated,service_role;
alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;
grant all on storage.objects to authenticated; grant all on storage.objects,storage.buckets to service_role;
create function storage.foldername(text) returns text[] language sql as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
`
const user = '10000000-0000-0000-0000-000000000001',
  reviewer = '10000000-0000-0000-0000-000000000002',
  outsider = '10000000-0000-0000-0000-000000000003',
  employee = '10000000-0000-0000-0000-000000000004'
const sql = async (s, p = []) => db.query(s, p)
const value = async (s, p = []) => Object.values((await sql(s, p)).rows[0] ?? {})[0]
const asUser = async (id) => {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); select set_config('request.jwt.claim.aal','aal2',false); set role authenticated;`
  )
}
const asAdmin = async () => db.exec('reset role;')
const rejects = async (statement, params, pattern) =>
  assert.rejects(() => sql(statement, params), pattern)
try {
  await db.exec(bootstrap)
  await db.exec(
    'create table public.unrelated_secret(value text); revoke all on public.unrelated_secret from anon,authenticated;'
  )
  for (const migration of ['20261009000100_baseline.sql', '20261009000200_production.sql']) {
    try {
      await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'))
    } catch (e) {
      console.error('Migration failed:', migration, e.message, e.query?.slice(-400))
      throw e
    }
  }
  await db.exec(
    `insert into auth.users values ('${user}','owner@example.com',now()),('${reviewer}','reviewer@example.com',now()),('${outsider}','outsider@example.com',now()),('${employee}','staff@example.com',now());`
  )
  await asUser(user)
  const org = await value(
    "select public.create_workspace('Test School','Lagos','Education',25,array['Teaching'])"
  )
  const department = await value('select id from departments where org_id=$1', [org])
  await asUser(outsider)
  await rejects(
    "insert into org_members(org_id,user_id,role) values($1,$2,'owner')",
    [org, outsider],
    /permission denied/
  )
  await rejects('select * from unrelated_secret', [], /permission denied/)
  assert.equal(await value('select count(*)::int from organisations where id=$1', [org]), 0)
  await rejects('select prepare_payroll($1,10,2026)', [org], /permission/)
  await asUser(user)
  const row = {
    first_name: 'Ada',
    last_name: 'Okafor',
    email: 'staff@example.com',
    role: 'Teacher',
    department_id: department,
    start_date: '2024-01-01',
    basic: 180000,
    housing: 75000,
    transport: 45000,
    annual_rent: 900000,
    pension_enabled: true,
    nhf_enabled: true,
    nsitf_enabled: true,
    account_number: '0123456789',
    bank_code: '058',
    bank_name: 'GTBank',
    account_name: 'Ada Okafor',
  }
  assert.equal(await value('select import_employees($1,$2)', [org, JSON.stringify([row])]), 1)
  const emp = await value('select id from employees where org_id=$1', [org])
  await sql("update employees set status='on-leave' where id=$1", [emp])
  await sql("select set_config('request.jwt.claim.aal','aal1',false)")
  await rejects('select prepare_payroll($1,10,2026)', [org], /permission/)
  await sql("select set_config('request.jwt.claim.aal','aal2',false)")
  const run = await value('select prepare_payroll($1,10,2026)', [org])
  assert.equal(
    await value('select count(*)::int from payslips where payroll_run_id=$1', [run]),
    1,
    'Paid leave remains eligible'
  )
  const net = Number(await value('select net_total from payroll_runs where id=$1', [run]))
  assert.ok(net > 0)
  await rejects('update payroll_runs set net_total=0 where id=$1', [run], /permission denied/)
  await rejects('update employees set user_id=$1 where id=$2', [outsider, emp], /permission denied/)
  await sql("select transition_payroll($1,'review')", [run])
  await rejects(
    "select transition_payroll($1,'approved')",
    [run],
    /different payroll administrator/
  )
  const invite = await value(
    "select create_invitation($1,'reviewer@example.com','payroll_manager')",
    [org]
  )
  await asUser(outsider)
  await rejects('select accept_invitation($1)', [invite], /another email/)
  await asUser(reviewer)
  await sql('select accept_invitation($1)', [invite])
  await rejects('select accept_invitation($1)', [invite], /invalid/)
  await sql("select transition_payroll($1,'approved')", [run])
  await rejects('select prepare_payroll($1,10,2026)', [org], /Only a draft/)
  await rejects("select transition_payroll($1,'paid','')", [run], /reference/)
  await sql('select record_payroll_export($1)', [run])
  await sql("select transition_payroll($1,'paid','BANK-1234')", [run])
  await rejects("select transition_payroll($1,'draft')", [run], /locked/)
  const slip = await value('select id from payslips where payroll_run_id=$1', [run])
  const token = await value('select rotate_payslip_link($1,false)', [slip])
  await db.exec('reset role;set role anon;')
  const publicSlip = await value('select get_public_payslip($1)', [token])
  assert.equal(publicSlip.employees.first_name, 'Ada')
  assert.equal(publicSlip.employees.account_number, undefined)
  await rejects('select * from payslips', [], /permission denied/)
  assert.equal(await value("select get_public_payslip('wrong')"), null)
  await asUser(reviewer)
  await sql('select rotate_payslip_link($1,true)', [slip])
  await db.exec('reset role;set role anon;')
  assert.equal(await value('select get_public_payslip($1)', [token]), null)
  await asUser(user)
  const portalInvite = await value(
    "select create_invitation($1,'staff@example.com','employee',$2)",
    [org, emp]
  )
  await asUser(employee)
  await sql('select accept_invitation($1)', [portalInvite])
  assert.equal(
    await value('select count(*)::int from employees'),
    0,
    'Employee cannot browse staff directory'
  )
  const portal = await value('select employee_portal()')
  assert.equal(portal.employee.first_name, 'Ada')
  assert.equal(portal.payslips.length, 1)
  await rejects('select prepare_payroll($1,11,2026)', [org], /permission/)
  await sql("select request_my_leave('annual','2026-11-02','2026-11-06','Family time')")
  await asUser(user)
  const request = await value(
    "select id from leave_requests where employee_id=$1 and status='pending'",
    [emp]
  )
  await sql("select review_leave($1,'approved')", [request])
  assert.equal(
    Number(
      await value('select annual_used from leave_balances where employee_id=$1 and year=2026', [
        emp,
      ])
    ),
    5
  )
  await rejects("select review_leave($1,'approved')", [request], /already been reviewed/)
  // Reject non-finite monetary values at the database boundary.
  await rejects(
    'select import_employees($1,$2)',
    [org, JSON.stringify([{ ...row, email: 'nan@example.com', basic: 'NaN' }])],
    /salary_nonnegative/
  )
  // Roll back the entire import if one record fails.
  const before = await value('select count(*)::int from employees')
  await rejects(
    'select import_employees($1,$2)',
    [
      org,
      JSON.stringify([
        { ...row, email: 'new@example.com' },
        { ...row, email: 'bad@example.com', basic: -1 },
      ]),
    ],
    /salary_nonnegative/
  )
  assert.equal(await value('select count(*)::int from employees'), before)
  // Future salary cannot leak into a historical period.
  await sql('select save_salary($1,$2)', [
    emp,
    JSON.stringify({ ...row, effective_from: '2027-01-01', basic: 300000 }),
  ])
  const nov = await value('select prepare_payroll($1,11,2026)', [org])
  assert.equal(
    Number(await value('select gross_total from payroll_runs where id=$1', [nov])),
    300000
  )
  await rejects("select delete_workspace($1,'Test School')", [org], /retained/)
  assert.ok((await value('select count(*)::int from audit_events where org_id=$1', [org])) > 0)
  // Database and browser engine agree on representative calculations.
  await asAdmin()
  const expected = await value('select private.annual_paye(3600000,288000,54000,900000)')
  assert.equal(Number(expected), 344040)
  const backup = await db.dumpDataDir()
  const recovered = new PGlite({ extensions: { pgcrypto }, loadDataDir: backup })
  try {
    const recoveredCount = await recovered.query('select count(*)::int as count from payslips')
    assert.ok(recoveredCount.rows[0].count >= 2)
    const recoveredRun = await recovered.query('select status from payroll_runs where id=$1', [run])
    assert.equal(recoveredRun.rows[0].status, 'paid')
  } finally {
    await recovered.close()
  }
  console.log(
    'PASS: snapshot recovery, migrations, tenant isolation, blocked self-membership, RBAC, atomic imports/payroll, paid-leave inclusion, historic salary selection, two-person approval, locked records, bearer-link expiry/revocation/privacy, employee portal, atomic leave, and audit trail.'
  )
} catch (e) {
  console.error('FAIL:', e.message, e.where ?? '')
  process.exitCode = 1
} finally {
  await db.close()
}
