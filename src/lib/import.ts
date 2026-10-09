import { NIGERIAN_BANKS } from './banks'
export type ImportRow = Record<string, string | number | boolean | null>
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [],
    row: string[] = []
  let field = '',
    quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (!quoted && field) {
        throw Error('Unexpected quote in CSV')
      } else quoted = !quoted
    } else if (c === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((v) => v.trim())) rows.push([...row])
      row.length = 0
      field = ''
    } else field += c
  }
  if (quoted) throw Error('Unclosed quoted field')
  row.push(field)
  if (row.some((v) => v.trim())) rows.push(row)
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '')
  return rows
}
export function validateImport(text: string) {
  const raw = parseCSV(text),
    headers = raw.shift()?.map((h) => h.trim().toLowerCase()) ?? []
  const required = ['first_name', 'last_name', 'email', 'role', 'start_date', 'basic']
  if (required.some((h) => !headers.includes(h)))
    throw Error(`Required columns: ${required.join(', ')}`)
  if (new Set(headers).size !== headers.length) throw Error('Duplicate column names')
  if (raw.length < 1 || raw.length > 500) throw Error('Import between 1 and 500 people')
  const emails = new Set<string>(),
    errors: string[] = []
  const rows = raw.map((values, i) => {
    if (values.length !== headers.length)
      errors.push(`Row ${i + 2}: column count differs from header.`)
    const row: ImportRow = {}
    headers.forEach((h, j) => (row[h] = (values[j] ?? '').trim()))
    for (const key of required.filter((k) => k !== 'basic'))
      if (!row[key]) errors.push(`Row ${i + 2}: ${key} required.`)
    const email = String(row.email).toLowerCase()
    row.email = email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`Row ${i + 2}: invalid email.`)
    if (emails.has(email)) errors.push(`Row ${i + 2}: duplicate email.`)
    emails.add(email)
    const date = String(row.start_date)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
    )
      errors.push(`Row ${i + 2}: use a valid YYYY-MM-DD start date.`)
    for (const key of ['basic', 'housing', 'transport', 'other_allowances', 'annual_rent']) {
      const number = Number(row[key] ?? 0)
      if (!Number.isFinite(number) || number < 0)
        errors.push(`Row ${i + 2}: ${key} must be a non-negative amount.`)
      row[key] = number
    }
    row.employment_type ||= 'full-time'
    row.staff_category ||= 'teaching'
    if (!['full-time', 'contract', 'part-time', 'nysc'].includes(String(row.employment_type)))
      errors.push(`Row ${i + 2}: invalid employment type.`)
    if (!['teaching', 'non_teaching'].includes(String(row.staff_category)))
      errors.push(`Row ${i + 2}: invalid staff category.`)
    for (const key of ['pension_enabled', 'nhf_enabled', 'nsitf_enabled']) {
      const value = String(row[key] ?? 'true').toLowerCase()
      if (!['true', 'false'].includes(value))
        errors.push(`Row ${i + 2}: ${key} must be true or false.`)
      row[key] = value === 'true'
    }
    if (row.account_number && !/^\d{10}$/.test(String(row.account_number)))
      errors.push(`Row ${i + 2}: account number must contain 10 digits.`)
    if (row.bank_code) {
      const bank = NIGERIAN_BANKS.find((b) => b.code === row.bank_code)
      if (!bank) errors.push(`Row ${i + 2}: unknown bank code.`)
      row.bank_name = bank?.name ?? ''
    }
    row.effective_from = date
    return row
  })
  return { rows, errors }
}
