# StaffStack workspace history

This workspace began as a copy of `/Users/tfk/Downloads/staffstack 2`. The Downloads copy remains the original. The application now uses a forest-green navigation rail, light surfaces, consistent forms, readable tables, a task-focused overview, and responsive layouts.

Production hardening and product additions are documented in [PRODUCTION.md](PRODUCTION.md). Dependencies are installed in this workspace; the original node_modules symlink has been replaced. The payroll engine and database workflows have changed as part of the hardening work, including effective salaries, paid-leave eligibility, NHF relief, approvals, audit history, and secure access.

## Public landing page

The public homepage at `/` introduces StaffStack for Nigerian schools. It includes a responsive hero, a four-tab walkthrough with fictional sample data, payroll and coverage stories, setup steps, FAQs, and signup links. The protected overview now lives at `/dashboard`; authentication, onboarding, password reset, invitations, and workspace navigation use the new route. The public preview does not perform data operations.

The landing page was reviewed in the browser at desktop, tablet, and mobile widths. Preview tabs (including keyboard navigation), FAQ expansion, mobile navigation, signup links, dashboard protection, and legacy demo redirects were verified. Production build and demo checks pass.
