# StaffStack production handoff

The source changes are implemented and tested locally. They have **not** been applied to a live Supabase project or deployed to Vercel. The local demo is a sandbox, not evidence that the production services are configured.

## What changed

- Membership creation is available only through owner-created invitations or atomic workspace onboarding. Invitation acceptance requires a verified matching email and a valid unexpired token.
- Roles are owner, HR manager, payroll manager, employee, and auditor. Database policies enforce access independently of hidden UI buttons. Owner identity comes from organisations.owner_id; a membership cannot manufacture ownership.
- Payroll preparation calculates from trusted database salaries in one transaction. Paid leave does not remove an employee from payroll. Salary selection uses the first day of the chosen month. Money uses PostgreSQL decimal arithmetic.
- Drafts can be recalculated. Review, approved, and paid runs are locked. A different authenticated administrator must approve a prepared run. Approval requires complete bank details. Payment recording requires a reference and does not send money.
- Two-step verification is required for payroll writes and invitations. Users enrol/verify their authenticator in Settings.
- Salary changes append history. Payroll stores employee/bank snapshots so a later profile edit cannot rewrite a completed payout.
- Leave approvals lock requests and balances, reject duplicate decisions and overlapping approvals, and enforce available balances. Approved leave is derived from dates rather than employment status. Leave days count weekdays, without a configurable public-holiday calendar.
- Public payslip access returns a minimal object using a 192-bit bearer token, expires after 30 days, and supports rotation/revocation. It does not return bank accounts, contact details, internal IDs, or the staff directory.
- People have editable profiles, salary history, private documents, search, category filters, pagination, and validated CSV imports. A failed import rolls back its entire batch.
- Employee accounts have a separate portal for their own payslips, leave requests, and balances. Owners can invite, revoke invitations, and remove member access. Owners/auditors can view an immutable application audit trail.
- Email delivery requires a verified payroll administrator and an approved run. It uses delivery claims and provider idempotency keys; provider failures are reported separately. It processes at most 100 eligible slips per invocation; rerun for another batch.
- Account deletion refuses to delete an account that owns a workspace. Workspace deletion is blocked while payroll history exists. Historical user references are retained as records with their actor references set null when a non-owner account is removed.
- Dependencies are installed independently of Downloads, upgraded, and locked. Routes are lazy-loaded. CI, static frontend health reporting, security headers, optional scrubbed Sentry monitoring, and environment checks are included.

## Local review

Use Node 22.12 or later.

```sh
npm ci
npm run check
npm run build
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/?demo=1`. The sandbox keeps changes in session storage and simulates the second payroll approver. It does not upload documents, send mail, or enrol a real authenticator. To reset its sample data, clear `staffstack-demo-data-v2` from session storage. Exit the demo through the sidebar to use actual authentication.

The local tests exercise a real embedded PostgreSQL runtime with emulated Supabase auth/storage schemas. They cover migration execution, policies and grants, workflow transactions, historical salaries, public-link privacy, employee access, and restoration of a database snapshot. Edge tests mock the database/provider and send no external messages. They do not replace a hosted Supabase integration test, concurrent load test, or human browser review.

## Deploy first to staging

