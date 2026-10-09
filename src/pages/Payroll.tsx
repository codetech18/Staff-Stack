import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { naira, MONTHS } from '@/lib/format'
import { calculatePayslip } from '@/lib/payroll'
import { generateBankCSV, downloadCSV } from '@/lib/banks'
import { StatCard, Avatar, Badge, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { canManagePayroll, payrollChecks } from '@/lib/workflows'
import Feedback from '@/components/ui/Feedback'
import { isDemo } from '@/lib/demo'
import type { Employee, PayrollRun, Payslip } from '@/types'

export default function Payroll() {
  const { org, role, mfaVerified } = useAuth()
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
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reference, setReference] = useState('')
  const permitted = canManagePayroll(role) && mfaVerified

  const load = async () => {
    if (!org) return
    setLoading(true)
    const [r, e] = await Promise.all([
      supabase
        .from('payroll_runs')
        .select('*')
        .eq('org_id', org.id)
        .eq('period_month', month)
        .eq('period_year', year)
        .maybeSingle(),
      supabase.from('employees').select('*, salary_structures(*)').eq('org_id', org.id),
    ])
    if (r.error || e.error)
      setError(r.error?.message ?? e.error?.message ?? 'Could not load payroll')
    setRun(r.data as PayrollRun | null)
    setEmployees((e.data ?? []) as Employee[])
    if (r.data) {
      const s = await supabase
        .from('payslips')
        .select('*, employees(*)')
        .eq('payroll_run_id', r.data.id)
      if (s.error) setError(s.error.message)
      setSlips(
        ((s.data ?? []) as Payslip[]).map((s) => ({
          ...s,
          employees: s.employee_snapshot ?? s.employees,
        }))
      )
    } else setSlips([])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [org?.id, month, year])

  const checks = payrollChecks(employees, month, year)
  const action = async (name: string, args: Record<string, unknown>, success: string) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { error } = await supabase.rpc(name, args)
      if (error) throw error
      setNotice(success)
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const runPayroll = () =>
    action(
      'prepare_payroll',
      { p_org: org?.id, p_month: month, p_year: year },
      'Draft prepared. Review every payslip before submitting.'
    )
  const transition = (status: string) =>
    action(
      'transition_payroll',
      { p_run: run?.id, p_status: status, p_reference: reference || null },
      `Payroll moved to ${status}.`
    )

  const sendPayslips = async () => {
    if (!run) return
    setSending(true)
    setSendResult('')
    const { data, error } = await supabase.functions.invoke('send-payslips', {
      body: { payroll_run_id: run.id },
    })
    setSending(false)
    if (error)
      return setError(isDemo ? 'Email delivery is disabled in the local demo.' : error.message)
    setSendResult(
      `Sent ${data.sent} payslip${data.sent === 1 ? '' : 's'}${data.skipped ? ` · ${data.skipped} skipped` : ''}${data.failed ? ` · ${data.failed} failed; retry delivery` : ''}`
    )
    load()
  }

  const exportCSV = async (format: 'gtbank' | 'access' | 'zenith') => {
    if (!run || !permitted) return
    const { error: exportError } = await supabase.rpc('record_payroll_export', { p_run: run.id })
    if (exportError) return setError(exportError.message)
    const rows = slips
      .filter((s) => s.employees?.account_number)
      .map((s) => ({
        account_number: s.employees!.account_number!,
        account_name:
          s.employees!.account_name ?? `${s.employees!.first_name} ${s.employees!.last_name}`,
        bank_code: s.employees!.bank_code ?? '',
        bank_name: s.employees!.bank_name ?? '',
        amount: s.net_pay,
        narration: `Salary ${MONTHS[month - 1]} ${year}`,
      }))
    if (rows.length === 0)
      return alert('No staff have bank details yet. Add account numbers on the Staff page.')
    try {
      downloadCSV(
        generateBankCSV(rows, format),
        `staffstack-${format}-${year}-${String(month).padStart(2, '0')}.csv`
      )
      setNotice('Bank CSV downloaded. Verify the bank import preview before authorising payment.')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader
        title="Payroll"
        actions={
          <div className="flex items-center gap-2">
            <select
              className="input !w-auto !py-1.5 text-xs"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="input !w-auto !py-1.5 text-xs"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              className="btn-primary"
              onClick={runPayroll}
              disabled={
                busy ||
                !permitted ||
                checks.eligible.length === 0 ||
                checks.errors.length > 0 ||
                (!!run && run.status !== 'draft')
              }
            >
              {busy ? 'Calculating…' : run ? 'Recalculate draft' : 'Prepare draft'}
            </button>
          </div>
        }
      />
      <div className="p-6">
        {canManagePayroll(role) && !mfaVerified && (
          <div className="panel p-4 mb-4 text-xs text-warn">
            Complete two-step verification in Settings to prepare or approve payroll.
          </div>
        )}
        <Feedback message={error} error />
        <Feedback message={notice} />
        <div className="panel p-4 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              Payroll preparation · {checks.eligible.length} eligible people
            </div>
            {run && (
              <Badge tone={run.status === 'paid' || run.status === 'approved' ? 'ok' : 'warn'}>
                {run.status}
              </Badge>
            )}
          </div>
          <p className="text-xs text-mut mt-2">
            Paid leave is included. Salary is selected at the start of the chosen period. Submitted
            payroll is locked.
          </p>
          {isDemo && (
            <p className="text-xs text-mut mt-2">
              Demo approval simulates a second administrator. Production requires a different person
              to approve.
            </p>
          )}
          {checks.errors.length > 0 && (
            <ul className="text-xs text-danger mt-3 space-y-1">
              {checks.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {checks.warnings.length > 0 && (
            <ul className="text-xs text-warn mt-3 space-y-1">
              {checks.warnings.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {run && permitted && (
            <div className="flex flex-wrap gap-2 mt-4">
              {run.status === 'draft' && (
                <button
                  className="btn-primary"
                  disabled={busy || checks.errors.length > 0}
                  onClick={() => transition('review')}
                >
                  Submit for review
                </button>
              )}
              {run.status === 'review' && (
                <>
                  <button className="btn-ghost" disabled={busy} onClick={() => transition('draft')}>
                    Return to draft
                  </button>
                  <button
                    className="btn-primary"
                    disabled={busy || checks.warnings.length > 0}
                    onClick={() => transition('approved')}
                  >
                    Approve payroll
                  </button>
                </>
              )}
              {run.status === 'approved' && (
                <>
                  <input
                    className="input !w-60"
                    aria-label="Bank payment reference"
                    placeholder="Bank payment reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                  <button
                    className="btn-primary"
                    disabled={busy || reference.trim().length < 3}
                    onClick={() => transition('paid')}
                  >
                    Record completed payment
                  </button>
                </>
              )}
              {run.status === 'paid' && (
                <span className="text-xs text-ok">
                  Locked financial record · {run.payment_reference ?? 'Legacy payment'}
                </span>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <Spinner />
        ) : !run ? (
          <div className="panel">
            <EmptyState
              icon="₦"
              text={
                employees.length === 0
                  ? 'Add staff with salary structures first, then run payroll.'
                  : `No payroll run for ${MONTHS[month - 1]} ${year} yet. Click "Run payroll" to calculate PAYE, pension, NHF and net pay for all ${employees.length} active staff.`
              }
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard
                label="Gross payroll"
                value={naira(run.gross_total)}
                sub={`${slips.length} employees · ${MONTHS[month - 1]} ${year}`}
              />
              <StatCard
                label="Total deductions"
                value={naira(run.total_paye + run.total_pension_employee + run.total_nhf)}
                sub="PAYE + Pension + NHF"
              />
              <StatCard
                label="Net payout"
                value={naira(run.net_total)}
                valueClass="text-ok"
                sub={run.status === 'paid' ? 'Marked as paid ✓' : 'Ready for bank transfer'}
              />
            </div>

            <div className="grid lg:grid-cols-[1fr_340px] gap-4">
              <div className="panel">
                <div className="panel-head">
                  <div className="panel-title">
                    Staff payroll — {MONTHS[month - 1]} {year}
                  </div>
                  <span className="text-[10px] text-mut">
                    {run.calculation_version ?? 'Legacy calculation'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface2">
                        {['Employee', 'Gross', 'Deductions', 'Net pay', 'Payslip link'].map((h) => (
                          <th
                            key={h}
                            className="text-left font-mono text-[9px] uppercase tracking-widest text-mut px-4 py-2.5 border-b border-line"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slips.map((s) => (
                        <tr key={s.id} className="hover:bg-surface2 transition-colors">
                          <td className="px-4 py-3 border-b border-line">
                            <div className="flex items-center gap-2.5">
                              <Avatar
                                first={s.employees?.first_name ?? '?'}
                                last={s.employees?.last_name ?? '?'}
                                size={28}
                              />
                              <div>
                                <div className="text-[13px] font-semibold text-ink">
                                  {s.employees?.first_name} {s.employees?.last_name}
                                </div>
                                <div className="text-[11px] text-mut">{s.employees?.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-b border-line font-mono text-xs">
                            {naira(s.gross)}
                          </td>
                          <td className="px-4 py-3 border-b border-line font-mono text-xs text-danger">
                            −{naira(s.total_deductions)}
                          </td>
                          <td className="px-4 py-3 border-b border-line font-display font-bold text-ink text-[13px]">
                            {naira(s.net_pay)}
                          </td>
                          <td className="px-4 py-3 border-b border-line">
                            <div className="flex gap-2">
                              {permitted && ['approved', 'paid'].includes(run.status) && (
                                <>
                                  <button
                                    className="text-xs text-accent"
                                    onClick={async () => {
                                      const { data, error } = await supabase.rpc(
                                        'rotate_payslip_link',
                                        { p_slip: s.id, p_revoke: false }
                                      )
                                      if (error) setError(error.message)
                                      else {
                                        await navigator.clipboard.writeText(
                                          `${location.origin}/payslip/${data}`
                                        )
                                        setNotice(
                                          'New 30-day link copied. The old link is invalid.'
                                        )
                                      }
                                    }}
                                  >
                                    Copy new link
                                  </button>
                                  <button
                                    className="text-xs text-danger"
                                    onClick={() =>
                                      action(
                                        'rotate_payslip_link',
                                        { p_slip: s.id, p_revoke: true },
                                        'Payslip link revoked.'
                                      )
                                    }
                                  >
                                    Revoke
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="panel">
                  <div className="panel-head">
                    <div className="panel-title">Payslip delivery</div>
                  </div>
                  <div className="p-4">
                    <button
                      className="btn-primary w-full justify-center py-2.5"
                      onClick={sendPayslips}
                      disabled={
                        sending ||
                        !permitted ||
                        !['approved', 'paid'].includes(run.status) ||
                        isDemo
                      }
                    >
                      {sending ? 'Sending…' : '✉ Send payslips by email'}
                    </button>
                    {sendResult && (
                      <div className="text-[11px] text-ok mt-2 text-center">{sendResult}</div>
                    )}
                    <div className="text-[10px] text-mut mt-2 leading-relaxed">
                      Every employee with an email gets a secure payslip link. Already-sent payslips
                      are skipped automatically.
                    </div>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-head">
                    <div className="panel-title">Deduction breakdown</div>
                  </div>
                  {[
                    ['PAYE tax', run.total_paye],
                    ['Pension — employee 8%', run.total_pension_employee],
                    ['Pension — employer 10%', run.total_pension_employer],
                    ['NHF 2.5%', run.total_nhf],
                    ['NSITF 1% (employer)', run.total_nsitf],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="flex justify-between px-4 py-2.5 border-b border-line last:border-0"
                    >
                      <span className="text-xs text-mut2">{label as string}</span>
                      <span className="font-mono text-xs">{naira(value as number)}</span>
                    </div>
                  ))}
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <div className="panel-title">Bank transfer export</div>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <button
                      className="btn-ghost w-full justify-center py-2.5"
                      disabled={!permitted || !['approved', 'paid'].includes(run.status)}
                      onClick={() => exportCSV('gtbank')}
                    >
                      GTBank bulk CSV
                    </button>
                    <button
                      className="btn-ghost w-full justify-center py-2.5"
                      disabled={!permitted || !['approved', 'paid'].includes(run.status)}
                      onClick={() => exportCSV('access')}
                    >
                      Access Bank CSV
                    </button>
                    <button
                      className="btn-ghost w-full justify-center py-2.5"
                      disabled={!permitted || !['approved', 'paid'].includes(run.status)}
                      onClick={() => exportCSV('zenith')}
                    >
                      Zenith Bank CSV
                    </button>
                    <div className="text-[10px] text-mut mt-1 leading-relaxed">
                      Upload the CSV to your internet banking bulk transfer page, then record the
                      completed bank payment with its reference. The export does not transfer money.
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
