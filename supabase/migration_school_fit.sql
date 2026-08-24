-- Run this in the Supabase SQL Editor.
-- Bundles every schema change needed to fit StaffStack to how a typical
-- Nigerian private school actually operates. Safe to run once.

-- 1. Teaching vs non-teaching split
alter table employees add column if not exists staff_category text not null default 'teaching'
  check (staff_category in ('teaching', 'non_teaching'));

-- 2. NYSC Corper as an employment type
alter table employees drop constraint if exists employees_employment_type_check;
alter table employees add constraint employees_employment_type_check
  check (employment_type in ('full-time', 'contract', 'part-time', 'nysc'));

-- 3. Leave types that match how Nigerian schools actually talk about leave
--    (drops "casual", adds "study" and "compassionate")
alter table leave_requests drop constraint if exists leave_requests_leave_type_check;
alter table leave_requests add constraint leave_requests_leave_type_check
  check (leave_type in ('annual', 'sick', 'maternity', 'study', 'compassionate'));

-- 4. Term dates — so Attendance can tell a real absence apart from a normal
--    school break, instead of assuming every weekday is a school day.
create table if not exists terms (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  name         text not null,          -- e.g. "First Term 2026/2027"
  start_date   date not null,
  end_date     date not null,
  created_at   timestamptz default now()
);

alter table terms enable row level security;

drop policy if exists "member all terms" on terms;
create policy "member all terms" on terms for all using (org_id in (select my_org_ids()));
