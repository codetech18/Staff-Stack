-- StaffStack — Database Schema (PostgreSQL / Supabase)
-- Run this in the Supabase SQL Editor

create table organisations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  industry      text,
  state         text not null default 'Lagos',
  address       text,
  logo_url      text,
  salary_day    int default 25,
  owner_id      uuid references auth.users(id) not null,
  created_at    timestamptz default now()
);

create table org_members (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organisations(id) on delete cascade not null,
  user_id       uuid references auth.users(id) not null,
  role          text not null default 'hr_manager' check (role in ('owner','hr_manager')),
  created_at    timestamptz default now(),
  unique(org_id, user_id)
);

create table departments (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organisations(id) on delete cascade not null,
  name          text not null,
  created_at    timestamptz default now()
);

create table employees (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references organisations(id) on delete cascade not null,
  department_id   uuid references departments(id) on delete set null,
  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,
  role            text not null,
  employment_type text not null default 'full-time' check (employment_type in ('full-time','contract','part-time')),
  start_date      date not null default current_date,
  status          text not null default 'active' check (status in ('active','on-leave','exited')),
  bank_name       text,
  bank_code       text,
  account_number  text,
  account_name    text,
  emergency_contact jsonb,
  created_at      timestamptz default now()
);

create table salary_structures (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid references employees(id) on delete cascade not null,
  basic            numeric not null,
  housing          numeric not null default 0,
  transport        numeric not null default 0,
  other_allowances numeric not null default 0,
  annual_rent      numeric not null default 0,   -- for PAYE rent relief (NTA 2025)
  pension_enabled  boolean not null default true,
  nhf_enabled      boolean not null default true,
  nsitf_enabled    boolean not null default true,
  currency         text not null default 'NGN',
  effective_from   date not null default current_date,
  created_at       timestamptz default now()
);

create table payroll_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organisations(id) on delete cascade not null,
  period_month  int not null check (period_month between 1 and 12),
  period_year   int not null,
  status        text not null default 'draft' check (status in ('draft','processed','paid')),
  gross_total   numeric default 0,
  net_total     numeric default 0,
  total_paye    numeric default 0,
  total_pension_employee numeric default 0,
  total_pension_employer numeric default 0,
  total_nhf     numeric default 0,
  total_nsitf   numeric default 0,
  processed_at  timestamptz,
  created_at    timestamptz default now(),
  unique(org_id, period_month, period_year)
);

create table payslips (
  id               uuid primary key default gen_random_uuid(),
  payroll_run_id   uuid references payroll_runs(id) on delete cascade not null,
  employee_id      uuid references employees(id) on delete cascade not null,
  gross            numeric not null,
  basic            numeric not null,
  housing          numeric not null default 0,
  transport        numeric not null default 0,
  other_allowances numeric not null default 0,
  paye             numeric not null,
  pension_employee numeric not null,
  pension_employer numeric not null,
  nhf              numeric not null,
  total_deductions numeric not null,
  net_pay          numeric not null,
  token            text unique default encode(gen_random_bytes(24),'hex'),
  sent_at          timestamptz,
  created_at       timestamptz default now(),
  unique(payroll_run_id, employee_id)
);

create table leave_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  employee_id  uuid references employees(id) on delete cascade not null,
  leave_type   text not null check (leave_type in ('annual','sick','casual','maternity')),
  start_date   date not null,
  end_date     date not null,
  days         int not null,
  reason       text,
  status       text not null default 'pending' check (status in ('pending','approved','declined')),
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz default now()
);

create table leave_balances (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid references employees(id) on delete cascade not null,
  year         int not null,
  annual_total int not null default 21,
  annual_used  int not null default 0,
  sick_total   int not null default 10,
  sick_used    int not null default 0,
  casual_total int not null default 5,
  casual_used  int not null default 0,
  unique(employee_id, year)
);

