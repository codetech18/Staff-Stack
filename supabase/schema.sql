-- Fresh installation snapshot. For deployments use the ordered migrations.
-- StaffStack — Database Schema (PostgreSQL / Supabase)
-- Run this in the Supabase SQL Editor

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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
  employment_type text not null default 'full-time' check (employment_type in ('full-time','contract','part-time','nysc')),
  staff_category  text not null default 'teaching' check (staff_category in ('teaching','non_teaching')),
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
  token            text unique default encode(extensions.gen_random_bytes(24),'hex'),
  sent_at          timestamptz,
  created_at       timestamptz default now(),
  unique(payroll_run_id, employee_id)
);

create table leave_requests (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  employee_id  uuid references employees(id) on delete cascade not null,
  leave_type   text not null check (leave_type in ('annual','sick','maternity','study','compassionate')),
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

create table terms (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  name         text not null,
  start_date   date not null,
  end_date     date not null,
  created_at   timestamptz default now()
);

-- ROW LEVEL SECURITY
alter table organisations     enable row level security;
alter table terms             enable row level security;
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
create policy "member all terms"      on terms      for all using (org_id in (select my_org_ids()));

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

create policy "member all subjects" on subjects for all using (org_id in (select my_org_ids()));
create policy "member all employee_subjects" on employee_subjects for all
  using (subject_id in (select id from subjects where org_id in (select my_org_ids())));

-- Upgrade the original StaffStack schema. Apply to an existing installation after
-- recording the baseline migration as applied. All financial writes go through RPCs.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
alter table employees add column if not exists user_id uuid unique references auth.users(id) on delete set null;
alter table employees add column if not exists end_date date;
update employees set status='active' where status='on-leave';
alter table org_members drop constraint if exists org_members_role_check;
alter table org_members add constraint org_members_role_check check (role in ('owner','hr_manager','payroll_manager','employee','auditor'));
alter table payroll_runs drop constraint if exists payroll_runs_status_check;
update payroll_runs set status = 'review' where status = 'processed';
alter table payroll_runs add constraint payroll_runs_status_check check(status in ('draft','review','approved','paid'));
alter table payroll_runs add column if not exists prepared_by uuid references auth.users(id);
alter table payroll_runs add column if not exists approved_by uuid references auth.users(id);
alter table payroll_runs add column if not exists approved_at timestamptz;
alter table payroll_runs add column if not exists paid_at timestamptz;
alter table payroll_runs add column if not exists payment_reference text;
alter table payroll_runs add column if not exists calculation_version text;
alter table payslips add column if not exists nsitf numeric not null default 0;
alter table payslips add column if not exists employee_snapshot jsonb;
alter table payslips add column if not exists token_expires_at timestamptz default (now() + interval '30 days');
alter table payslips add column if not exists token_revoked_at timestamptz;
alter table payslips add column if not exists delivery_claimed_at timestamptz;
alter table salary_structures add constraint salary_nonnegative check (basic >= 0 and basic not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(basic)<=2 and housing >= 0 and housing not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(housing)<=2 and transport >= 0 and transport not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(transport)<=2 and other_allowances >= 0 and other_allowances not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(other_allowances)<=2 and annual_rent >= 0 and annual_rent not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(annual_rent)<=2) not valid;
alter table leave_requests add constraint leave_dates_valid check (end_date >= start_date and days > 0) not valid;
alter table terms add constraint term_dates_valid check (end_date >= start_date) not valid;
alter table employees add constraint employment_dates_valid check (end_date is null or end_date >= start_date) not valid;
alter table employees add constraint bank_account_valid check (account_number is null or account_number ~ '^[0-9]{10}$') not valid;
alter table organisations add constraint salary_day_valid check (salary_day between 1 and 28) not valid;
create unique index if not exists employees_org_email_unique on employees(org_id,lower(email)) where email is not null and email<>'';
create index if not exists employees_org_idx on employees(org_id);
create index if not exists salaries_effective_idx on salary_structures(employee_id, effective_from desc);
create index if not exists leave_org_dates_idx on leave_requests(org_id, start_date, end_date);
create index if not exists attendance_org_date_idx on attendance(org_id, date);
create table if not exists audit_events (
 id uuid primary key default gen_random_uuid(), org_id uuid references organisations(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, action text not null,
 entity_type text not null, entity_id uuid, changed_fields text[], created_at timestamptz not null default now()
);
create table if not exists invitations (
 id uuid primary key default gen_random_uuid(), org_id uuid references organisations(id) on delete cascade not null,
 email text not null, role text not null check(role in ('hr_manager','payroll_manager','employee','auditor')),
 employee_id uuid references employees(id) on delete cascade,
 token text unique not null default encode(extensions.gen_random_bytes(24),'hex'),
 expires_at timestamptz not null default now() + interval '7 days', accepted_at timestamptz,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 check ((role = 'employee') = (employee_id is not null))
);
alter table audit_events enable row level security;
alter table invitations enable row level security;

delete from org_members m where m.role='owner' and not exists(select 1 from organisations o where o.id=m.org_id and o.owner_id=m.user_id);

create or replace function private.has_role(p_org uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.organisations where id=p_org and owner_id=auth.uid())
 or exists(select 1 from public.org_members where org_id=p_org and user_id=auth.uid() and role<>'owner' and role=any(p_roles))
$$;
create or replace function private.is_staff_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select private.has_role(p_org,array['owner','hr_manager']) $$;
create or replace function private.is_finance(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select private.has_role(p_org,array['owner','payroll_manager']) and coalesce(auth.jwt()->>'aal','aal1')='aal2' $$;
create or replace function private.can_read_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select private.has_role(p_org,array['owner','hr_manager','payroll_manager','auditor']) $$;
create or replace function public.my_org_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
 select org_id from public.org_members where user_id=auth.uid()
 union select id from public.organisations where owner_id=auth.uid()
$$;
-- Remove legacy permissive policies so they cannot OR with the new restrictions.
do $$ declare p record; begin
 for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in
 ('organisations','org_members','departments','employees','salary_structures','payroll_runs','payslips','leave_requests','leave_balances','attendance','documents','terms','subjects','employee_subjects','audit_events','invitations') loop
 execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop;
end $$;
create policy org_read on organisations for select to authenticated using(id in (select my_org_ids()));
create policy org_update on organisations for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy member_read on org_members for select to authenticated using(user_id=auth.uid() or private.has_role(org_id,array['owner']));
create policy employee_read on employees for select to authenticated using(private.can_read_admin(org_id));
create policy employee_insert on employees for insert to authenticated with check(private.is_staff_admin(org_id) and user_id is null);
-- Do not grant arbitrary user_id/org_id updates to browser clients.
create policy employee_update on employees for update to authenticated using(private.is_staff_admin(org_id)) with check(private.is_staff_admin(org_id));
create policy salary_read on salary_structures for select to authenticated using(exists(select 1 from employees e where e.id=employee_id and private.can_read_admin(e.org_id)));
create policy salary_insert on salary_structures for insert to authenticated with check(exists(select 1 from employees e where e.id=employee_id and private.is_staff_admin(e.org_id)));
create policy run_read on payroll_runs for select to authenticated using(private.can_read_admin(org_id));
create policy slip_read on payslips for select to authenticated using(exists(select 1 from payroll_runs r where r.id=payroll_run_id and private.can_read_admin(r.org_id)));
create policy leave_read on leave_requests for select to authenticated using(private.can_read_admin(org_id));
create policy leave_insert on leave_requests for insert to authenticated with check(private.is_staff_admin(org_id) and status='pending' and reviewed_by is null and reviewed_at is null);
create policy balance_read on leave_balances for select to authenticated using(exists(select 1 from employees e where e.id=employee_id and private.can_read_admin(e.org_id)));
create policy balance_insert on leave_balances for insert to authenticated with check(exists(select 1 from employees e where e.id=employee_id and private.is_staff_admin(e.org_id)) and annual_used=0 and sick_used=0 and casual_used=0);
create policy audit_read on audit_events for select to authenticated using(private.has_role(org_id,array['owner','auditor']));
create policy invite_read on invitations for select to authenticated using(private.has_role(org_id,array['owner']));
-- Standard non-financial management tables.
do $$ declare t text; begin
 foreach t in array array['departments','attendance','documents','terms','subjects'] loop
 execute format('create policy admin_read on %I for select to authenticated using (private.can_read_admin(org_id))',t);
 execute format('create policy admin_write on %I for all to authenticated using (private.is_staff_admin(org_id)) with check (private.is_staff_admin(org_id))',t);
 end loop;
end $$;
create policy assignment_read on employee_subjects for select to authenticated using(exists(select 1 from subjects s where s.id=subject_id and private.can_read_admin(s.org_id)));
create policy assignment_write on employee_subjects for all to authenticated using(exists(select 1 from subjects s where s.id=subject_id and private.is_staff_admin(s.org_id))) with check(exists(select 1 from subjects s where s.id=subject_id and private.is_staff_admin(s.org_id)));
revoke all on organisations,org_members,departments,employees,salary_structures,payroll_runs,payslips,leave_requests,leave_balances,attendance,documents,subjects,employee_subjects,terms,audit_events,invitations from anon;
revoke insert, update, delete on org_members, payroll_runs, payslips, invitations, audit_events from authenticated;
revoke update, delete on salary_structures, leave_balances, leave_requests from authenticated;
revoke insert, delete on organisations from authenticated;
revoke update on organisations, employees from authenticated;
grant select on organisations,org_members,departments,employees,salary_structures,payroll_runs,payslips,leave_requests,leave_balances,attendance,documents,subjects,employee_subjects,terms,audit_events,invitations to authenticated;
grant update(name, industry, state, salary_day, address, logo_url) on organisations to authenticated;
grant update(first_name,last_name,email,phone,role,department_id,employment_type,staff_category,start_date,end_date,status,bank_code,bank_name,account_number,account_name,emergency_contact) on employees to authenticated;

-- Validate foreign-key relationships within a single tenant, including service/RPC writes.
create or replace function private.check_tenant() returns trigger language plpgsql security definer set search_path='' as $$
declare other_org uuid; row_data jsonb:=to_jsonb(new); begin
 if TG_TABLE_NAME='employees' and row_data->>'department_id' is not null then
  select org_id into other_org from public.departments where id=(row_data->>'department_id')::uuid;
 elsif TG_TABLE_NAME='employee_subjects' then
  select org_id into other_org from public.employees where id=(row_data->>'employee_id')::uuid;
  if other_org is distinct from (select org_id from public.subjects where id=(row_data->>'subject_id')::uuid) then raise exception 'Cross-workspace assignment'; end if; return new;
 elsif TG_TABLE_NAME='payslips' then
  select org_id into other_org from public.employees where id=(row_data->>'employee_id')::uuid;
  if other_org is distinct from (select org_id from public.payroll_runs where id=(row_data->>'payroll_run_id')::uuid) then raise exception 'Cross-workspace payslip'; end if; return new;
 elsif TG_TABLE_NAME in ('leave_requests','attendance','documents','invitations') and row_data->>'employee_id' is not null then
  select org_id into other_org from public.employees where id=(row_data->>'employee_id')::uuid;
 else return new; end if;
 if TG_TABLE_NAME='leave_requests' then select count(*) into new.days from generate_series(new.start_date::timestamp,new.end_date::timestamp,interval '1 day') d where extract(isodow from d)<6; end if;
 if other_org is distinct from (row_data->>'org_id')::uuid then raise exception 'Cross-workspace relationship'; end if;
 return new; end $$;
do $$ declare t text; begin foreach t in array array['employees','employee_subjects','payslips','leave_requests','attendance','documents','invitations'] loop
 execute format('create trigger tenant_guard before insert or update on public.%I for each row execute function private.check_tenant()',t); end loop; end $$;

create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb; tenant uuid; changed text[]; begin
 row_data := case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 tenant := (row_data->>'org_id')::uuid;
 if tenant is null and row_data ? 'employee_id' then select org_id into tenant from public.employees where id=(row_data->>'employee_id')::uuid; end if;
 if tenant is null and row_data ? 'payroll_run_id' then select org_id into tenant from public.payroll_runs where id=(row_data->>'payroll_run_id')::uuid; end if;
 if tenant is null or not exists(select 1 from public.organisations where id=tenant) then if TG_OP='DELETE' then return old; else return new; end if; end if;
 if TG_OP='UPDATE' then select array_agg(key) into changed from jsonb_each(row_data) where value is distinct from to_jsonb(old)->key; end if;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id,changed_fields) values(tenant,auth.uid(),lower(TG_OP),TG_TABLE_NAME,(row_data->>'id')::uuid,changed);
 if TG_OP='DELETE' then return old; else return new; end if; end $$;
do $$ declare t text; begin foreach t in array array['employees','salary_structures','payroll_runs','leave_requests','documents','invitations','attendance'] loop
 execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function private.audit_change()',t); end loop; end $$;

create or replace function public.create_workspace(p_name text,p_state text,p_industry text,p_salary_day int,p_departments text[]) returns uuid
language plpgsql security definer set search_path='' as $$ declare org uuid; d text; begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(p_name))<2 or p_salary_day not between 1 and 28 then raise exception 'Invalid workspace details'; end if;
 insert into public.organisations(name,slug,state,industry,salary_day,owner_id) values(trim(p_name),'school-'||gen_random_uuid(),p_state,p_industry,p_salary_day,auth.uid()) returning id into org;
 insert into public.org_members(org_id,user_id,role) values(org,auth.uid(),'owner');
 foreach d in array p_departments loop if trim(d)<>'' then insert into public.departments(org_id,name) values(org,trim(d)); end if; end loop;
 return org; end $$;
create or replace function public.create_invitation(p_org uuid,p_email text,p_role text,p_employee uuid default null) returns text
language plpgsql security definer set search_path='' as $$ declare t text; begin
 if not private.has_role(p_org,array['owner']) or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'Owner permission and two-step verification required'; end if;
 if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
 if p_role='employee' and not exists(select 1 from public.employees where id=p_employee and org_id=p_org and lower(email)=lower(trim(p_email)) and user_id is null) then raise exception 'Select an unlinked employee with a matching email'; end if;
 insert into public.invitations(org_id,email,role,employee_id,created_by) values(p_org,lower(trim(p_email)),p_role,p_employee,auth.uid()) returning token into t; return t; end $$;
create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path='' as $$ declare invite public.invitations; user_email text; begin
 select email into user_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if user_email is null then raise exception 'Sign in with a verified email first'; end if;
 select * into invite from public.invitations where token=p_token and accepted_at is null and expires_at>now() for update;
 if invite.id is null or lower(user_email)<>invite.email then raise exception 'Invitation invalid, expired, or for another email'; end if;
 if exists(select 1 from public.org_members where org_id=invite.org_id and user_id=auth.uid()) then raise exception 'Already a member'; end if;
 insert into public.org_members(org_id,user_id,role) values(invite.org_id,auth.uid(),invite.role);
 if invite.employee_id is not null then
  update public.employees set user_id=auth.uid() where id=invite.employee_id and org_id=invite.org_id and user_id is null;
  if not found then raise exception 'Employee is already linked'; end if;
 end if;
 update public.invitations set accepted_at=now(),token=encode(extensions.gen_random_bytes(24),'hex') where id=invite.id;
 return invite.org_id; end $$;

-- Payroll calculation: decimal numeric arithmetic, versioned snapshots, and one transaction.
create or replace function private.annual_paye(gross numeric,pension numeric,nhf numeric,rent numeric) returns numeric language plpgsql immutable set search_path='' as $$
declare taxable numeric; tax numeric:=0; lower_bound numeric:=0; cap numeric; rate numeric; i int;
 caps numeric[]:=array[800000,3000000,12000000,25000000,50000000]; rates numeric[]:=array[0,.15,.18,.21,.23]; begin
 if gross<=840000 then return 0; end if;
 taxable:=greatest(0,gross-pension-nhf-least(rent*.2,500000));
 for i in 1..5 loop cap:=caps[i];rate:=rates[i]; tax:=tax+greatest(0,least(taxable,cap)-lower_bound)*rate; lower_bound:=cap; if taxable<=cap then return tax; end if; end loop;
 return tax+greatest(0,taxable-50000000)*.25; end $$;
create or replace function public.prepare_payroll(p_org uuid,p_month int,p_year int) returns uuid language plpgsql security definer set search_path='' as $$
declare run public.payroll_runs; emp public.employees; sal public.salary_structures; start_day date; end_day date;
 gross numeric; pe numeric; pr numeric; nh numeric; ns numeric; tax numeric; count_staff int:=0;
begin
 if not private.is_finance(p_org) then raise exception 'Payroll permission required'; end if;
 if p_month not between 1 and 12 or p_year not between 2026 and 2100 then raise exception 'Unsupported payroll period'; end if;
 start_day:=make_date(p_year,p_month,1);end_day:=(start_day+interval '1 month - 1 day')::date;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text||':'||p_year||':'||p_month,0));
 select * into run from public.payroll_runs where org_id=p_org and period_month=p_month and period_year=p_year for update;
 if run.id is not null and run.status<>'draft' then raise exception 'Only a draft can be recalculated'; end if;
 if run.id is null then insert into public.payroll_runs(org_id,period_month,period_year,status) values(p_org,p_month,p_year,'draft') returning * into run; end if;
 if exists(select 1 from public.employees where org_id=p_org and status='exited' and end_date is null and start_date<=end_day) then raise exception 'Record an employment end date for every exited employee'; end if;
 delete from public.payslips where payroll_run_id=run.id;
 for emp in select * from public.employees where org_id=p_org and start_date<=end_day and (end_date is null or end_date>=start_day) and (status<>'exited' or end_date is not null) order by id loop
  if emp.start_date>start_day or (emp.end_date is not null and emp.end_date<end_day) then raise exception 'Partial-month employment requires a reviewed adjustment: % %',emp.first_name,emp.last_name; end if;
  select * into sal from public.salary_structures where employee_id=emp.id and effective_from<=start_day order by effective_from desc,created_at desc limit 1;
  if sal.id is null then raise exception 'Missing effective salary for % %',emp.first_name,emp.last_name; end if;
  if exists(select 1 from public.salary_structures where employee_id=emp.id and effective_from>start_day and effective_from<=end_day) then raise exception 'Mid-month salary changes require a reviewed adjustment'; end if;
  if not (sal.basic >= 0 and sal.basic not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(sal.basic)<=2 and sal.housing >= 0 and sal.housing not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(sal.housing)<=2 and sal.transport >= 0 and sal.transport not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(sal.transport)<=2 and sal.other_allowances >= 0 and sal.other_allowances not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(sal.other_allowances)<=2 and sal.annual_rent >= 0 and sal.annual_rent not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric) and scale(sal.annual_rent)<=2) then raise exception 'Invalid legacy salary amounts'; end if;
  gross:=round(sal.basic+sal.housing+sal.transport+sal.other_allowances,2);
  pe:=case when sal.pension_enabled then round((sal.basic+sal.housing+sal.transport)*.08,2) else 0 end;
  pr:=case when sal.pension_enabled then round((sal.basic+sal.housing+sal.transport)*.1,2) else 0 end;
  nh:=case when sal.nhf_enabled then round(sal.basic*.025,2) else 0 end;
  ns:=case when sal.nsitf_enabled then round(gross*.01,2) else 0 end;
  tax:=round(private.annual_paye(gross*12,pe*12,nh*12,sal.annual_rent)/12,2);
  insert into public.payslips(payroll_run_id,employee_id,gross,basic,housing,transport,other_allowances,paye,pension_employee,pension_employer,nhf,nsitf,total_deductions,net_pay,employee_snapshot)
   values(run.id,emp.id,gross,sal.basic,sal.housing,sal.transport,sal.other_allowances,tax,pe,pr,nh,ns,tax+pe+nh,gross-tax-pe-nh,
   jsonb_build_object('first_name',emp.first_name,'last_name',emp.last_name,'email',emp.email,'role',emp.role,'bank_name',emp.bank_name,'bank_code',emp.bank_code,'account_number',emp.account_number,'account_name',emp.account_name));
  count_staff:=count_staff+1;
 end loop;
 if count_staff=0 then raise exception 'No eligible employees for this period'; end if;
 update public.payroll_runs set prepared_by=auth.uid(),processed_at=now(),calculation_version='NG-2026-v2',
 gross_total=(select sum(s.gross) from public.payslips s where s.payroll_run_id=run.id),net_total=(select sum(s.net_pay) from public.payslips s where s.payroll_run_id=run.id),
 total_paye=(select sum(s.paye) from public.payslips s where s.payroll_run_id=run.id),total_pension_employee=(select sum(s.pension_employee) from public.payslips s where s.payroll_run_id=run.id),
 total_pension_employer=(select sum(s.pension_employer) from public.payslips s where s.payroll_run_id=run.id),total_nhf=(select sum(s.nhf) from public.payslips s where s.payroll_run_id=run.id),total_nsitf=(select sum(s.nsitf) from public.payslips s where s.payroll_run_id=run.id)
 where id=run.id; return run.id;
