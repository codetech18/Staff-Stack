const { build } = require('esbuild'),
  assert = require('node:assert/strict'),
  { mkdtempSync, rmSync } = require('node:fs'),
  { tmpdir } = require('node:os'),
  { join } = require('node:path')
const temp = mkdtempSync(join(tmpdir(), 'staffstack-edge-'))
const env = {
  APP_URL: 'https://staffstack.example',
  RESEND_API_KEY: 'test-key',
  FROM_EMAIL: 'test@example.com',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-only',
}
let state, handler
const jwt = (aal) =>
  'header.' + Buffer.from(JSON.stringify({ aal })).toString('base64url') + '.signature'
global.Deno = { env: { get: (k) => env[k] }, serve: (h) => (handler = h) }
global.__edgeClient = () => ({
  auth: {
    getUser: async () =>
      state.unauthorised
        ? { data: { user: null }, error: new Error('unauthorised') }
        : { data: { user: { id: 'owner' } }, error: null },
    admin: {
      deleteUser: async () => {
        state.deleted++
        return { error: null }
      },
    },
  },
  from: (table) => {
    let update = false,
      head = false
    const chain = {
      select: (_fields, options) => {
        head = !!options?.head
        return chain
      },
      eq: () => chain,
      is: () => chain,
      gt: () => chain,
      or: () => chain,
      limit: () => chain,
      update: () => {
        update = true
        return chain
      },
      single: () => chain,
      maybeSingle: () => chain,
      then: (resolve, reject) =>
        Promise.resolve()
          .then(() => {
            if (table === 'organisations')
              return { data: null, count: state.owns ? 1 : 0, error: null }
            if (table === 'payroll_runs')
              return {
                data: {
                  id: 'run',
                  org_id: 'org',
                  status: state.status,
                  period_month: 10,
                  period_year: 2026,
                  organisations: {
                    name: 'School',
                    owner_id: state.notMember ? 'someone' : 'owner',
                  },
                },
                error: null,
              }
            if (table === 'org_members')
              return {
                data: state.notMember ? null : { id: 'member', role: 'payroll_manager' },
                error: null,
              }
            if (table === 'payslips' && update)
              return { data: state.claimed ? null : { id: 'slip' }, error: null }
            if (table === 'payslips')
              return {
                data: [
                  {
                    id: 'slip',
                    token: 'a'.repeat(48),
                    employee_snapshot: {
                      first_name: 'Ada',
                      last_name: 'Okafor',
                      email: 'ada@example.com',
                    },
                    net_pay: 242830,
                  },
                ],
                error: null,
              }
            throw Error('Unexpected edge query')
          })
          .then(resolve, reject),
    }
    return chain
  },
})
const request = (body, aal = 'aal2') =>
  new Request('https://test.example/functions', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + jwt(aal), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
const initial = () => ({
  status: 'approved',
  owns: false,
  deleted: 0,
  sent: 0,
  notMember: false,
  claimed: false,
})
async function load(name) {
  await build({
    entryPoints: [`supabase/functions/${name}/index.ts`],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: join(temp, name + '.cjs'),
    plugins: [
      {
        name: 'mock-service',
        setup(build) {
          build.onResolve({ filter: /^jsr:/ }, (args) => ({ path: args.path, namespace: 'mock' }))
          build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
            contents: 'export const createClient = () => globalThis.__edgeClient();',
            loader: 'js',
          }))
        },
      },
    ],
  })
  require(join(temp, name + '.cjs'))
}
async function run() {
  state = initial()
  await load('delete-account')
  assert.equal((await handler(request({}))).status, 400)
  state.owns = true
  assert.equal((await handler(request({ confirmation: 'DELETE' }))).status, 409)
  assert.equal(state.deleted, 0)
  state.owns = false
  assert.equal((await handler(request({ confirmation: 'DELETE' }))).status, 200)
  assert.equal(state.deleted, 1)
  state = initial()
  await load('send-payslips')
  global.fetch = async (_url, options) => {
    state.sent++
    assert.equal(options.headers['Idempotency-Key'], 'staffstack-payslip-slip-' + 'a'.repeat(48))
    return new Response('{}', { status: 200 })
  }
  state.unauthorised = true
  assert.equal((await handler(request({ payroll_run_id: 'run' }))).status, 401)
  state.unauthorised = false
  assert.equal((await handler(request({ payroll_run_id: 'run' }, 'aal1'))).status, 403)
  state.notMember = true
  assert.equal((await handler(request({ payroll_run_id: 'run' }))).status, 403)
  state.notMember = false
  state.status = 'draft'
  assert.equal((await handler(request({ payroll_run_id: 'run' }))).status, 409)
  state.status = 'approved'
  state.claimed = true
  const skipped = await (await handler(request({ payroll_run_id: 'run' }))).json()
  assert.equal(skipped.skipped, 1)
  assert.equal(state.sent, 0)
  state.claimed = false
  const delivered = await (await handler(request({ payroll_run_id: 'run' }))).json()
  assert.equal(delivered.sent, 1)
  assert.equal(state.sent, 1)
  console.log(
    'PASS: account-deletion confirmation and ownership protection; email authentication, MFA, role/stage checks, delivery claims, and provider idempotency keys. No external emails sent.'
  )
}
run()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => rmSync(temp, { recursive: true, force: true }))
