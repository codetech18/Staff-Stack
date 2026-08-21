export const naira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

export const nairaFull = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export const initials = (first: string, last: string) =>
  (first[0] ?? '').toUpperCase() + (last[0] ?? '').toUpperCase()

const AVATAR_COLORS = ['#1d4ed8','#7c3aed','#b45309','#0891b2','#be185d','#065f46','#9333ea','#c2410c']
export const avatarColor = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export const dateShort = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
