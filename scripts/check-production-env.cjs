const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_ANON_KEY
const errors = []
if (!url || !/^https:\/\/[^\s]+$/.test(url) || /placeholder|your-project/.test(url))
  errors.push('VITE_SUPABASE_URL must point to a real HTTPS project.')
if (!key || /placeholder|your-publishable-key/.test(key))
  errors.push('VITE_SUPABASE_ANON_KEY must be a real publishable/anon key.')
if (
  key &&
  !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) &&
  !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)
)
  errors.push('Use a publishable key or a valid anon JWT.')
if (key?.startsWith('sb_secret_'))
  errors.push('A server secret must never be exposed in the browser build.')
try {
  if (
    key?.includes('.') &&
    JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role !== 'anon'
  )
    errors.push('The browser JWT must have the anon role.')
} catch {
  errors.push('Invalid browser key.')
}
if (!['staging', 'production'].includes(process.env.VITE_APP_ENV))
  errors.push('Set VITE_APP_ENV to staging or production.')
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('PASS: frontend production environment. Secret values are not printed.')
