export const NIGERIAN_BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank', code: '011' },
  { name: 'FCMB', code: '214' },
  { name: 'GTBank', code: '058' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'Opay', code: '999992' },
  { name: 'Palmpay', code: '999991' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'UBA', code: '033' },
  { name: 'Union Bank', code: '032' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
]

type TransferRow = {
  account_number: string
  account_name: string
  bank_code: string
  bank_name: string
  amount: number
  narration: string
}

/** Generate bulk transfer CSV in a given bank's upload format. */
export function generateBankCSV(rows: TransferRow[], format: 'gtbank' | 'access' | 'zenith'): string {
  if (format === 'gtbank') {
    const header = 'Account Number,Account Name,Bank Code,Amount,Narration'
    const lines = rows.map(r => `${r.account_number},${csvSafe(r.account_name)},${r.bank_code},${r.amount},${csvSafe(r.narration)}`)
    return [header, ...lines].join('\n')
  }
  if (format === 'access') {
    const header = 'Beneficiary Account,Beneficiary Name,Beneficiary Bank,Amount,Remarks'
    const lines = rows.map(r => `${r.account_number},${csvSafe(r.account_name)},${csvSafe(r.bank_name)},${r.amount},${csvSafe(r.narration)}`)
    return [header, ...lines].join('\n')
  }
  // zenith
  const header = 'ACCOUNT NO,ACCOUNT NAME,BANK CODE,AMOUNT,PAYMENT REFERENCE'
  const lines = rows.map(r => `${r.account_number},${csvSafe(r.account_name)},${r.bank_code},${r.amount},${csvSafe(r.narration)}`)
  return [header, ...lines].join('\n')
}

function csvSafe(v: string): string {
  return v.includes(',') ? `"${v}"` : v
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
