# F01 — Aging and wallet settlement acceptance matrix

Tracking: #145. This document defines tests, **not** a claim that they pass.

## Existing source paths

- `supabase/migrations/20260905090544_wave3_receivables_payables_aging.sql`: detail functions select allocated payments when at least one allocation exists, ignoring other settlement pathways.
- `supabase/migrations/20260907170000_company_account_routing.sql`: control totals follow the tenant's routed receivable/payable accounts.
- `supabase/migrations/20261113110937_finance_refund_balances.sql`: refund/settlement balances; inspect precise write semantics before changing aging SQL.

## Disposable database fixtures (do not run against production)

Set up two organizations A and B, distinct users and roles, customer and supplier, invoices and journals. All values below are synthetic.

| Case | Invoice | Allocated payment | Other qualifying settlement | Expected before settlement | Expected after settlement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Customer A / EGP | 1,000 | 500 | 100 | 500 | 400 |
| Supplier A / SAR | 1,000 | 350 | 100 | 650 | 550 |

Dates: invoice 2026-11-01, payment 2026-11-03, settlement 2026-11-05. Query as-of 2026-11-04 and 2026-11-05. Verify the qualifying settlement really reduces the *same invoice debt*, not merely transfers funds into a wallet liability.

## Required negative cases

1. A future-dated settlement does not affect a historical as-of report.
2. Cancelled, void, rejected or reversed transactions are excluded.
3. A settlement already represented by a payment allocation is not counted twice.
4. Org B transactions never affect Org A, including direct RPC calls with unauthorized org id.
5. SAR transactions do not affect EGP results; do not sum currencies.
6. Partial refund payable or supplier advance is not automatically treated as a reduction of an unrelated invoice.
7. Customer and supplier totals reconcile to their correctly routed control accounts; investigate legitimate timing or posting differences rather than masking them.

## Verification before implementation

1. Locate the canonical settlement event table and effective date, its status/reversal semantics, invoice association, organization id and currency.
2. Trace its journal posting and whether it updates cached `total_paid_amount` / `amount_paid`.
3. Build SQL integration fixtures on a disposable Postgres/Supabase instance using actual migrations; assert numeric results and authorization.
4. Only then implement an additive migration overriding aging RPCs, with explicit prevention of double counting and historical fallback flags.
5. Record SQL commands, CI output and migration rollback considerations in PR.

**Current status:** source review identified a credible risk; no disposable DB execution or production reproduction has been completed.
