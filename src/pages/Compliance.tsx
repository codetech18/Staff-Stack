import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { naira, MONTHS } from '@/lib/format'
import { StatCard, Spinner, EmptyState } from '@/components/ui'
import PageHeader from '@/components/layout/PageHeader'
import { downloadCSV } from '@/lib/banks'
import type { PayrollRun } from '@/types'

export default function Compliance() {
  const { org } = useAuth()
  const [run, setRun] = useState<PayrollRun | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!org) return
    supabase.from('payroll_runs').select('*').eq('org_id', org.id)
      .in('status', ['processed', 'paid'])
      .order('period_year', { ascending: false }).order('period_month', { ascending: false })
      .limit(1).maybeSingle()
      .then(({ data }) => { setRun(data as PayrollRun | null); setLoading(false) })
  }, [org?.id])

  const exportSchedule = () => {
    if (!run) return
    const rows = [
      'Deduction,Amount (NGN),Remit To,Statutory Basis',
      `PAYE Tax,${run.total_paye},${org?.state ?? 'State'} Internal Revenue Service,Nigeria Tax Act 2025`,
      `Pension Employee 8%,${run.total_pension_employee},Employee PFAs,Pension Reform Act 2014`,
      `Pension Employer 10%,${run.total_pension_employer},Employee PFAs,Pension Reform Act 2014`,
      `NHF 2.5%,${run.total_nhf},Federal Mortgage Bank of Nigeria,NHF Act`,
      `NSITF 1%,${run.total_nsitf},Nigeria Social Insurance Trust Fund,NSITF Act`,
    ].join('\n')
    downloadCSV(rows, `staffstack-remittance-${run.period_year}-${String(run.period_month).padStart(2, '0')}.csv`)
  }

  if (loading) return <><PageHeader title="Compliance" /><Spinner /></>

  const items = run ? [
    { name: 'PAYE Tax', amount: run.total_paye, sub: `Nigeria Tax Act 2025 · remit to ${org?.state ?? 'state'} IRS`, pct: 70, color: 'bg-accent' },
    { name: 'Pension contribution', amount: run.total_pension_employee + run.total_pension_employer, sub: 'PRA 2014 · 8% employee + 10% employer · remit to PFAs', pct: 85, color: 'bg-purple-600' },
    { name: 'NHF', amount: run.total_nhf, sub: '2.5% of basic · Federal Mortgage Bank', pct: 30, color: 'bg-ok' },
    { name: 'NSITF', amount: run.total_nsitf, sub: '1% of total payroll · employer obligation', pct: 20, color: 'bg-warn' },
  ] : []

  const total = run ? run.total_paye + run.total_pension_employee + run.total_pension_employer + run.total_nhf + run.total_nsitf : 0

  return (
    <>
      <PageHeader title="Compliance" actions={run && <button className="btn-primary" onClick={exportSchedule}>Download remittance schedule</button>} />
      <div className="p-6">
        {!run ? (
          <div className="panel">
            <EmptyState icon="🛡" text="Run your first payroll to see statutory deductions and remittance obligations here." />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard label="Total liability" value={naira(total)} sub={`${MONTHS[run.period_month - 1]} ${run.period_year} · all deductions`} />
              <StatCard label="PAYE due" value={naira(run.total_paye)} valueClass="text-warn" sub="Due by the 10th of next month" />
              <StatCard label="Pension due" value={naira(run.total_pension_employee + run.total_pension_employer)} sub="Within 7 days of salary payment" />
            </div>

            <div className="panel">
              <div className="panel-head"><div className="panel-title">Statutory deductions breakdown</div></div>
              {items.map(item => (
                <div key={item.name} className="px-4 py-3.5 border-b border-line last:border-0">
                  <div className="flex justify-between mb-2">
                    <span className="text-[13px] font-semibold text-white">{item.name}</span>
                    <span className="font-mono text-xs text-mut2">{naira(item.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                  </div>
                  <div className="text-[10px] text-mut mt-1.5">{item.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