end $$;
create or replace function public.transition_payroll(p_run uuid,p_status text,p_reference text default null) returns void language plpgsql security definer set search_path='' as $$
declare run public.payroll_runs; begin
 select * into run from public.payroll_runs where id=p_run for update;
 if run.id is null or not private.is_finance(run.org_id) then raise exception 'Payroll permission required'; end if;
 if run.status='draft' and p_status='review' then
  if not exists(select 1 from public.payslips where payroll_run_id=p_run) then raise exception 'Prepare the draft first'; end if;
 elsif run.status='review' and p_status='draft' then null;
 elsif run.status='review' and p_status='approved' then
  if run.prepared_by is null then raise exception 'Return the legacy run to draft and prepare it again'; end if;
  if run.prepared_by=auth.uid() then raise exception 'A different payroll administrator must approve this run'; end if;
  if exists(select 1 from public.payslips where payroll_run_id=p_run and (employee_snapshot->>'account_number' is null or employee_snapshot->>'account_number' !~ '^[0-9]{10}$' or nullif(employee_snapshot->>'bank_code','') is null or nullif(employee_snapshot->>'account_name','') is null)) then raise exception 'Complete bank details before approval'; end if;
 elsif run.status='approved' and p_status='paid' then
  if length(trim(coalesce(p_reference,'')))<3 then raise exception 'Record a bank payment reference'; end if;
 else raise exception 'Invalid or locked payroll transition'; end if;
 update public.payroll_runs set status=p_status,approved_by=case when p_status='approved' then auth.uid() else approved_by end,approved_at=case when p_status='approved' then now() else approved_at end,paid_at=case when p_status='paid' then now() else paid_at end,payment_reference=case when p_status='paid' then trim(p_reference) else payment_reference end where id=p_run;
