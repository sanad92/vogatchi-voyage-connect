
- Company email uses per-org IMAP/SMTP credentials encrypted with EMAIL_CREDENTIALS_KEY inside edge functions (_shared/mail.ts); the browser never reads passwords. Why: each company connects its own mailbox.
- Legacy booking status changes use the explicit service type and an acknowledged, organization-authorized invoker RPC; why: prevent wrong-table no-ops and bypassing tenant permissions.
- Email read-state changes use an acknowledged, organization-scoped RPC restricted to visible threads and read fields; why: queue readers can persist state without gaining assignment or workflow write access.
- Platform branding is shared through the logo component and semantic theme tokens; keep tenant names, document branding, contacts and stable identifiers separate so rebranding never alters company data.
- English UI = Arabic source strings + runtime DOM translation (src/i18n/domTranslator.ts) from a lazily loaded dictionary (en-auto.json, generated; en.ts manual overrides win); why: covers every screen without rewriting each page. Mark the language toggle and other must-not-translate nodes with data-no-translate.
- Platform administration uses platform_roles via PlatformAdminGuard and /platform/login. Dedicated platform-finance grants allow access to /platform/finance only. Neither path depends on company membership. The admin.safarerp.com host maps / and /login to the platform area.

- Company sign-up and staff invitations reject free mailbox domains in UI, onboarding, invitation RPCs and pending-invitation insert/update triggers; verified work email is required by onboarding and acceptance RPCs. Why: direct calls and old invitations cannot bypass B2B enforcement; keep domain lists in sync.
- Privileged RPC denial predicates coalesce missing organization roles to an empty value, and membership identity is immutable. Why: SQL NULL must deny access, and memberships must never move between tenants or users.
- Staff invitation emails are rendered and queued by the send-invitation-email function after the invitation RPC; the database never builds or queues email. Why: keeps email sending convertible to managed delivery.
- Subscription checkout uses Paymob Unified Checkout (Intention API with secret key, card + wallet integration IDs from secrets); the legacy iframe flow is retired. Why: Paymob no longer supports the legacy flow and it breaks 3DS.

## Development agent workflow

- The main Codex agent leads the task and owns the final diff, verification, and report. For cross-module work, or changes to bookings, money flows, tenant access, or authentication, delegate any independent work to the relevant project subagents as part of the task. Handle small, localized changes directly. Subagents carry out their assignments without delegating again.
- Route UI and client changes to `safar_frontend`, and server, data, and permissions changes to `safar_backend`. Give implementers clear acceptance criteria and non-overlapping file ownership when they edit in parallel. Keep dependent edits sequential and check the combined diff before verification.
- Use `safar_qa` for independent verification of behavior-changing diffs. Also use `safar_finance_review` when changes affect prices, invoices, collections, supplier payments, refunds, balances, or accounting. These reviewers report findings and evidence. The lead assigns any fixes and reruns the affected checks.
- Give each reviewer the relevant diff, expected behavior, and available test environment. Use the repository's existing checks and fixtures. Include the roles and organization boundaries involved, the checks actually run, and any checks still pending in the final report. If delegation is unavailable, carry out the applicable checks directly and record that in the report.
