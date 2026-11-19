
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

- At the start of a project task, the director reads the [Safar ERP product brief](docs/product-brief.md) and confirms the active task and current evidence. Give module managers the relevant brief excerpts and scoped references to pass to their specialists. Specialists can read the relevant section if more context is needed.

### Development director

- The main Codex agent is the development director and owns the final diff, verification, and report. Work on one bounded item at a time. Handle localized work directly as the single executor. Bring in a module manager when the item needs coordination across distinct workstreams or when the user requests managed delegation.
- Use the smallest team that covers the work. A manager can complete a scoped assignment directly or delegate distinct pieces based on the work needed. Avoid sending multiple agents to investigate the same question. Give each delegate only the relevant files or diff, acceptance criteria, and evidence to return. Coordinate ownership of shared files and keep dependent edits sequential.
- Run the checks for the affected path first. Broaden verification when a shared contract changes, a targeted check suggests a wider regression, or the current item calls for a release build. For money changes, use an independent finance reviewer. For changes to authentication or organization access, have someone other than the implementer review access controls. Use one independent reviewer when that reviewer can cover the relevant acceptance checks. Return findings to the responsible person and rerun affected checks.
- Close each item with a short record of the change, checks, unresolved blockers, and next work. Continue into another item only within the requested scope or batch.
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