end $$;
create or replace function public.record_payroll_export(p_run uuid) returns void language plpgsql security definer set search_path='' as $$ declare org uuid; begin
 select org_id into org from public.payroll_runs where id=p_run and status in ('approved','paid');
 if org is null or not private.is_finance(org) then raise exception 'Only approved payroll can be exported'; end if;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id) values(org,auth.uid(),'bank_export','payroll_runs',p_run); end $$;
create or replace function public.rotate_payslip_link(p_slip uuid,p_revoke boolean default false) returns text language plpgsql security definer set search_path='' as $$ declare org uuid; t text; begin
 select r.org_id into org from public.payslips s join public.payroll_runs r on r.id=s.payroll_run_id where s.id=p_slip;
 if org is null or not private.is_finance(org) then raise exception 'Payroll permission required'; end if;
 update public.payslips set token=encode(extensions.gen_random_bytes(24),'hex'),token_expires_at=now()+interval '30 days',token_revoked_at=case when p_revoke then now() else null end where id=p_slip returning token into t;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id) values(org,auth.uid(),case when p_revoke then 'revoke_link' else 'rotate_link' end,'payslips',p_slip); return t; end $$;
-- Anonymous callers can retrieve only a single minimal payslip with its bearer token.
create or replace function public.get_public_payslip(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('basic',s.basic,'housing',s.housing,'transport',s.transport,'other_allowances',s.other_allowances,'gross',s.gross,'paye',s.paye,'pension_employee',s.pension_employee,'pension_employer',s.pension_employer,'nhf',s.nhf,'total_deductions',s.total_deductions,'net_pay',s.net_pay,
 'employees',jsonb_build_object('first_name',coalesce(s.employee_snapshot->>'first_name',e.first_name),'last_name',coalesce(s.employee_snapshot->>'last_name',e.last_name),'role',coalesce(s.employee_snapshot->>'role',e.role)),
 'payroll_runs',jsonb_build_object('period_month',r.period_month,'period_year',r.period_year,'organisations',jsonb_build_object('name',o.name)))
 from public.payslips s join public.employees e on e.id=s.employee_id join public.payroll_runs r on r.id=s.payroll_run_id join public.organisations o on o.id=r.org_id
 where s.token=p_token and length(p_token)=48 and s.token_expires_at>now() and s.token_revoked_at is null and r.status in ('approved','paid') limit 1
$$;

create or replace function public.review_leave(p_request uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare req public.leave_requests; balance public.leave_balances; begin
 select * into req from public.leave_requests where id=p_request for update;
 if req.id is null or not private.is_staff_admin(req.org_id) then raise exception 'Leave approval permission required'; end if;
 if req.status<>'pending' then raise exception 'This request has already been reviewed'; end if;
 if p_status not in ('approved','declined') then raise exception 'Invalid decision'; end if;
 if p_status='approved' then
  if extract(year from req.start_date)<>extract(year from req.end_date) then raise exception 'Split leave across calendar years'; end if;
  perform 1 from public.employees where id=req.employee_id for update;
  if exists(select 1 from public.leave_requests where employee_id=req.employee_id and status='approved' and start_date<=req.end_date and end_date>=req.start_date) then raise exception 'Overlapping approved leave'; end if;
  -- Serialise approvals for the same employee, including different requests.
  perform 1 from public.employees where id=req.employee_id for update;
  if req.leave_type in ('annual','sick') then
   insert into public.leave_balances(employee_id,year) values(req.employee_id,extract(year from req.start_date)::int) on conflict(employee_id,year) do nothing;
   select * into balance from public.leave_balances where employee_id=req.employee_id and year=extract(year from req.start_date)::int for update;
   if req.leave_type='annual' then
    if balance.annual_used+req.days>balance.annual_total then raise exception 'Insufficient annual leave balance'; end if;
    update public.leave_balances set annual_used=annual_used+req.days where id=balance.id;
   else
    if balance.sick_used+req.days>balance.sick_total then raise exception 'Insufficient sick leave balance'; end if;
    update public.leave_balances set sick_used=sick_used+req.days where id=balance.id;
   end if;
  end if;
 end if;
 -- Leave is derived from dates; do not alter employment status or payroll eligibility.
 update public.leave_requests set status=p_status,reviewed_by=auth.uid(),reviewed_at=now() where id=p_request;
end $$;
create or replace function public.request_my_leave(p_type text,p_start date,p_end date,p_reason text) returns void language plpgsql security definer set search_path='' as $$ declare emp public.employees; days int; begin
 select * into emp from public.employees where user_id=auth.uid();
 if emp.id is null or emp.status='exited' then raise exception 'Employee account required'; end if;
 if p_end<p_start or extract(year from p_end)<>extract(year from p_start) then raise exception 'Invalid leave dates'; end if;
 select count(*) into days from generate_series(p_start::timestamp,p_end::timestamp,interval '1 day') d where extract(isodow from d)<6;
 if days=0 then raise exception 'Leave must contain a weekday'; end if;
 insert into public.leave_requests(org_id,employee_id,leave_type,start_date,end_date,days,reason) values(emp.org_id,emp.id,p_type,p_start,p_end,days,nullif(trim(p_reason),'')); end $$;
create or replace function public.employee_portal() returns jsonb language plpgsql stable security definer set search_path='' as $$ declare emp public.employees; result jsonb; begin
 select * into emp from public.employees where user_id=auth.uid();
 if emp.id is null then raise exception 'Employee account required'; end if;
 select jsonb_build_object('employee',jsonb_build_object('first_name',emp.first_name,'last_name',emp.last_name,'role',emp.role),'payslips',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'net_pay',s.net_pay,'gross',s.gross,'period_month',r.period_month,'period_year',r.period_year,'basic',s.basic,'housing',s.housing,'transport',s.transport,'other_allowances',s.other_allowances,'paye',s.paye,'nhf',s.nhf,'pension_employee',s.pension_employee,'total_deductions',s.total_deductions) order by r.period_year desc,r.period_month desc) from public.payslips s join public.payroll_runs r on r.id=s.payroll_run_id where s.employee_id=emp.id and r.status in ('approved','paid')),'[]'::jsonb),'requests',coalesce((select jsonb_agg(to_jsonb(l)-'reviewed_by' order by l.created_at desc) from public.leave_requests l where l.employee_id=emp.id),'[]'::jsonb),'balances',coalesce((select jsonb_agg(to_jsonb(b)-'employee_id') from public.leave_balances b where b.employee_id=emp.id),'[]'::jsonb)) into result;
 return result; end $$;

