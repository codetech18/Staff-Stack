import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { naira, MONTHS } from '@/lib/format'
import { calculatePayslip } from '@/lib/payroll'
import { generateBankCSV, downloadCSV } from '@/lib/banks'
import { StatCard, Avatar, Badge, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import type { Employee, PayrollRun, Payslip } from '@/types'

export default function Payroll() {
  const { org } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [run, setRun] = useState<PayrollRun | null>(null)
  const [slips, setSlips] = useState<Payslip[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState('')

  const load = async () => {
    if (!org) return
    setLoading(true)
    const [r, e] = await Promise.all([
      supabase.from('payroll_runs').select('*').eq('org_id', org.id)
        .eq('period_month', month).eq('period_year', year).maybeSingle(),
      supabase.from('employees').select('*, salary_structures(*)')
        .eq('org_id', org.id).eq('status', 'active'),
    ])
    setRun(r.data as PayrollRun | null)
    setEmployees((e.data ?? []) as Employee[])
    if (r.data) {
      const s = await supabase.from('payslips').select('*, employees(*)').eq('payroll_run_id', r.data.id)
      setSlips((s.data ?? []) as Payslip[])
    } else setSlips([])
    setLoading(false)
  }
  useEffect(() => { load() }, [org?.id, month, year])

  const runPayroll = async () => {
    if (!org || employees.length === 0) return
    setBusy(true)

    const results = employees.map(emp => {
      const s = [...(emp.salary_structures ?? [])].sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
      if (!s) return null
      const calc = calculatePayslip({
        pension_enabled: s.pension_enabled, nhf_enabled: s.nhf_enabled, nsitf_enabled: s.nsitf_enabled,
        annual_rent: Number(s.annual_rent) || 0,
        basic: Number(s.basic), housing: Number(s.housing),
        transport: Number(s.transport), other_allowances: Number(s.other_allowances),
      })
      return { emp, s, calc }
    }).filter(Boolean) as { emp: Employee; s: NonNullable<Employee['salary_structures']>[0]; calc: ReturnType<typeof calculatePayslip> }[]

    const totals = results.reduce((acc, r) => ({
      gross: acc.gross + r.calc.gross,
      net: acc.net + r.calc.net_pay,
      paye: acc.paye + r.calc.paye,
      pe: acc.pe + r.calc.pension_employee,
      pr: acc.pr + r.calc.pension_employer,
      nhf: acc.nhf + r.calc.nhf,
      nsitf: acc.nsitf + r.calc.nsitf,
    }), { gross: 0, net: 0, paye: 0, pe: 0, pr: 0, nhf: 0, nsitf: 0 })

    const { data: newRun, error } = await supabase.from('payroll_runs').upsert({
      org_id: org.id, period_month: month, period_year: year,
      status: 'processed', processed_at: new Date().toISOString(),
      gross_total: totals.gross, net_total: totals.net,
      total_paye: totals.paye, total_pension_employee: totals.pe,
      total_pension_employer: totals.pr, total_nhf: totals.nhf, total_nsitf: totals.nsitf,
    }, { onConflict: 'org_id,period_month,period_year' }).select().single()

    if (error || !newRun) { setBusy(false); return }

    // replace payslips for this run
    await supabase.from('payslips').delete().eq('payroll_run_id', newRun.id)
    await supabase.from('payslips').insert(results.map(r => ({
      payroll_run_id: newRun.id, employee_id: r.emp.id,
      gross: r.calc.gross,
      basic: Number(r.s.basic), housing: Number(r.s.housing),
      transport: Number(r.s.transport), other_allowances: Number(r.s.other_allowances),
      paye: r.calc.paye, pension_employee: r.calc.pension_employee,
      pension_employer: r.calc.pension_employer, nhf: r.calc.nhf,
      total_deductions: r.calc.total_deductions, net_pay: r.calc.net_pay,
    })))

    setBusy(false)
    load()
  }

  const markPaid = async () => {
    if (!run) return
    await supabase.from('payroll_runs').update({ status: 'paid' }).eq('id', run.id)
    load()
  }

  const sendPayslips = async () => {
    if (!run) return
    setSending(true); setSendResult('')
    const { data, error } = await supabase.functions.invoke('send-payslips', {
      body: { payroll_run_id: run.id },
    })
    setSending(false)
    if (error) return setSendResult('Could not send — check the edge function is deployed.')
    setSendResult(`Sent ${data.sent} payslip${data.sent === 1 ? '' : 's'}${data.skipped ? ` · ${data.skipped} skipped (no email)` : ''}`)
    load()
  }

  const exportCSV = (format: 'gtbank' | 'access' | 'zenith') => {
    const rows = slips
      .filter(s => s.employees?.account_number)
      .map(s => ({
        account_number: s.employees!.account_number!,
        account_name: s.employees!.account_name ?? `${s.employees!.first_name} ${s.employees!.last_name}`,
        bank_code: s.employees!.bank_code ?? '',
        bank_name: s.employees!.bank_name ?? '',
        amount: s.net_pay,
        narration: `Salary ${MONTHS[month - 1]} ${year}`,
      }))
    if (rows.length === 0) return alert('No staff have bank details yet. Add account numbers on the Staff page.')
    downloadCSV(generateBankCSV(rows, format), `staffstack-${format}-${year}-${String(month).padStart(2, '0')}.csv`)
  }

  return (
    <>
      <PageHeader
        title="Payroll"
        actions={
          <div className="flex items-center gap-2">
            <select className="input !w-auto !py-1.5 text-xs" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className="input !w-auto !py-1.5 text-xs" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn-primary" onClick={runPayroll} disabled={busy || employees.length === 0}>
              {busy ? 'Calculating…' : run ? 'Re-run payroll' : 'Run payroll'}
            </button>
          </div>
        }
      />
      <div className="p-6">
        {loading ? <Spinner /> : !run ? (
          <div className="panel">
            <EmptyState
              icon="₦"
              text={employees.length === 0
                ? 'Add staff with salary structures first, then run payroll.'
                : `No payroll run for ${MONTHS[month - 1]} ${year} yet. Click "Run payroll" to calculate PAYE, pension, NHF and net pay for all ${employees.length} active staff.`}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard label="Gross payroll" value={naira(run.gross_total)} sub={`${slips.length} employees · ${MONTHS[month - 1]} ${year}`} />
              <StatCard label="Total deductions" value={naira(run.total_paye + run.total_pension_employee + run.total_nhf)} sub="PAYE + Pension + NHF" />
              <StatCard label="Net payout" value={naira(run.net_total)} valueClass="text-ok" sub={run.status === 'paid' ? 'Marked as paid ✓' : 'Ready for bank transfer'} />
            </div>

            <div className="grid lg:grid-cols-[1fr_340px] gap-4">
              <div className="panel">
                <div className="panel-head">
                  <div className="panel-title">Staff payroll — {MONTHS[month - 1]} {year}</div>
                  {run.status !== 'paid' && <button className="text-[11px] text-accent font-medium" onClick={markPaid}>Mark as paid</button>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface2">
                        {['Employee', 'Gross', 'Deductions', 'Net pay'].map(h => (
                          <th key={h} className="text-left font-mono text-[9px] uppercase tracking-widest text-mut px-4 py-2.5 border-b border-line">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slips.map(s => (
                        <tr key={s.id} className="hover:bg-surface2 transition-colors">
                          <td className="px-4 py-3 border-b border-line">
                            <div className="flex items-center gap-2.5">
                              <Avatar first={s.employees?.first_name ?? '?'} last={s.employees?.last_name ?? '?'} size={28} />
                              <div>
                                <div className="text-[13px] font-semibold text-white">{s.employees?.first_name} {s.employees?.last_name}</div>
                                <div className="text-[11px] text-mut">{s.employees?.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-line font-mono text-xs">{naira(s.gross)}</td>
                          <td className="px-4 py-3 border-b border-line font-mono text-xs text-danger">−{naira(s.total_deductions)}</td>
                          <td className="px-4 py-3 border-b border-line font-display font-bold text-white text-[13px]">{naira(s.net_pay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="panel">
                  <div className="panel-head"><div className="panel-title">Payslip delivery</div></div>
                  <div className="p-4">
                    <button className="btn-primary w-full justify-center py-2.5" onClick={sendPayslips} disabled={sending}>
                      {sending ? 'Sending…' : '✉ Send payslips by email'}
                    </button>
                    {sendResult && <div className="text-[11px] text-ok mt-2 text-center">{sendResult}</div>}
                    <div className="text-[10px] text-mut mt-2 leading-relaxed">
                      Every employee with an email gets a secure payslip link. Already-sent payslips are skipped automatically.
                    </div>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-head"><div className="panel-title">Deduction breakdown</div></div>
                  {[
                    ['PAYE tax', run.total_paye],
                    ['Pension — employee 8%', run.total_pension_employee],
                    ['Pension — employer 10%', run.total_pension_employer],
                    ['NHF 2.5%', run.total_nhf],
                    ['NSITF 1% (employer)', run.total_nsitf],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between px-4 py-2.5 border-b border-line last:border-0">
                      <span className="text-xs text-mut2">{label as string}</span>
                      <span className="font-mono text-xs">{naira(value as number)}</span>
                    </div>
                  ))}
                </div>

                <div className="panel">
                  <div className="panel-head"><div className="panel-title">Bank transfer export</div></div>
                  <div className="p-4 flex flex-col gap-2">
                    <button className="btn-ghost w-full justify-center py-2.5" onClick={() => exportCSV('gtbank')}>GTBank bulk CSV</button>
                    <button className="btn-ghost w-full justify-center py-2.5" onClick={() => exportCSV('access')}>Access Bank CSV</button>
                    <button className="btn-ghost w-full justify-center py-2.5" onClick={() => exportCSV('zenith')}>Zenith Bank CSV</button>
                    <div className="text-[10px] text-mut mt-1 leading-relaxed">
                      Upload the CSV to your internet banking bulk transfer page, then mark this payroll as paid.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
