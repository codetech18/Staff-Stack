-- Run this if you already ran schema.sql before subject tracking was added.
-- Safe to run once.

create table if not exists subjects (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organisations(id) on delete cascade not null,
  name         text not null,
  class_level  text,
  created_at   timestamptz default now()
);

create table if not exists employee_subjects (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid references employees(id) on delete cascade not null,
  subject_id   uuid references subjects(id) on delete cascade not null,
  created_at   timestamptz default now(),
  unique(employee_id, subject_id)
);

alter table subjects enable row level security;
alter table employee_subjects enable row level security;

drop policy if exists "member all subjects" on subjects;
create policy "member all subjects" on subjects for all using (org_id in (select my_org_ids()));

drop policy if exists "member all employee_subjects" on employee_subjects;
create policy "member all employee_subjects" on employee_subjects for all
  using (subject_id in (select id from subjects where org_id in (select my_org_ids())));