-- Organisation removal is deliberately blocked while financial history exists.
create or replace function public.delete_workspace(p_org uuid,p_name text) returns void language plpgsql security definer set search_path='' as $$ begin
 perform 1 from public.organisations where id=p_org and owner_id=auth.uid() and name=p_name for update;
 if not found then raise exception 'Owner confirmation required'; end if;
 if exists(select 1 from public.payroll_runs where org_id=p_org) then raise exception 'Payroll history must be retained; contact support for an approved retention process'; end if;
 delete from public.organisations where id=p_org; end $$;

create or replace function public.import_employees(p_org uuid,p_rows jsonb) returns int language plpgsql security definer set search_path='' as $$
declare row jsonb; emp uuid; total int:=0; begin
 if not private.is_staff_admin(p_org) then raise exception 'Staff management permission required'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Import 1 to 500 rows'; end if;
 for row in select value from jsonb_array_elements(p_rows) loop
  if length(trim(coalesce(row->>'first_name','')))=0 or length(trim(coalesce(row->>'last_name','')))=0 or length(trim(coalesce(row->>'role','')))=0 then raise exception 'Name and role are required'; end if;
  if nullif(row->>'email','') is not null and row->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  if nullif(row->>'email','') is not null and exists(select 1 from public.employees where org_id=p_org and lower(email)=lower(row->>'email')) then raise exception 'Duplicate employee email: %',row->>'email'; end if;
  insert into public.employees(org_id,department_id,first_name,last_name,email,phone,role,employment_type,staff_category,start_date,bank_code,bank_name,account_number,account_name)
  values(p_org,nullif(row->>'department_id','')::uuid,trim(row->>'first_name'),trim(row->>'last_name'),nullif(lower(trim(row->>'email')),''),nullif(row->>'phone',''),trim(row->>'role'),coalesce(row->>'employment_type','full-time'),coalesce(row->>'staff_category','teaching'),coalesce(nullif(row->>'start_date','')::date,current_date),nullif(row->>'bank_code',''),nullif(row->>'bank_name',''),nullif(row->>'account_number',''),nullif(row->>'account_name','')) returning id into emp;
  insert into public.salary_structures(employee_id,basic,housing,transport,other_allowances,annual_rent,pension_enabled,nhf_enabled,nsitf_enabled,effective_from)
  values(emp,(row->>'basic')::numeric,coalesce((row->>'housing')::numeric,0),coalesce((row->>'transport')::numeric,0),coalesce((row->>'other_allowances')::numeric,0),coalesce((row->>'annual_rent')::numeric,0),coalesce((row->>'pension_enabled')::boolean,true),coalesce((row->>'nhf_enabled')::boolean,true),coalesce((row->>'nsitf_enabled')::boolean,true),coalesce(nullif(row->>'effective_from','')::date,nullif(row->>'start_date','')::date,current_date));
  insert into public.leave_balances(employee_id,year) values(emp,extract(year from current_date)::int);
  total:=total+1;
 end loop; return total; end $$;
