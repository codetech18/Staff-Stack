import { useState } from 'react'
import { Modal } from './ui'
import Feedback from './ui/Feedback'
import { validateImport, type ImportRow } from '@/lib/import'
import { downloadCSV } from '@/lib/banks'
import { supabase } from '@/lib/supabase'
export default function ImportPeople({
  org,
  onClose,
  onSaved,
}: {
  org: string
  onClose: () => void
  onSaved: () => void
}) {
  const [rows, setRows] = useState<ImportRow[]>([]),
    [errors, setErrors] = useState<string[]>([]),
    [busy, setBusy] = useState(false)
  const read = async (file?: File) => {
    setRows([])
    setErrors([])
    if (!file) return
    if (file.size > 1024 * 1024) return setErrors(['CSV must be smaller than 1 MB.'])
    try {
      const result = validateImport(await file.text())
      setRows(result.rows)
      setErrors(result.errors)
    } catch (e) {
      setErrors([(e as Error).message])
    }
  }
  const save = async () => {
    setBusy(true)
    try {
      const { error } = await supabase.rpc('import_employees', { p_org: org, p_rows: rows })
      if (error) throw error
      onSaved()
    } catch (e) {
      setErrors([(e as Error).message])
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Import your people" onClose={onClose}>
      <p className="text-xs text-mut mb-4">
        Upload a CSV, review the results, and confirm. All rows are saved together; a failed row
        rolls back the entire import. Maximum 500 people.
      </p>
      <button
        className="btn-ghost mb-4"
        onClick={() =>
          downloadCSV(
            'first_name,last_name,email,role,start_date,basic,housing,transport,staff_category,employment_type,bank_code,account_number,account_name,pension_enabled,nhf_enabled,nsitf_enabled\nAda,Okafor,ada@example.com,Teacher,2026-09-01,180000,75000,45000,teaching,full-time,058,0123456789,Ada Okafor,true,true,true',
            'staffstack-import-template.csv'
          )
        }
      >
        Download CSV template
      </button>
      <label className="label" htmlFor="people-csv">
        Choose staff CSV
      </label>
      <input
        id="people-csv"
        type="file"
        accept=".csv,text/csv"
        className="input mb-4"
        disabled={busy}
        onChange={(e) => void read(e.target.files?.[0])}
      />
      <Feedback error message={errors.slice(0, 12).join(' ')} />
      {rows.length > 0 && (
        <>
          <p className="text-sm font-semibold mb-3">
            {rows.length} people found · {errors.length} validation errors
          </p>
          <div className="max-h-60 overflow-auto border border-line rounded-lg mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Basic</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td className="px-3">
                      {r.first_name} {r.last_name}
                    </td>
                    <td>{r.role}</td>
                    <td>₦{Number(r.basic).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 20 && (
            <p className="text-xs text-mut mb-4">
              Showing the first 20 rows. All {rows.length} will be imported.
            </p>
          )}
          <button
            className="btn-primary w-full justify-center"
            disabled={busy || errors.length > 0}
            onClick={save}
          >
            {busy ? 'Importing…' : `Confirm import of ${rows.length} people`}
          </button>
        </>
      )}
    </Modal>
  )
}
