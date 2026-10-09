# StaffStack

People and payroll management for Nigerian schools. React, TypeScript, Vite, Tailwind, and Supabase.

## Run locally

```sh
npm ci
cp .env.example .env
npm run dev -- --host 127.0.0.1 --port 5173
```

For an isolated preview, open `http://127.0.0.1:5173/?demo=1`. The development-only demo uses fictional people and keeps changes in your browser session. It does not send email, upload files, or change live records. For actual authentication, exit the demo and configure a Supabase project that has the new migrations applied.

## Verify

```sh
npm run check
npm run build
```

The checks cover payroll calculations, CSV validation, demo isolation, real PostgreSQL policies/transactions, a database snapshot recovery, and mocked edge-function workflows. `npm run check:edge` also type-checks the edge source offline. Use `npm run format:check` to check source formatting.

## Features

- Overview with payroll history, leave, attendance, and subject coverage
- People directory with profiles, salary history, private documents, CSV imports, and pagination
- Transactional payroll preparation and two-person approval with completed-record locks
- Time off, balances, attendance, and subject assignments
- Secure invitations, five membership roles, TOTP verification, and activity log
- Employee self-service and expiring/revocable payslip links
- Bank CSV exports and email delivery with retry safeguards

See [PRODUCTION.md](PRODUCTION.md) for migrations, environment variables, staging checks, recovery, external service configuration, and supported payroll limits. Source changes are not a deployment or a compliance certification.
