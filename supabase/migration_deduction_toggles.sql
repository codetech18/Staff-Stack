-- Run this if you already executed schema.sql before the deduction-toggle update.
-- Safe to run multiple times.

alter table salary_structures add column if not exists annual_rent numeric not null default 0;
alter table salary_structures add column if not exists pension_enabled boolean not null default true;
alter table salary_structures add column if not exists nhf_enabled boolean not null default true;
alter table salary_structures add column if not exists nsitf_enabled boolean not null default true;
