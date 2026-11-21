# X01 — Dated cancellation aging: implementation and verification boundary

Tracking: #149. Dependency: #145 / draft PR #147. This document is a scoped handoff, **not** a migration, test pass, or production fix.

## Reproduced from repository source (2026-11-20)

- Both detailed aging functions in `20260905090544_wave3_receivables_payables_aging.sql` filter invoices by **current** `status NOT IN ('cancelled', 'canceled', 'void', 'draft')`, irrespective of `_as_of_date`.
- The replacement customer and supplier functions in PR #147 retain the same current-status filter inside `eligible_invoices`; their wallet settlement stream is independent of cancellation invoice credits.
- `20261113184230_cancel_fully_waived_booking_invoice.sql` permits a fully waived, posted-and-locked cancellation credit to change the invoice status to `cancelled`, while retaining the original invoice posting and its offset in the ledger.
- Therefore a report dated **before** a subsequent cancellation can omit the invoice even though the corresponding ledger still contains its original receivable at that historical date.

## Proposed accounting event contract (verify schema before coding)

1. Use the invoice's immutable issue date for inclusion, and a **posted** cancellation-credit journal's `entry_date` for effective reduction; do not use mutable invoice `updated_at` as cancellation date.
2. Include only journal entries matching invoice, booking, organization, currency and cancellation-credit source identity; exclude draft/void/reversed entries, and never infer a credit from status alone.
3. Count dated cash allocations, wallet offsets from #147, and cancellation credits as **separate** streams, deduplicated by their source identifiers. A cancellation credit reduces the outstanding amount but is **not** a payment; retain the current RPC output signature and document how the returned `paid_as_of` column represents offsets if used.
4. Distinguish an ordinary draft/void invoice from a posted invoice later cancelled. If a legacy cancellation lacks a trustworthy posted credit/date, do not invent historical precision; explicitly flag or exclude the unsupported historical case and reconcile controls separately.
5. The existing aging control totals aggregate the detail RPCs. Validate the customer account 1100 and supplier account 2000 against the same accounting date and currency, including account routing overrides.

## Synthetic acceptance matrix

| Case | Report date | Expected outcome |
| --- | --- | --- |
| EGP 1,000 posted invoice; full posted credit 1,000 on day 20 | day 10 | outstanding 1,000 |
| Same invoice | day 20 | outstanding 0; no detail row above threshold |
| EGP 1,000 invoice; 300 paid on day 5; 200 posted credit on day 20 | day 10 | outstanding 700 |
| Same partial cancellation | day 20 | outstanding 500; credit must not inflate cash paid |
| SAR 1,000 supplier payable; 1,000 posted reversal on day 20 | day 10 / day 20 | 1,000 / 0, **only** if an authoritative supplier cancellation event exists |
| Credit posted in another tenant or currency | any | ignored |
| Unposted or reversed credit | any | ignored |
| Cancellation recorded only by mutable status, without dated credit | historical | explicitly unsupported/estimated; do not silently return 0 |
| Wallet settlement also linked to an allocation | on/after | counted once by source identity |
| Future-dated posted cancellation | prior as-of | no premature effect |

## Execution gates

- First inspect the **latest** definitions of `booking_cancellation_invoice_credits`, supplier cancellation journal writers, and any aging overrides after #147; do not assume a supplier credit schema mirrors customer invoices.
- Build a disposable PostgreSQL/Supabase fixture with two tenants and EGP/SAR, apply the complete migration chain, then exercise detail RPCs and control totals under authorized and unauthorized roles.
- Assert the journal control and invoice balance for every date; document differences and unsupported legacy rows. Verify the reporting UI separately.
- Implement the additive migration **after** #147 is merged or explicitly base the work on its head, and rebase before final review. No production data backfill or mutation in this task.

Owner: finance/aging (أمينة); independent controls review: reporting (روان); supplier-specific evidence: purchasing (طارق).
