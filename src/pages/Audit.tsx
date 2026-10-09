import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import PageHeader from '@/components/layout/PageHeader'
import Feedback from '@/components/ui/Feedback'
export default function Audit() {
  const { org } = useAuth()
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [page, setPage] = useState(1)
  useEffect(() => {
    if (!org) return
    supabase
      .from('audit_events')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setRows(data ?? [])
      })
  }, [org?.id])
  return (
    <>
      <PageHeader title="Activity log" />
      <div className="p-6">
        <Feedback error message={error} />
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Latest 500 workspace events</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {['When', 'Action', 'Record', 'Actor', 'Fields changed'].map((h) => (
                    <th key={h} className="text-left px-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 20, page * 20).map((r) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="px-4 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}
                    </td>
                    <td className="px-4">{r.action}</td>
                    <td className="px-4">
                      {r.entity_type} · {String(r.entity_id).slice(0, 8)}
                    </td>
                    <td className="px-4">{String(r.actor_id ?? 'system').slice(0, 8)}</td>
                    <td className="px-4">{r.changed_fields?.join(', ') ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <p className="p-5 text-xs text-mut">Workspace activity will appear here.</p>
          )}
          <div className="p-4 flex justify-end gap-3">
            <button
              className="btn-ghost"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn-ghost"
              disabled={page * 20 >= rows.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
