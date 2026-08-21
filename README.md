# StaffStack

HR & Payroll management for Nigerian SMBs — payroll with full statutory compliance (PAYE, Pension, NHF, NSITF), leave management, attendance tracking, and bank-ready salary exports.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Hosting:** Vercel

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Open the SQL Editor and run the entire contents of `supabase/schema.sql`
3. In Authentication → Providers, enable Email

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in your project values from Supabase → Settings → API:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 4. Run

```bash
npm run dev
```

## Feature map

| Route | What it does |
|---|---|
| `/signup` → `/onboarding` | Create account → set up organisation + departments |
| `/` | Dashboard — payroll cost, staff count, on-leave, next salary date |
| `/staff` | Add/manage employees with salary structures + bank details |
| `/subjects` | Track subjects/classes and which teachers cover them — flags unstaffed subjects and single-point-of-failure coverage |
| `/payroll` | Run monthly payroll — calculates PAYE, pension, NHF, NSITF per staff; export GTBank/Access/Zenith bulk CSVs |
| `/leave` | Log, approve, decline leave; balances auto-update |
| `/attendance` | Mark daily attendance; 5-day history per staff |
| `/compliance` | Statutory liability breakdown + remittance schedule export |
| `/payslip/:token` | Public payslip view (no login) — printable |

## The Payroll Engine (`src/lib/payroll.ts`)

Implements Nigerian statutory rules under the **Nigeria Tax Act 2025** (effective 1 January 2026):

- **PAYE** — six progressive bands from 0% (first ₦800,000) to 25% (above ₦50M). CRA is abolished and replaced by rent relief (20% of annual rent paid, capped at ₦500,000). Employees on the national minimum wage (≤ ₦840,000/year) are fully PAYE-exempt. The old 1% minimum tax rule is gone.
- **Pension (PRA 2014)** — 8% employee + 10% employer on Basic + Housing + Transport
- **NHF** — 2.5% of basic
- **NSITF** — 1% of gross (employer cost, not deducted from employee)

**Pension, NHF, and NSITF are opt-in per employee.** Not every staff member is enrolled in every scheme — contract or part-time teachers, for example, are often excluded. The employer sets these three toggles individually on each person's salary structure when adding them on the Staff page; nothing is deducted unless explicitly switched on.

If you set up your Supabase project **before** this update, run `supabase/migration_deduction_toggles.sql` in the SQL Editor to add the new columns without losing existing data.

## Subject Tracking

Schools can track which subjects/classes exist and which teachers cover each one, from the `/subjects` page:

- Add a subject (e.g. "Further Mathematics", class level "SS3") and assign one or more teachers to it
- The dashboard flags **unstaffed subjects** (nobody assigned) and **single points of failure** (only one teacher covers it) at a glance
- On the Leave page, a teacher's assigned subjects show as tags on their pending leave request — so approving leave makes a coverage gap visible before it happens, not after

If you set up Supabase before this was added, run `supabase/migration_subjects.sql` in the SQL Editor.

## Deploying

```bash
npm run build   # verify it compiles
```

Push to GitHub → import in Vercel → add the two env vars → deploy.

## Payslip Email Delivery (Edge Function)

The `supabase/functions/send-payslips` function emails every employee a secure payslip link via Resend.

### Setup

1. Create a free account at [resend.com](https://resend.com) and get an API key
2. (Recommended) Verify your domain in Resend so emails come from `payroll@yourdomain.ng`
3. Install the Supabase CLI: `npm i -g supabase`
4. Link and deploy:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set APP_URL=https://your-app.vercel.app
supabase secrets set FROM_EMAIL="StaffStack <payroll@yourdomain.ng>"
supabase functions deploy send-payslips
```

5. Run payroll in the app, then click **"Send payslips by email"** on the Payroll page

Notes:
- Without a verified domain, Resend only delivers to your own signup email (test mode) — fine for development
- The function skips payslips already sent (`sent_at` set) so you can safely click twice
- Employees without an email address are skipped and counted in the result

## Post-MVP roadmap

- Employee CSV bulk import
- Paystack subscription billing
- Direct salary disbursement (requires licensing)
- WhatsApp notifications via Termii