create table attendance (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  employee_id  uuid references employees(id) on delete cascade not null,
  date         date not null default current_date,
  clock_in     timestamptz,
  clock_out    timestamptz,
  status       text not null default 'present' check (status in ('present','absent','late','leave','holiday')),
  marked_by    uuid references auth.users(id),
  created_at   timestamptz default now(),
  unique(employee_id, date)
);

create table documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  employee_id  uuid references employees(id) on delete cascade not null,
  name         text not null,
  type         text check (type in ('contract','certificate','id','trcn','other')),
  file_url     text not null,
  expires_at   date,
  uploaded_by  uuid references auth.users(id),
  created_at   timestamptz default now()
);

-- SUBJECTS (what a school teaches — tagged onto staff for coverage visibility)
create table subjects (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  name         text not null,
  created_at   timestamptz default now(),
  unique(org_id, name)
);

-- EMPLOYEE_SUBJECTS (many-to-many: a teacher can cover several subjects/classes)
create table employee_subjects (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid references employees(id) on delete cascade not null,
  subject_id   uuid references subjects(id) on delete cascade not null,
  created_at   timestamptz default now(),
  unique(employee_id, subject_id)
);

-- ROW LEVEL SECURITY
alter table organisations     enable row level security;
alter table org_members       enable row level security;
alter table departments       enable row level security;
alter table employees         enable row level security;
alter table salary_structures enable row level security;
alter table payroll_runs      enable row level security;
alter table payslips          enable row level security;
alter table leave_requests    enable row level security;
alter table leave_balances    enable row level security;
alter table attendance        enable row level security;
alter table documents         enable row level security;
alter table subjects          enable row level security;
alter table employee_subjects enable row level security;

create or replace function my_org_ids() returns setof uuid
language sql security definer stable as $$
  select org_id from org_members where user_id = auth.uid()
$$;

create policy "members read org" on organisations for select using (id in (select my_org_ids()) or owner_id = auth.uid());
create policy "owner insert org" on organisations for insert with check (owner_id = auth.uid());
create policy "owner update org" on organisations for update using (owner_id = auth.uid());

create policy "members read members" on org_members for select using (org_id in (select my_org_ids()) or user_id = auth.uid());
create policy "self insert member" on org_members for insert with check (user_id = auth.uid());

create policy "member all departments" on departments for all using (org_id in (select my_org_ids()));
create policy "member all employees"   on employees   for all using (org_id in (select my_org_ids()));
create policy "member all salary" on salary_structures for all
  using (employee_id in (select id from employees where org_id in (select my_org_ids())));
create policy "member all runs" on payroll_runs for all using (org_id in (select my_org_ids()));
create policy "member all payslips" on payslips for all
  using (payroll_run_id in (select id from payroll_runs where org_id in (select my_org_ids())));
create policy "member all leave" on leave_requests for all using (org_id in (select my_org_ids()));
create policy "member all balances" on leave_balances for all
  using (employee_id in (select id from employees where org_id in (select my_org_ids())));
create policy "member all attendance" on attendance for all using (org_id in (select my_org_ids()));
create policy "member all documents"  on documents  for all using (org_id in (select my_org_ids()));

-- ═══════════════════════════════
-- SUBJECT TRACKING
-- ═══════════════════════════════

create table subjects (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  name         text not null,
  class_level  text, -- e.g. 'JSS1', 'SS3' — optional, null means whole-school / not class-specific
  created_at   timestamptz default now()
);

create table employee_subjects (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid references employees(id) on delete cascade not null,
  subject_id   uuid references subjects(id) on delete cascade not null,
  created_at   timestamptz default now(),
  unique(employee_id, subject_id)
);

alter table subjects enable row level security;
alter table employee_subjects enable row level security;

create policy "member all subjects" on subjects for all using (org_id in (select my_org_ids()));
create policy "member all employee_subjects" on employee_subjects for all
  using (subject_id in (select id from subjects where org_id in (select my_org_ids())));
