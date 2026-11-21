# F01 — Aging and refund-balance settlement reconciliation contract

Status: **draft for review; no production migration applied**. Tracking: #145.

## Verified code paths (main, 2026-11-20)

- `supabase/migrations/20260905090544_wave3_receivables_payables_aging.sql`: customer and supplier aging select allocated payments whenever an invoice has at least one allocation; otherwise they fall back to invoice cached paid amount for current/future dates. They do **not** explicitly join `refund_balance_settlements`.
- `supabase/migrations/20261113110937_finance_refund_balances.sql`: settlement into a customer invoice inserts a `refund_balance_settlements` row, posts a journal and increments `invoices.total_paid_amount`, without inserting a `customer_payment_allocations` row. Supplier settlement against another supplier order records `supplier_invoice_id` and calls `refresh_supplier_invoice_payment_state`; confirm whether that function counts settlements.
- Settlement rows have `created_at`; their journal has `entry_date` and `status`. Define a single accounting effective date for historical as-of reports (prefer posted journal date, with a documented backdating policy). Never use an undated cached paid balance for historical precision.

## Regression scenarios (isolated disposable DB; synthetic data only)

| Scenario | Invoice | Allocated payment | Eligible balance settlement | As-of outstanding |
|---|---:|---:|---:|---:|
| Customer EGP before settlement | 1,000 | 500 | future 100 | 500 |
| Customer EGP on/after settlement | 1,000 | 500 | 100 | **400** |
| Supplier SAR before settlement | 1,000 | 300 | future 150 | 700 |
| Supplier SAR on/after settlement | 1,000 | 300 | 150 | **550** |
| Settlement already represented in allocation | 1,000 | 500 (including settlement) | same event 100 | 500, not 400 |
| Other tenant or other currency | 1,000 | 500 | 100 outside scope | 500 |
| Reversed/unposted settlement | 1,000 | 500 | invalid 100 | 500 |

For every row compare detail RPC, aggregate aging RPC, invoice balance, journal control and customer/supplier ledger. Assert that organization permissions and currencies are enforced for all reads.

## Implementation checklist

1. Inspect the **latest** definition of `refresh_supplier_invoice_payment_state` and all subsequent overrides of aging RPCs before editing; migration filenames alone do not establish runtime precedence.
2. Define the authoritative dated settlement stream. Include only valid posted journal entries and rows matching organization, invoice, currency and effective date. Exclude reversals and deduplicate against allocations by **source identifier**, not by amount.
3. Calculate historical outstanding from dated payment and settlement events. Do not simply add cached `total_paid_amount` to allocations (double-counting), and do not add refund settlements to the **original** refunded invoice when they are applied to a different invoice.
4. Add integration fixtures for two organizations and EGP/SAR. Run complete migration chain in a disposable database; verify SQL function signatures, security-definer authorization, control totals and reporting UI.
5. Submit a separate SQL migration and tests for review. Do not mutate production or auto-merge without a passing integration run.

## Reproducing the core regression

Run both commands from the project root. The harness uses PGlite and selected project SQL with synthetic parties, invoices, payments and posted settlements.

    node scripts/verify-aging-wallet-settlement.mjs --baseline
    node scripts/verify-aging-wallet-settlement.mjs supabase/migrations/20261120171656_account_for_wallet_settlements_in_aging.sql

The baseline reports 500 EGP and 700 SAR after the two settlements, while the invoices and control accounts show 400 EGP and 550 SAR. The candidate reports 400 and 550 on the settlement date and preserves 500 and 700 before it. The core regression also covers repeat requests, currency and tenant boundaries, and unchanged treasury movements.

The change covers the two detailed aging RPCs and totals that call them. The selected SQL harness requires separate integration verification against the complete migration deployment and reporting flows. Standalone statements and historical cancellation coverage are follow-up work. See #149 for dated invoice cancellation and credit evidence.
