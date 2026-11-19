
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

### Development director

- The main Codex agent is the development director. Turn the request into an outcome and acceptance criteria, assign the affected workstreams to their module managers, and retain ownership of the combined diff, integrated checks, and user report. Coordinate priorities and dependencies between managers. Handle repository housekeeping with no module owner directly.
- Resolve ownership of shared files across managers, then allow independent assignments to proceed in parallel. Make dependent edits sequential. Each assignment needs a deliverable, file scope, and relevant verification. Add shared specialists only when their work or independent review is needed.
- Use `safar_qa` for independent verification of material behavior changes and `safar_finance_review` for money changes. Have an agent other than the implementer review authentication and organization access changes. Give them the expected behavior, relevant diff, and test environment. Return findings to the responsible manager and rerun affected checks before reporting completion.
- Use the named profiles when available. If the client supports delegation but cannot load a named profile, pass the relevant file's instructions to that agent. If a module manager cannot start subagents in the client, have the manager return scoped assignments, dispatch the specialists from the main thread, and send their outputs back to the manager for review. If the client cannot delegate at all, perform the applicable checks directly. Report which roles ran, how they ran, and what remains unverified.

### Module managers

- A module manager owns the assigned workstream and reports to the development director. Read the applicable code and choose only the specialists needed. Give each specialist a bounded assignment, acceptance criteria, file ownership, and expected evidence. Ask the director to coordinate shared files and work in another module.
- When nested delegation is available, dispatch the assignments, collect the specialists' results, check them against the module's acceptance criteria, and send back gaps for correction. When the director dispatches on the manager's behalf, review the returned worker outputs before reporting. Use existing checks and non-production fixtures as applicable.
- Report the assignments and outcomes by specialist, changed files, checks and actual results, dependencies, and any unresolved finding to the director. Specialists execute the assigned work and return the evidence to their manager or the director who dispatched them.

| Module or work area | Manager |
| --- | --- |
| Customers and Sales (`sales`) | `safar_manager_sales` |
| Suppliers and Procurement (`supply`) | `safar_manager_supply` |
| Bookings and Operations (`operations`) | `safar_manager_operations` |
| Finance and Accounting (`finance`) | `safar_manager_finance` |
| Human Resources (`employees`) | `safar_manager_employees` |
| Marketing and Communications (`growth`) | `safar_manager_growth` |
| Management Reporting (`management`) | `safar_manager_management` |
| Organization Settings (`settings`) | `safar_manager_settings` |
| Automation and AI (`automation`) | `safar_manager_automation` |
| Hajj and Umrah, within Bookings and Operations | `safar_manager_pilgrimage` |
| Platform Administration and Subscriptions | `safar_manager_platform` |
| Mobile Applications | `safar_manager_mobile` |

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
