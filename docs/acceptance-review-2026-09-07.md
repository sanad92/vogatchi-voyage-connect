# Customer acceptance review — 2026-09-07

Scope: baseline c231e3f2 on GitHub (tree identical to local ef5e66bd).
This is a partial acceptance review, not a production certification.

## Browser observations before fixes

- Public landing loaded and pricing navigation worked.
- Annual/monthly pricing toggle changed both the amounts and signup billing links.
- Secure sign-in succeeded; the selected workspace was Vogatchi Travel and the account was Super Admin. This is not a sandbox or a least-privilege employee session.
- Hotel booking wizard opened. Continuing with no customer was blocked with an Arabic validation message.
- Dashboard warning said EGP while cards displayed USD. Recent bookings hardcoded EGP.
- Login displayed unverified customer count, booking volume, and uptime claims.
- No booking, customer, payment, cancellation, or refund was submitted in the browser.

## Implemented fixes

| Finding | Change | Verification |
| --- | --- | --- |
| Dashboard read legacy service tables | Main financial cards now read get_executive_kpi_dashboard for the selected currency and service dates from year start through today | Source review; production build |
| Mixed currency labels | Currency selector, matching revenue-chart currency, per-booking currency, explicit reporting period | Source review; production build |
| Contribution labeled company net profit | Label now says booking net contribution before general overhead | Source review |
| Recent bookings menu had inert actions | Unified organization-scoped booking list links directly to booking workspace | Source review; production build |
| Partial supplier orders submitted original total | Sum allocations, calculate remaining balance, submit remaining only | 11 behavioral assertions in scripts/verify-payment-acceptance.mjs |
| Foreign supplier payment silently defaulted FX to 1 | Non-EGP payment requires a positive finite exchange rate to EGP | Source review; production build |
| Membership-only payment mutation checks | Three RPCs use active subscription + active membership + existing payments_process role policy; preserve platform-admin bypass | Live SQL definitions and permission evaluation |
| Cancelled/paid order lifecycle | Reject cancelled-order payments and approval changes on paid/partially-paid/cancelled orders | Live SQL definition verification; no financial writes |
| Unverified login marketing statistics | Replaced statistics with product capability labels | Source review; production build |

## Live database permission evidence

Evaluated can_process_org_payments for 42 existing organization memberships inside a transaction ending in ROLLBACK. Only temporary test results and transaction-local JWT context changed; no durable role changes or payments.

- Active customer-service agent: denied (1).
- Active sales agent: denied (1).
- Inactive reservations agent and manager: denied (2).
- Ordinary owners without active subscription: denied (35).
- Ordinary owner with active subscription: allowed (1).
- Platform-admin owners: allowed (2), preserving the existing platform-admin policy.
- Anonymous execution denied on all three payment RPCs.
- No active finance agent, ordinary active manager, or viewer was available in this membership sample; those cases still need isolated fixtures.
- Supabase security advisor returned permission denied. No clean advisor result is claimed.

## Remaining acceptance gates

These have not passed end-to-end and must not be presented as completed:

1. Isolated company with owner, finance, sales, operations and viewer test accounts.
2. Full quote → booking → invoice → customer collection → supplier payment → ledger reconciliation.
3. Multi-service/multi-supplier packages and partial cancellation/refund penalties.
4. Repeated submissions and concurrent edits with network interruption.
5. Duplicate import with preview and rollback, exports, and backup restore exercise.
6. Verify changed UI in preview after code deployment (current browser observations were on the pre-fix deployed UI).
7. Broader finance read/table policy review: _can_read_org_finance remains membership-based; this change only hardens the three payment mutation entry points.
8. Remaining data-quality alerts, missing documents and legacy navigation destinations need independent review.

The latest migration was applied to the live database. Frontend changes are local until separately pushed/published. Existing static suites passing does not substitute for these acceptance gates.