1. Create a separate staging Supabase project and Vercel environment. Do not share production database credentials with staging.
2. For a **fresh database**, apply the ordered files in `supabase/migrations` using the Supabase migration workflow. `supabase/schema.sql` is a fresh-install snapshot of exactly the same chain. Do not run both the snapshot and migrations against the same database.
3. For an **existing database**, back it up and restore a copy into staging first. Run `supabase/preflight.sql`, verify the actual schema against the baseline, and review existing memberships: the old policy allowed self-enrolment and old HR memberships cannot be assumed trustworthy. Resolve duplicate emails or invalid records explicitly. Once the baseline has been reconciled, mark only `20261009000100` as applied in the migration ledger, then apply `20261009000200`. Do not blindly mark a different schema as equivalent. The old `migration_*.sql` files are deliberately inert.
4. Configure Auth email confirmation, production SMTP, TOTP enrolment/verification, the correct site URL, and allowed password-reset redirects. The provided TOML describes local defaults; it does not configure a hosted project automatically.
5. Set frontend environment variables from `.env.example`. Vercel runs `npm run build:production`, which rejects missing/placeholder values and server keys in the browser environment. Enable access to Vercel's system environment variables: when `VITE_APP_ENV` is omitted, the build maps `VERCEL_ENV=production` to `production` and `VERCEL_ENV=preview` to `staging`, and passes the resolved value to Vite. An explicit `VITE_APP_ENV` takes precedence; other hosts must set it to `staging` or `production`. The service-role key must exist only in server secrets.
6. Set the edge secrets `RESEND_API_KEY`, `APP_URL` (exact origin, without a trailing slash), and `FROM_EMAIL` using a verified sender domain. Deploy `send-payslips` and `delete-account`. Both verify the session with Supabase Auth in the handler as well as the configured gateway check. Test your project's signing-key setup before launch.
7. The migration creates the private `staff-documents` bucket with PDF/JPEG/PNG and 5 MB limits. Test an authorised upload, a short-lived signed download, and a denied cross-workspace request. Restrict project operators and keep administrative credentials out of application logs.
8. Create two separate payroll administrator accounts, enrol their authenticators, import a small approved staff sample, prepare/review/approve payroll, check the bank upload preview, record a payment reference, and test payslip delivery and employee self-service. A payroll export does not make a bank transfer.
9. Check desktop/mobile layouts, keyboard navigation, screen-reader labels, print output, direct route refreshes, expired invitations, failed connections, and rejected operations in the deployed staging app. Automated browser inspection was unavailable in this session.
10. Only promote after these checks and a payroll specialist's validation. Keep the previous frontend deployment for rollback. Restore database backups to a separate target before deciding on a production recovery; avoid an automatic rollback that could erase financial activity.

## Operations and recovery

- Configure managed database backups/PITR and define retention and recovery targets appropriate to the school. These are account-level services and are not enabled by committing source files.
- `scripts/backup-db.sh` exports roles, schema, and data using a secret-manager-provided `STAFFSTACK_DB_URL`. Files are private and ignored by Git. Encrypt and transfer them to restricted off-site storage. The script needs a working Supabase CLI and its database-dump prerequisites. Schedule it in your operational environment only after verifying it there.
- Back up Storage files separately: a database backup includes storage metadata, not the uploaded document bytes. Restore both into staging periodically, check counts and representative documents, and repeat the payroll/privacy smoke tests. The embedded snapshot recovery test verifies application fixtures, not your live backup pipeline.
- Optional `VITE_SENTRY_DSN` enables scrubbed production error reporting. The configured event payload excludes user identity, HTTP bodies, cookies, request headers, query parameters, breadcrumbs, and raw error messages. Network metadata and monitoring-provider retention still require review. Configure alerts in the monitoring account. The static `/health.json` endpoint confirms frontend availability only; add an uptime check and a protected backend synthetic check in your operations platform.
- Email claims have a ten-minute retry lease. Provider idempotency keys are an extra safeguard with a finite retention window; do not promise exactly-once delivery indefinitely. Review failed deliveries, expired links, and provider logs without logging payroll content.
- Audit events omit sensitive before/after values but record actor, entity, action, and changed field names. Database operators retain privileged access and must follow your access/retention process. CSV exports and already-downloaded files cannot be revoked by revoking a login.

## Supported payroll boundary and statutory review

This implementation handles regular full-month salaries for periods from January 2026 onward. Partial-month employment and mid-month salary changes are blocked instead of silently estimating amounts. Overtime, unpaid-leave deductions, bonuses, loans, annual tax reconciliation, custom holidays, additional relief categories, and direct bank disbursement are not implemented.

The browser and database engines include employee pension and NHF contributions in chargeable-income deductions, and apply the rent-relief cap. The NHF correction is supported by section 30 of the [Nigeria Tax Act 2025](https://nass.gov.ng/documents/download/11249). The rates, scheme applicability, documentary requirements, rounding, and the school's real examples still require an independent Nigerian payroll specialist's sign-off. Passing code tests does not certify statutory compliance.

## References

- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase backups and Storage limitation](https://supabase.com/docs/guides/platform/backups)
- [Resend idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Vercel project configuration](https://vercel.com/docs/project-configuration)
