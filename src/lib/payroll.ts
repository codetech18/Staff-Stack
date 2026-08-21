/**
 * StaffStack Payroll Engine
 * Nigerian statutory calculations — updated for the Nigeria Tax Act 2025
 * (effective 1 January 2026).
 *
 * Key NTA 2025 changes from the old PITA regime:
 *   - CRA (Consolidated Relief Allowance) is abolished.
 *   - New 0%–25% band structure with a ₦800,000 annual tax-free band.
 *   - Rent relief replaces CRA: 20% of annual rent paid, capped at ₦500,000.
 *   - The old 1% minimum tax rule is abolished.
 *   - Employees on the national minimum wage (₦70,000/month, ₦840,000/year
 *     or less) are fully PAYE-exempt.
 *
 * Pension, NHF, and NSITF are now OPT-IN per employee — set by the employer
 * on each staff member's salary structure. Not every teacher or contract
 * staff member is enrolled in every scheme, so nothing is deducted unless
 * the employer explicitly switches it on for that person.
 *
 * All inputs/outputs are MONTHLY naira amounts unless stated otherwise.
 */

export type DeductionToggles = {
  pension_enabled: boolean
  nhf_enabled: boolean
  nsitf_enabled: boolean // employer-side cost, still toggleable per employee
}

export type SalaryInput = {
  basic: number
  housing: number
  transport: number
  other_allowances: number
  /** Annual rent paid by the employee, used for rent relief. Optional — defaults to 0. */
  annual_rent?: number
} & DeductionToggles

export type PayslipCalc = {
  gross: number
  paye: number
  pension_employee: number
  pension_employer: number
  nhf: number
  nsitf: number // employer cost, not deducted from employee
  total_deductions: number
  net_pay: number
}

/** NTA 2025 annual chargeable-income bands (0%–25%) */
const TAX_BANDS = [
  { upTo: 800_000, rate: 0.0 },
  { upTo: 3_000_000, rate: 0.15 },
  { upTo: 12_000_000, rate: 0.18 },
  { upTo: 25_000_000, rate: 0.21 },
  { upTo: 50_000_000, rate: 0.23 },
  { upTo: Infinity, rate: 0.25 },
]

const MINIMUM_WAGE_ANNUAL_EXEMPTION = 840_000 // ₦70,000/month × 12

/**
 * Annual PAYE under the Nigeria Tax Act 2025:
 *   1. Employees on ≤ ₦840,000/year (minimum wage) pay zero PAYE.
 *   2. Rent relief = min(20% of annual rent paid, ₦500,000).
 *   3. Taxable income = annual gross − annual pension (if enrolled) − rent relief.
 *   4. Apply the six progressive bands (0%–25%) to taxable income.
 */
export function calculateAnnualPAYE(
  annualGross: number,
  annualPensionEmployee: number,
  annualRentPaid: number = 0,
): number {
  if (annualGross <= 0) return 0
  if (annualGross <= MINIMUM_WAGE_ANNUAL_EXEMPTION) return 0

  const rentRelief = Math.min(annualRentPaid * 0.2, 500_000)
  const taxable = Math.max(0, annualGross - annualPensionEmployee - rentRelief)

  let remaining = taxable
  let lastCap = 0
  let tax = 0
  for (const band of TAX_BANDS) {
    if (remaining <= 0) break
    const bandWidth = band.upTo - lastCap
    const slice = Math.min(remaining, bandWidth)
    tax += slice * band.rate
    remaining -= slice
    lastCap = band.upTo
  }
  return tax
}

/** Full monthly payslip calculation from a salary structure + per-employee deduction toggles. */
export function calculatePayslip(s: SalaryInput): PayslipCalc {
  const gross = s.basic + s.housing + s.transport + s.other_allowances
  const annualGross = gross * 12
  const annualRent = s.annual_rent ?? 0

  // Pension (PRA 2014) — only if this employee is enrolled
  const pensionBase = s.basic + s.housing + s.transport
  const pension_employee = s.pension_enabled ? round2(pensionBase * 0.08) : 0
  const pension_employer = s.pension_enabled ? round2(pensionBase * 0.1) : 0

  // PAYE — pension relief only applies if actually deducted
  const annualPAYE = calculateAnnualPAYE(annualGross, pension_employee * 12, annualRent)
  const paye = round2(annualPAYE / 12)

  // NHF — only if enrolled
  const nhf = s.nhf_enabled ? round2(s.basic * 0.025) : 0

  // NSITF — employer cost, only if this employee is covered
  const nsitf = s.nsitf_enabled ? round2(gross * 0.01) : 0

  const total_deductions = round2(paye + pension_employee + nhf)
  const net_pay = round2(gross - total_deductions)

  return { gross, paye, pension_employee, pension_employer, nhf, nsitf, total_deductions, net_pay }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
