# Phase 5 — Financial & Accounting Engine

Ship a Booking-centered finance layer on top of the existing automation engine. Every record stays linked to `booking_id`; nothing in the current app breaks.

## Scope

1. **Ledger foundations (DB)**
   - `customer_payments` — customer receipts, linked to invoice + booking, currency + FX rate + `amount_base`.
   - `customer_payment_allocations` — allocate a payment across one or more invoices.
   - `supplier_invoices` — supplier bills tied to a `supplier_payment_order` + booking.
   - `supplier_payment_allocations` — allocate `supplier_payments` across POs / supplier invoices.
   - `credit_notes` (customer + supplier variants via `party_type`).
   - `refund_requests` — status machine `requested → approved → paid → rejected`, linked to booking + payment.
   - `treasury_accounts` — unified view over `bank_accounts` + cash/card/wallet/gateway types (add missing columns; keep existing table).
   - `finance_transactions` — append-only, accounting-ready ledger (debit/credit, account codes, booking_id, party ref, currency, fx_rate, base_amount). Feeds future GL without posting journal entries yet.
   - Approval columns on `supplier_payment_orders` (`approval_status`, `approved_by`, `approved_at`).
   - All tables: GRANTs, RLS by `organization_id`, `updated_at` triggers.

2. **Historical currency engine**
   - Every money row stores `currency`, `exchange_rate`, `amount_base` (org base currency, default EGP).
   - `record_customer_payment`, `record_supplier_payment`, `record_refund` RPCs snapshot FX at time of transaction — never recomputed.

3. **RPCs**
   - `record_customer_payment(invoice_id, amount, currency, method, treasury_account_id, fx_rate)` → inserts payment, allocation, treasury tx, `finance_transactions` (Dr Cash / Cr AR), updates invoice paid/remaining, timeline event.
   - `record_supplier_payment(po_id, amount, currency, method, treasury_account_id, fx_rate)` → similar, Dr AP / Cr Cash.
   - `approve_supplier_payment_order(po_id)` — requires manager role.
   - `create_refund_request` / `approve_refund` / `pay_refund` — full status workflow with ledger reversal.
   - `get_customer_ledger(customer_id, from, to)` / `get_supplier_ledger(supplier_id, from, to)` — opening balance + running balance rows.
   - `get_cash_flow(from, to)` / `get_finance_executive(from, to)`.

4. **Hooks (frontend)**
   - `useCustomerLedger`, `useSupplierLedger`, `useTreasuryAccounts`, `useCashFlow`, `useRefundRequests`, `useFinanceExecutive`, `useSupplierPOApprovals`.
   - Reuse `useBookingFinancials` and existing invoice/payment hooks; add allocation dialogs.

5. **UI**
   - **Booking Workspace / Financials tab** — extend with: PO approval strip, refund button, allocation dialog. Keep existing widgets intact.
   - **Customer Ledger page** `/finance/customers/:id/ledger` — statement table + PDF export.
   - **Supplier Ledger page** `/finance/suppliers/:id/ledger` — statement + aging buckets (0-30/31-60/61-90/90+).
   - **Treasury page** `/finance/treasury` — accounts by type (bank/cash/card/wallet/gateway) with balances per currency.
   - **Cash Flow dashboard** `/finance/cash-flow` — incoming/outgoing/net by day + by method.
   - **Refunds page** `/finance/refunds` — approval queue.
   - **Executive Finance Dashboard** `/finance/executive` — sales, costs, profit, cash, AR, AP, overdue, pending POs, top customers/suppliers, profitability by destination/consultant.
   - **Profitability Analytics** `/finance/profitability` — pivot by booking / customer / supplier / consultant / destination / period.

6. **Validation**
   - Playwright E2E: seed a booking → invoice → customer payment → PO approval → supplier payment → verify cash flow, both ledgers, executive dashboard all reflect the numbers and every row references the booking id.
   - Screenshots of each stage saved to `/tmp/browser/phase5/`.

## Technical section

- Base currency read from `organizations.base_currency` (fallback `'EGP'`).
- `finance_transactions` schema:
  ```
  id, organization_id, occurred_at, booking_id, reference_type, reference_id,
  account_code (from chart_of_accounts, nullable), party_type ('customer'|'supplier'|'employee'|null),
  party_id, debit numeric, credit numeric, currency, exchange_rate, base_amount, memo
  ```
  Append-only via trigger; no updates/deletes for non-admins.
- All RPCs `SECURITY DEFINER`, `SET search_path = public`, permission check via `can_org_write(org_id)`.
- Idempotency: `record_customer_payment` accepts optional `client_ref` unique per org to prevent duplicate submissions.
- Cash flow view materialized in SQL as a function (not a materialized view) for real-time reads.
- No changes to `journal_entries` yet — that's Phase 6 (GL posting).

## Deliverables checklist

- [ ] Migration 1: ledger + treasury + finance_transactions schema, RLS, GRANTs.
- [ ] Migration 2: RPCs (payments, refunds, approvals, ledger, cash flow, exec).
- [ ] 7 hooks + 6 new pages + Financials tab extensions.
- [ ] Routes wired in `App.tsx`, sidebar entries under **Finance**.
- [ ] Playwright E2E validation + screenshots.
- [ ] No regressions in existing Booking Workspace / Automation Center.