create or replace function public.save_salary(p_employee uuid,p_salary jsonb) returns void language plpgsql security definer set search_path='' as $$ declare org uuid; effective date; begin
 select org_id into org from public.employees where id=p_employee for update;
 if org is null or not private.is_staff_admin(org) then raise exception 'Staff management permission required'; end if;
 effective:=(p_salary->>'effective_from')::date;
 if effective is null then raise exception 'Effective date required'; end if;
 if exists(select 1 from public.salary_structures where employee_id=p_employee and effective_from=effective) then raise exception 'A salary already exists for this date'; end if;
 if exists(select 1 from public.payroll_runs where org_id=org and status<>'draft' and make_date(period_year,period_month,1)>=effective) then raise exception 'Salary would change a submitted historical period. Use a future effective date'; end if;
 insert into public.salary_structures(employee_id,basic,housing,transport,other_allowances,annual_rent,pension_enabled,nhf_enabled,nsitf_enabled,effective_from)
 values(p_employee,(p_salary->>'basic')::numeric,coalesce((p_salary->>'housing')::numeric,0),coalesce((p_salary->>'transport')::numeric,0),coalesce((p_salary->>'other_allowances')::numeric,0),coalesce((p_salary->>'annual_rent')::numeric,0),coalesce((p_salary->>'pension_enabled')::boolean,true),coalesce((p_salary->>'nhf_enabled')::boolean,true),coalesce((p_salary->>'nsitf_enabled')::boolean,true),effective);
 end $$;
