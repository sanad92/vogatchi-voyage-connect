# Safar ERP product brief

Safar ERP is a subscription-based ERP and CRM for travel agencies and tour operators. It connects customer enquiries, quotations and itineraries, supplier arrangements, bookings, travel documents, operations, and accounting in one product. Each subscribed organization manages its own users, branches, customers, suppliers, transactions, and communications. Vogatchi is an agency using the platform. The Safar ERP platform also has its own administration, subscriptions, support, and billing.

## What the product should do

- **Sales:** receive a lead or customer request, prepare a priced quotation or itinerary, record the accepted terms, and hand off to booking and operations.
- **Supply and bookings:** use supplier prices and allocations where applicable, create and service hotel, flight, car, and transfer bookings, and track documents, amendments, cancellations, and handovers.
- **Hajj and Umrah:** manage program departures and seat and room capacity, direct reservations or time-limited holds, rooming, changes, cancellations, and agency sales and settlements. Confirm the applicable inventory or sales mode before changing a workflow.
- **Finance:** follow each amount through the invoice, payment or advance, selected cash or bank account, wallet if applicable, and ledger. Process supplier payments, refunds, reversals, and reconciliation with traceable amounts, currencies, and organization scope. A reported paid amount needs an actual payment record or verified historical evidence.
- **People and communications:** provision employee roles and branches, manage HR workflows, and connect communications, tasks, reporting, and automation to the same organization and records.
- **Platform and mobile:** keep platform administration and subscription billing separate from tenant operations. Verify web, native builds, installation or upgrades, and delivery of push notifications independently when those are in scope.

The [navigation registry](../src/config/moduleNavigation.ts) defines the user-facing module boundaries. The main web client is React and TypeScript. The [Supabase backend](../supabase/) contains the tracked migrations and Edge Functions. See [the README](../README.md) for repository and Lovable setup.

## Shared acceptance checks

Verify the normal entry point for the assigned user role. When relevant, check organization and branch scope on the server, preserved behavior for existing records, and consistent results on retry, partial failure, or cancellation. Preserve currency and rounding rules and confirm explicitly where a change affects an invoice, account, wallet, or journal. Keep platform authority separate from company roles. For UI work, check the affected Arabic RTL and English flows, without changing tenant identity or document branding.

Separate observed behavior, passing local tests, and production evidence. Treat a visible setup screen, a matching source commit, a provider test, and a signed mobile release as different milestones.

## Checks by specialty

Choose the checks relevant to the task. A passing repository check is evidence about the tested behavior. It does not establish that a named agent, a live provider, or an end-to-end user journey was tested.

| Area | Practical verification |
| --- | --- |
| Sales, quotes, and bookings | Trace customer, terms, dates, and pricing into the booking and its normal entry point. Start with `node scripts/verify-atomic-quote-ui.mjs` or `node scripts/verify-trip-file-integrated.mjs` as applicable. |
| Treasury, accounting, and finance review | Calculate expected amounts before the test and compare invoice, ledger, cash or bank, and wallet effects. Use the local `verify-payment-acceptance.mjs`, `verify-treasury-transfers.mjs`, and `verify-financial-formulas.mjs` checks under `scripts/` as applicable. |
| Hajj and Umrah | Exercise the inventory mode in scope with known seat and room counts. Use `node scripts/verify-pilgrimage-availability-bookings.mjs` and the separate rooming or concurrency fixtures when relevant. |
| Identity, organization, and HR | Verify allowed and denied actions with isolated roles and organizations. Start with `node scripts/verify-tenant-isolation.mjs` or `node scripts/verify-organization-roles-and-hr.mjs`. Authenticated staging acceptance requires test accounts with the relevant roles. |
| Messaging, providers, and billing | Use isolated fixtures from `scripts/` such as `verify-business-email.mjs`, `verify-whatsapp-queue.mjs`, `test-company-api-connections.mjs`, or `verify-platform-paymob-actions.mjs`. Mark provider delivery, callbacks, or e-invoice acceptance as separately verified only after the applicable test environment confirms them. |
| Frontend, documents, reports, and QA | Use an affected route and realistic fixtures in Arabic and English. Check loading and error states, the rendered output and totals, and that private fields stay scoped to the intended role. Navigation regression checks are in `scripts/verify-module-navigation.mjs`. |
| Mobile and release | Verify the current Git ref and build for the target runtime. Distinguish a web build, simulator, signed app, device installation or upgrade, and actual push delivery. Check build infrastructure, credentials, and device access before promising acceptance. |

For a new or unproven assignment, record the expected result, the evidence the agent returns, and any missing environment or access. Match the review to the risk and keep tests scoped to the work.

## Release context

The baseline discussed on 2026-11-19 is a dependable first release for travel agencies. Priority workstreams are reliable financial posting and reporting, tenant access and onboarding, complete booking and communication handoffs, and repeatable build and release checks. Consult the current issue or requested outcome before selecting work. Existing work can be found in [open pull requests](https://github.com/sanad92/vogatchi-voyage-connect/pulls), including the scopes for [bank reconciliation checks](https://github.com/sanad92/vogatchi-voyage-connect/pull/121), [collection allocation](https://github.com/sanad92/vogatchi-voyage-connect/pull/122), [staff invitation links](https://github.com/sanad92/vogatchi-voyage-connect/pull/123), and the [mobile workstream](https://github.com/sanad92/vogatchi-voyage-connect/pull/111). Check their current states before reporting or starting duplicate work. Preserve explicitly deferred items in the current plan.

[Launch execution notes](../roadmap.md) include historical evidence and decisions. For current behavior, prefer the latest applicable rule and verification on the branch being reviewed. For example, the older onboarding notes describe a 14-day trial, and the [later trial migration](../supabase/migrations/20261116225427_seven_day_free_trial.sql) sets the default for new organizations to 168 hours (7 days).

## Brief an agent before assigning work

Supply the relevant customer journey and actor, the organization or platform boundary, the expected outcome, the current branch or issue or PR, the affected interfaces or files, and how to verify it. Include the applicable product constraints from this brief and gaps in the available environment. A manager forwards that context when delegating. Update mutable facts using the active task, current branch, and latest acceptance evidence.
