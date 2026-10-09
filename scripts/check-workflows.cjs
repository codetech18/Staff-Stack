const assert = require('node:assert/strict')
const { build } = require('esbuild')
const { mkdtempSync, rmSync } = require('node:fs'),
  { tmpdir } = require('node:os'),
  { join } = require('node:path')
const dir = mkdtempSync(join(tmpdir(), 'staffstack-unit-'))
async function run() {
  for (const name of ['payroll', 'workflows', 'import', 'banks'])
    await build({
      entryPoints: [`src/lib/${name}.ts`],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: join(dir, name + '.cjs'),
    })
  const { calculatePayslip, calculateAnnualPAYE } = require(join(dir, 'payroll.cjs'))
  const { salaryForPeriod, payrollChecks, workingDays, localDate } = require(
    join(dir, 'workflows.cjs')
  )
  const { parseCSV, validateImport } = require(join(dir, 'import.cjs'))
  const { generateBankCSV } = require(join(dir, 'banks.cjs'))
  assert.equal(calculateAnnualPAYE(840000, 0, 0), 0)
  assert.equal(calculateAnnualPAYE(3000000, 0, 0), 330000)
  assert.equal(calculateAnnualPAYE(12000000, 0, 0), 1950000)
  assert.equal(calculateAnnualPAYE(25000000, 0, 0), 4680000)
  assert.equal(calculateAnnualPAYE(50000000, 0, 0), 10430000)
  assert.equal(calculateAnnualPAYE(51000000, 0, 0), 10680000)
  const base = {
    basic: 180000,
    housing: 75000,
    transport: 45000,
    other_allowances: 0,
    annual_rent: 900000,
    pension_enabled: true,
    nhf_enabled: true,
    nsitf_enabled: true,
  }
  const calc = calculatePayslip(base)
  assert.equal(calc.gross, 300000)
  assert.equal(calc.paye, 28670)
  assert.equal(calc.nhf, 4500)
  assert.equal(calc.net_pay, 242830)
  const off = calculatePayslip({
    ...base,
    pension_enabled: false,
    nhf_enabled: false,
    nsitf_enabled: false,
  })
  assert.equal(off.total_deductions, off.paye)
  assert.throws(() => calculatePayslip({ ...base, basic: -1 }), /non-negative/)
  assert.throws(() => calculatePayslip({ ...base, transport: Infinity }), /finite/)
  assert.equal(
    calculateAnnualPAYE(3600000, 0, 2500000),
    calculateAnnualPAYE(3600000, 0, 9000000),
    'Rent relief capped'
  )
  const e = {
    id: 'e',
    first_name: 'Ada',
    last_name: 'Okafor',
    status: 'on-leave',
    start_date: '2024-01-01',
    bank_code: '058',
    account_number: '0123456789',
    account_name: 'Ada',
    salary_structures: [
      { ...base, id: 'old', effective_from: '2026-01-01' },
      { ...base, id: 'future', effective_from: '2027-01-01', basic: 300000 },
    ],
  }
  assert.equal(salaryForPeriod(e, 10, 2026).id, 'old')
  assert.equal(payrollChecks([e], 10, 2026).eligible.length, 1)
  assert.equal(payrollChecks([{ ...e, start_date: '2026-10-15' }], 10, 2026).errors.length, 1)
  assert.equal(payrollChecks([{ ...e, salary_structures: [] }], 10, 2026).errors.length, 1)
  assert.equal(workingDays('2026-11-02', '2026-11-06'), 5)
  assert.equal(workingDays('2026-11-07', '2026-11-08'), 0)
  assert.equal(workingDays('2026-12-31', '2027-01-02'), 0)
  assert.equal(localDate(new Date('2026-10-08T23:30:00Z')), '2026-10-09')
  assert.deepEqual(parseCSV('name,role\r\n"Ada, A","Teacher ""Lead"""\r\n'), [
    ['name', 'role'],
    ['Ada, A', 'Teacher "Lead"'],
  ])
  assert.throws(() => parseCSV('"unterminated'), /Unclosed/)
  const header = 'first_name,last_name,email,role,start_date,basic'
  assert.equal(
    validateImport(header + '\nAda,Okafor,ada@example.com,Teacher,2026-09-01,180000').errors.length,
    0
  )
  assert.ok(
    validateImport(header + '\nAda,Okafor,invalid,Teacher,2026-02-30,-1').errors.length >= 3
  )
  const csv = generateBankCSV(
    [
      {
        account_number: '0123456789',
        bank_code: '058',
        account_name: '=HYPERLINK("x")',
        bank_name: 'GTBank',
        amount: 242830,
        narration: 'Salary, October',
      },
    ],
    'gtbank'
  )
  assert.ok(csv.includes('242830.00'))
  assert.ok(csv.includes("'=HYPERLINK"))
  assert.ok(csv.includes('""x""'))
  assert.throws(
    () => generateBankCSV([{ account_number: 'bad', bank_code: '058', amount: 10 }], 'gtbank'),
    /Invalid/
  )
  console.log(
    'PASS: tax boundaries, deductions, rounding, rent cap, invalid amounts, effective salaries, paid leave, partial periods, Lagos dates, leave days, CSV parsing/validation, and export injection protection.'
  )
}
run()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }))
