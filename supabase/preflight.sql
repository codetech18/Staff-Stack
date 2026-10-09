-- Read-only checks before reconciling an existing database with the baseline.
-- Run on a staging restore first. Resolve failures with the data owner.
select tablename from pg_tables where schemaname='public' order by tablename;
select table_name,column_name,data_type from information_schema.columns where table_schema='public' order by table_name,ordinal_position;
select org_id,lower(email) as email,count(*) from employees where email is not null and email<>'' group by org_id,lower(email) having count(*)>1;
select id,employee_id from salary_structures where basic<0 or housing<0 or transport<0 or other_allowances<0 or annual_rent<0;
select id from leave_requests where end_date<start_date or days<=0;
select id from terms where end_date<start_date;
select id from organisations where salary_day not between 1 and 28;
select id from employees where account_number is not null and account_number !~ '^[0-9]{10}$';
select m.id,m.org_id,m.user_id,m.role,o.owner_id from org_members m join organisations o on o.id=m.org_id where m.user_id<>o.owner_id;
select e.id,e.org_id,d.org_id as department_org from employees e join departments d on d.id=e.department_id where e.org_id<>d.org_id;
select l.id from leave_requests l join employees e on e.id=l.employee_id where l.org_id<>e.org_id;
select schemaname,tablename,policyname,cmd,qual,with_check from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname;
