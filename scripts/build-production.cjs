const { spawnSync } = require('node:child_process')

// Vercel exposes its deployment environment when system variables are enabled.
// Keep explicit app settings authoritative, and require them on other hosts.
if (!process.env.VITE_APP_ENV) {
  if (process.env.VERCEL_ENV === 'production') process.env.VITE_APP_ENV = 'production'
  if (process.env.VERCEL_ENV === 'preview') process.env.VITE_APP_ENV = 'staging'
}

require('./check-production-env.cjs')

// The check and Vite must receive the same resolved environment.
const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})
if (result.error) console.error(`Unable to start the build: ${result.error.message}`)
process.exit(result.status ?? 1)