-- Only the RPC may append salaries; it locks the employee and protects history.
revoke insert on salary_structures from authenticated;
create or replace function public.remove_member(p_member uuid) returns void language plpgsql security definer set search_path='' as $$ declare member public.org_members; begin
 select * into member from public.org_members where id=p_member for update;
 if member.id is null or not private.has_role(member.org_id,array['owner']) or member.role='owner' then raise exception 'Only the owner can remove non-owner members'; end if;
 update public.employees set user_id=null where user_id=member.user_id and org_id=member.org_id;
 delete from public.org_members where id=p_member;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id) values(member.org_id,auth.uid(),'remove_member','org_members',p_member); end $$;
create or replace function public.revoke_invitation(p_invitation uuid) returns void language plpgsql security definer set search_path='' as $$ declare org uuid; begin
 select org_id into org from public.invitations where id=p_invitation;
 if org is null or not private.has_role(org,array['owner']) then raise exception 'Owner permission required'; end if;
 update public.invitations set expires_at=now(),token=encode(extensions.gen_random_bytes(24),'hex') where id=p_invitation; end $$;
-- Private document uploads: all files stay in an org/employee prefix.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('staff-documents','staff-documents',false,5242880,array['application/pdf','image/jpeg','image/png']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['application/pdf','image/jpeg','image/png'];
create policy document_storage_read on storage.objects for select to authenticated using(bucket_id='staff-documents' and exists(select 1 from public.employees e where e.org_id::text=(storage.foldername(name))[1] and e.id::text=(storage.foldername(name))[2] and (private.can_read_admin(e.org_id) or e.user_id=auth.uid())));
create policy document_storage_insert on storage.objects for insert to authenticated with check(bucket_id='staff-documents' and exists(select 1 from public.employees e where e.org_id::text=(storage.foldername(name))[1] and e.id::text=(storage.foldername(name))[2] and private.is_staff_admin(e.org_id)));
create policy document_storage_delete on storage.objects for delete to authenticated using(bucket_id='staff-documents' and exists(select 1 from public.employees e where e.org_id::text=(storage.foldername(name))[1] and e.id::text=(storage.foldername(name))[2] and private.is_staff_admin(e.org_id)));


alter table org_members drop constraint if exists org_members_user_id_fkey;
alter table org_members add constraint org_members_user_id_fkey foreign key(user_id) references auth.users(id) on delete cascade;
alter table leave_requests drop constraint if exists leave_requests_reviewed_by_fkey;
alter table leave_requests add constraint leave_requests_reviewed_by_fkey foreign key(reviewed_by) references auth.users(id) on delete set null;
alter table attendance drop constraint if exists attendance_marked_by_fkey;
alter table attendance add constraint attendance_marked_by_fkey foreign key(marked_by) references auth.users(id) on delete set null;
alter table documents drop constraint if exists documents_uploaded_by_fkey;
alter table documents add constraint documents_uploaded_by_fkey foreign key(uploaded_by) references auth.users(id) on delete set null;
alter table payroll_runs drop constraint if exists payroll_runs_prepared_by_fkey;
alter table payroll_runs add constraint payroll_runs_prepared_by_fkey foreign key(prepared_by) references auth.users(id) on delete set null;
alter table payroll_runs drop constraint if exists payroll_runs_approved_by_fkey;
alter table payroll_runs add constraint payroll_runs_approved_by_fkey foreign key(approved_by) references auth.users(id) on delete set null;
alter table invitations drop constraint if exists invitations_created_by_fkey;
alter table invitations add constraint invitations_created_by_fkey foreign key(created_by) references auth.users(id) on delete set null;


create or replace function public.save_subject(p_org uuid,p_subject uuid,p_name text,p_class text,p_teachers uuid[]) returns uuid language plpgsql security definer set search_path='' as $$ declare subject uuid; teacher uuid; begin
 if not private.is_staff_admin(p_org) then raise exception 'Staff management permission required'; end if;
 if length(trim(p_name))=0 then raise exception 'Subject name required'; end if;
 if p_subject is null then insert into public.subjects(org_id,name,class_level) values(p_org,trim(p_name),nullif(p_class,'')) returning id into subject;
 else update public.subjects set name=trim(p_name),class_level=nullif(p_class,'') where id=p_subject and org_id=p_org returning id into subject; if subject is null then raise exception 'Subject not found'; end if; end if;
 delete from public.employee_subjects where subject_id=subject;
 foreach teacher in array p_teachers loop
  if not exists(select 1 from public.employees where id=teacher and org_id=p_org and status<>'exited') then raise exception 'Choose a teacher in this workspace'; end if;
  insert into public.employee_subjects(subject_id,employee_id) values(subject,teacher);
 end loop;
 insert into public.audit_events(org_id,actor_id,action,entity_type,entity_id) values(p_org,auth.uid(),'subject_saved','subjects',subject);
 return subject; end $$;


create or replace function private.prevent_tenant_move() returns trigger language plpgsql set search_path='' as $$ begin
 if new.org_id is distinct from old.org_id then raise exception 'Workspace ownership of a record cannot be changed'; end if; return new; end $$;
do $$ declare t text; begin foreach t in array array['departments','employees','attendance','documents','terms','subjects','leave_requests','payroll_runs','invitations'] loop
 execute format('create trigger tenant_immutable before update on public.%I for each row execute function private.prevent_tenant_move()',t); end loop; end $$;

-- RPC permissions: default EXECUTE grants are not trusted.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind='f' and p.proname in
 ('has_role','is_staff_admin','is_finance','can_read_admin','my_org_ids','check_tenant','audit_change','prevent_tenant_move','create_workspace','create_invitation','accept_invitation','annual_paye','prepare_payroll','transition_payroll','record_payroll_export','rotate_payslip_link','get_public_payslip','review_leave','request_my_leave','employee_portal','delete_workspace','import_employees','save_salary','remove_member','revoke_invitation','save_subject') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.signature::text not like '%check_tenant%' and f.signature::text not like '%audit_change%' and f.signature::text not like '%annual_paye%' and f.signature::text not like '%prevent_tenant_move%' then execute format('grant execute on function %s to authenticated',f.signature); end if;
 end loop;
end $$;
grant execute on function public.get_public_payslip(text) to anon;
commit;
