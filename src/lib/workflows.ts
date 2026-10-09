import type { Employee, SalaryStructure } from '@/types'
export type MemberRole = 'owner' | 'hr_manager' | 'payroll_manager' | 'employee' | 'auditor'
export const canManagePeople = (role: MemberRole | null) =>
  role === 'owner' || role === 'hr_manager'
export const canManagePayroll = (role: MemberRole | null) =>
  role === 'owner' || role === 'payroll_manager'
export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
export function salaryForPeriod(
  employee: Employee,
  month: number,
  year: number
): SalaryStructure | undefined {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  return [...(employee.salary_structures ?? [])]
    .filter((s) => s.effective_from <= first)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
}
export function payrollChecks(employees: Employee[], month: number, year: number) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`,
    last = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  const eligible = employees.filter(
    (e) =>
      e.start_date <= last &&
      (!e.end_date || e.end_date >= first) &&
      (e.status !== 'exited' || e.end_date)
  )
  const errors: string[] = employees
      .filter((e) => e.status === 'exited' && !e.end_date && e.start_date <= last)
      .map((e) => `${e.first_name} ${e.last_name}: record the employment end date.`),
    warnings: string[] = []
  for (const e of eligible) {
    const name = `${e.first_name} ${e.last_name}`
    if (!salaryForPeriod(e, month, year))
      errors.push(`${name}: no salary effective at the start of this month.`)
    if (e.start_date > first || (e.end_date && e.end_date < last))
      errors.push(`${name}: partial-month employment requires a reviewed adjustment.`)
    if (e.salary_structures?.some((s) => s.effective_from > first && s.effective_from <= last))
      errors.push(`${name}: mid-month salary change requires a reviewed adjustment.`)
    if (!e.account_number || !/^\d{10}$/.test(e.account_number) || !e.bank_code || !e.account_name)
      warnings.push(`${name}: complete bank details before approval.`)
  }
  return { eligible, errors, warnings }
}
export function workingDays(start: string, end: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    end < start ||
    start.slice(0, 4) !== end.slice(0, 4)
  )
    return 0
  let count = 0
  for (
    let d = new Date(`${start}T12:00:00Z`);
    d <= new Date(`${end}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)
  )
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) count++
  return count
}
