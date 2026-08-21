export type Org = {
  id: string
  name: string
  slug: string
  industry: string | null
  state: string
  salary_day: number
  owner_id: string
}

export type Department = { id: string; org_id: string; name: string }

export type Employee = {
  id: string
  org_id: string
  department_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  role: string
  employment_type: 'full-time' | 'contract' | 'part-time'
  start_date: string
  status: 'active' | 'on-leave' | 'exited'
  bank_name: string | null
  bank_code: string | null
  account_number: string | null
  account_name: string | null
  departments?: { name: string } | null
  salary_structures?: SalaryStructure[]
}

export type SalaryStructure = {
  id: string
  employee_id: string
  basic: number
  housing: number
  transport: number
  other_allowances: number
  annual_rent: number
  pension_enabled: boolean
  nhf_enabled: boolean
  nsitf_enabled: boolean
  effective_from: string
}

export type PayrollRun = {
  id: string
  org_id: string
  period_month: number
  period_year: number
  status: 'draft' | 'processed' | 'paid'
  gross_total: number
  net_total: number
  total_paye: number
  total_pension_employee: number
  total_pension_employer: number
  total_nhf: number
  total_nsitf: number
}

export type Payslip = {
  id: string
  payroll_run_id: string
  employee_id: string
  gross: number
  basic: number
  housing: number
  transport: number
  other_allowances: number
  paye: number
  pension_employee: number
  pension_employer: number
  nhf: number
  total_deductions: number
  net_pay: number
  token: string
  employees?: Employee
}

export type LeaveRequest = {
  id: string
  org_id: string
  employee_id: string
  leave_type: 'annual' | 'sick' | 'casual' | 'maternity'
  start_date: string
  end_date: string
  days: number
  reason: string | null
  status: 'pending' | 'approved' | 'declined'
  employees?: Employee
}

export type AttendanceRecord = {
  id: string
  org_id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  status: 'present' | 'absent' | 'late' | 'leave' | 'holiday'
  employees?: Employee
}

export type Subject = {
  id: string
  org_id: string
  name: string
  class_level: string | null
  employee_subjects?: { employee_id: string; employees?: Employee }[]
}

export type EmployeeSubject = {
  id: string
  employee_id: string
  subject_id: string
  subjects?: Subject
}
