import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/layout/PageHeader'
import Feedback from '@/components/ui/Feedback'
import { Modal, Spinner, Badge } from '@/components/ui'
import { naira, MONTHS } from '@/lib/format'
import { workingDays } from '@/lib/workflows'
import { LEAVE_TYPES } from '@/lib/school'
export default function EmployeePortal() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [slip, setSlip] = useState<any>(null)
  const [type, setType] = useState('annual'),
    [start, setStart] = useState(''),
    [end, setEnd] = useState(''),
    [reason, setReason] = useState('')
  const load = async () => {
    const { data, error } = await supabase.rpc('employee_portal')
    if (error) setError(error.message)
    else setData(data)
  }
  useEffect(() => {
    void load()
  }, [])
  const request = async () => {
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.rpc('request_my_leave', {
        p_type: type,
        p_start: start,
        p_end: end,
        p_reason: reason,
      })
      if (error) throw error
      setNotice('Leave requested. Your manager can now review it.')
      setStart('')
      setEnd('')
      setReason('')
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader title="My workspace" />
      <div className="p-6">
        <Feedback message={error} error />
        <Feedback message={notice} />
        {!data && !error ? (
          <Spinner />
        ) : (
          data && (
            <>
              <h2 className="text-xl font-semibold mb-5">Welcome, {data.employee.first_name}</h2>
              <div className="grid lg:grid-cols-2 gap-5">
                <section className="panel">
                  <div className="panel-head">
                    <h2 className="panel-title">My payslips</h2>
                  </div>
                  {data.payslips.map((p: any) => (
                    <div
                      className="flex justify-between items-center p-4 border-b border-line"
                      key={p.id}
                    >
                      <div className="text-xs">
                        <strong>
                          {MONTHS[p.period_month - 1]} {p.period_year}
                        </strong>
                        <p className="text-mut mt-1">Net pay {naira(p.net_pay)}</p>
                      </div>
                      <button className="btn-ghost" onClick={() => setSlip(p)}>
                        View payslip
                      </button>
                    </div>
                  ))}
                  {!data.payslips.length && (
                    <p className="p-5 text-xs text-mut">Approved payslips will appear here.</p>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <h2 className="panel-title">Request time off</h2>
                  </div>
                  <div className="p-4">
                    <div className="mb-4 space-y-2">
                      {data.balances.map((b: any) => (
                        <p className="text-xs text-mut" key={b.id}>
                          {b.year} · Annual: {(b.annual_total ?? 21) - b.annual_used} days left ·
                          Sick: {(b.sick_total ?? 10) - b.sick_used} days left
                        </p>
                      ))}
                    </div>
                    <label className="label" htmlFor="portal-leave-type">
                      Leave type
                    </label>
                    <select
                      id="portal-leave-type"
                      className="input mb-3"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      {LEAVE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label" htmlFor="portal-start">
                          Start date
                        </label>
                        <input
                          id="portal-start"
                          className="input"
                          type="date"
                          value={start}
                          onChange={(e) => setStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="portal-end">
                          End date
                        </label>
                        <input
                          id="portal-end"
                          className="input"
                          type="date"
                          value={end}
                          onChange={(e) => setEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <label className="label mt-3" htmlFor="portal-reason">
                      Reason (optional)
                    </label>
                    <textarea
                      id="portal-reason"
                      className="input"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <p className="text-xs text-mut my-3">
                      {workingDays(start, end)} weekdays. Split requests that cross a calendar year.
                    </p>
                    <button
                      className="btn-primary"
                      disabled={busy || !workingDays(start, end)}
                      onClick={request}
                    >
                      {busy ? 'Submitting…' : 'Request leave'}
                    </button>
                  </div>
                </section>
              </div>
              <section className="panel mt-5">
                <div className="panel-head">
                  <h2 className="panel-title">My requests</h2>
                </div>
                {data.requests.map((r: any) => (
                  <div className="flex justify-between p-4 border-b border-line text-xs" key={r.id}>
                    <span>
                      {r.leave_type} · {r.start_date} – {r.end_date} · {r.days} days
                    </span>
                    <Badge
                      tone={
                        r.status === 'approved' ? 'ok' : r.status === 'declined' ? 'danger' : 'warn'
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </section>
            </>
          )
        )}
        {slip && (
          <Modal
            title={`${MONTHS[slip.period_month - 1]} ${slip.period_year} payslip`}
            onClose={() => setSlip(null)}
          >
            <p className="text-sm font-semibold mb-4">
              {data.employee.first_name} {data.employee.last_name}
            </p>
            {[
              ['Basic', slip.basic],
              ['Housing', slip.housing],
              ['Transport', slip.transport],
              ['Other allowances', slip.other_allowances],
              ['Gross pay', slip.gross],
              ['PAYE', -slip.paye],
              ['Pension', -slip.pension_employee],
              ['NHF', -slip.nhf],
              ['Total deductions', -slip.total_deductions],
              ['Net pay', slip.net_pay],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex justify-between py-3 border-b border-line text-sm"
              >
                <span>{String(label)}</span>
                <strong>{naira(Number(value))}</strong>
              </div>
            ))}
            <button className="btn-ghost mt-4 print:hidden" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </Modal>
        )}
      </div>
    </>
  )
}
