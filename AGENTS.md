
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

- The main Codex agent is the lead and owns the final diff, verification, and report. For cross-module work or changes to bookings, money flows, tenant access, or authentication, delegate independent work to the relevant project subagents. Choose the smallest team that covers the work and handle small, localized changes directly. Subagents complete their assignments without further delegation.
- Pick a domain owner for each workstream. Add a cross-cutting specialist only when the task needs a separate contract, implementation area, or review. Give each implementer explicit acceptance criteria and file ownership. Keep shared-file or dependent edits sequential and check the combined diff before verification.
- Use `safar_qa` for independent verification of material behavior changes and `safar_finance_review` as an additional reviewer for money changes, including prices, invoices, collections, supplier payments, refunds, balances, and accounting. For changes to authentication or organization authorization, have an agent other than the implementer review access controls. Reviewers report findings and evidence. The lead assigns any fixes and reruns affected checks.
- Give each reviewer the relevant diff, expected behavior, and available test environment. Use existing checks and non-production fixtures. If the client supports delegation but cannot load a named role, pass its file's instructions to the delegated agent. If delegation is unavailable, do the applicable checks directly. Report how work was delegated, the checks actually run, and anything still unverified.

### Project specialists

| Area | Agent |
| --- | --- |
| Bookings and trip files, flights, hotels, cars, transfers, changes and cancellations | `safar_reservations` |
| Quotes, itinerary builder, pricing, and conversion | `safar_quotes_itinerary` |
| Supplier records, rates, allocations, and booking terms | `safar_suppliers` |
| Hajj and Umrah departures, seat and room inventory, holds, rooming, and agency portal | `safar_pilgrimage` |
| Customers, CRM, lead pipeline, customer service, and marketing journeys | `safar_crm` |
| Collections, disbursements, banks, cash, refunds, wallets, and reconciliation | `safar_treasury` |
| Invoices, general ledger, accounting periods, and financial statements | `safar_accounting` |
| Staff, branches, departments, attendance, payroll, and commissions | `safar_hr` |
| Authentication, invitations, roles, and tenant isolation | `safar_identity_access` |
| Platform administration, plans, subscriptions, onboarding, and platform billing | `safar_saas` |
| Travel providers, e-invoicing, and company API integrations | `safar_integrations` |
| WhatsApp and email, queues, templates, and delivery | `safar_communications` |
| Operations, tasks, events, SOP handovers, and automation rules | `safar_operations` |
| Reports, analytics, imports, exports, and data quality | `safar_data_reports` |
| Android and iOS, app updates, and push notifications | `safar_mobile` |
| Document center, templates, PDF, printing, and branding | `safar_documents` |
| AI-assisted flows, tools, and evaluations | `safar_ai` |
| Shared UI, navigation, accessibility, RTL, and localization | `safar_frontend` |
| Shared server code, data contracts, and implementation across domains | `safar_backend` |
| QA and regression verification | `safar_qa` |
| Independent financial reconciliation and verification | `safar_finance_review` |
| CI, releases, deployment sequencing, and monitoring | `safar_release` |
