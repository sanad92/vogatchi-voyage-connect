
# Vogatchi — Financial Architecture Review & Implementation Roadmap

Scope: review only. No schema or code changes in this step. Findings validated against the live database (row counts, routines, table structure) and the current hooks/pages.

---

## 1. Current State — What Exists

**Master data**
- `chart_of_accounts` (78 rows) with `account_type` enum (asset/liability/equity/revenue/expense), parent hierarchy, `is_system` flag.
- `cost_centers`, `accounting_periods` (open/closed), `exchange_rates`, `bank_accounts` (multi-currency).
- `suppliers` (+ `supplier_contracts`, `supplier_currencies`, `supplier_rates`, `supplier_allotments`).
- `customers`.

**Transactional layer**
- Unified `bookings` (191) with `selling_price`, `cost_price`, `profit`, `currency`, plus legacy specialized tables: `hotel_bookings`, `flight_bookings`, `transport_bookings`, `car_rentals` (all still actively written, invoices join polymorphically via `booking_type` + `booking_id`).
- `invoices` (171) + `invoice_items`.
- `payment_transactions` (**only 2 rows**) — customer payments/Paymob.
- `supplier_payments` (169) — supplier settlements.
- `expense_transactions` (**0 rows**), `bank_account_transactions` (**0 rows**).
- `journal_entries` (391) + `journal_entry_lines` (1,142).
- `commission_payments`, `monthly_salaries`, `rent_payments`.

**Reporting hooks (frontend)**
- `useFinancialReports.ts` calls RPCs: `get_trial_balance`, `get_income_statement`, `get_balance_sheet`, `get_cash_flow`, `get_customer_aging`, and `seed_default_chart_of_accounts`.
- `useFinancialReportsImproved.tsx`, `useProfitAnalytics`, `useProfitLossCalculations`, `useRevenueBreakdown`, `useExpenseBreakdown`, `useFinancialSummary`, CFODashboard, ProfitAnalytics, Reports.

---

## 2. Critical Gaps (Verified)

### 🔴 P0 — Blocking accounting integrity

1. **All accounting RPCs are missing.** `information_schema.routines` shows zero functions named `get_trial_balance`, `get_income_statement`, `get_balance_sheet`, `get_cash_flow`, `get_customer_aging`, or `seed_default_chart_of_accounts`. Every call in `useFinancialReports.ts` and `useChartOfAccounts.ts` fails silently → the CFO/Reports pages render empty or fall back to ad-hoc JS aggregation.
2. **No automatic journal posting.** No triggers or RPCs post journals for invoices, customer payments, supplier payments, expenses, salaries, rent, bank transfers, or FX revaluation. The 391 existing journal entries appear to be seeded/manual → COA and journals are decorative, not authoritative.
3. **Double-entry is not enforced.** No DB-level constraint that `sum(debit) = sum(credit)` per entry; no period-close guard preventing writes into closed periods; no immutability on posted entries.
4. **Two disjoint payment ledgers.** Customer money = `payment_transactions` (2 rows) + `bank_account_transactions` (0). Supplier money = `supplier_payments` (169). Neither feeds `bank_accounts.current_balance` deterministically, and neither posts to GL. Bank balances drift.
5. **Polymorphic invoice → booking mapping is fragile.** `invoices.booking_id` resolves against 4 different tables via `booking_type` in JS (`useInvoicesData.tsx`) with no FK. Deleting a hotel_booking leaves orphan invoices with no referential guard.
6. **Profit is stored, not derived.** `bookings.profit`, `hotel_bookings.total_profit`, etc. are frozen at write-time. Changes to `cost_price` / supplier rate / FX do not recompute; no historical FX snapshot either → P&L drifts vs. real cost.

### 🟠 P1 — Correctness & control

7. **Multi-currency without a functional currency.** Bookings, invoices, expenses each carry `currency`, but there is no journal-time conversion to a single reporting currency (EGP is assumed in one hook, USD elsewhere). No FX gain/loss account. `useMultiCurrency` converts at read-time using the current rate, which is wrong for historical reports.
8. **AR / AP sub-ledgers do not exist.** Customer balance = SUM(invoices) − SUM(payment_transactions), computed ad hoc in JS. Supplier balance = SUM(booking cost) − SUM(supplier_payments). No aging buckets, no statement-of-account, no credit-limit enforcement against real outstanding.
9. **Expenses module is empty in production** (`expense_transactions=0`) yet UI and reports assume it. Salaries/rent are in separate tables and never converge into `expense_transactions` or GL.
10. **Booking as central entity is incomplete.** `UnifiedBookingDetails` shows service info but not: linked invoice(s) + status, supplier payables + status, customer receivable, documents (voucher/ticket), FX-normalized profit, or the audit trail of price/cost changes.
11. **No period close workflow.** `accounting_periods` table exists but nothing enforces `status='closed'`; users can still insert back-dated invoices/payments.
12. **Audit trail is partial.** `admin_audit_log` exists but is not wired to financial mutations (invoice edit, payment reversal, cost change, journal edit).
13. **Permissions.** RBAC exists at row level but there is no "Finance" role separation — any user who can see bookings can currently create invoices and payments in the UI.

### 🟡 P2 — Reporting & UX

14. GL viewer (`JournalEntriesPage`) has no drill-down from account → entries → source document.
15. No Reconciliation UI (bank statement vs. `bank_account_transactions`).
16. No Cash Flow direct/indirect statement; the RPC is missing.
17. No travel-specific KPIs surfaced: gross booking value, take-rate %, ADR, RevPAB, avg. lead time, cancellation ratio, refund exposure, supplier concentration, employee commission margin, cash conversion cycle.
18. Invoice numbering has no per-org sequence guarantee at DB level (uniqueness relies on JS).

---

## 3. Target Architecture (Booking-Centric ERP)

```text
                       ┌──────────────────────┐
                       │      BOOKING         │  (single source of truth)
                       │  selling / cost /    │
                       │  currency / status   │
                       └───────┬──────┬───────┘
                               │      │
      revenue side ◄───────────┘      └─────────► cost side
             │                                        │
    ┌────────▼────────┐                    ┌──────────▼──────────┐
    │  INVOICE (AR)   │                    │  SUPPLIER BILL (AP) │
    │  + items        │                    │  + items            │
    └────────┬────────┘                    └──────────┬──────────┘
             │                                        │
    ┌────────▼────────┐                    ┌──────────▼──────────┐
    │ CUSTOMER PAYMENT│                    │  SUPPLIER PAYMENT   │
    └────────┬────────┘                    └──────────┬──────────┘
             │                                        │
             └──────────────┬─────────────────────────┘
                            ▼
                 ┌────────────────────┐
                 │  JOURNAL ENTRIES   │  (auto-posted, immutable,
                 │  + entry_lines     │   FX-normalized, period-guarded)
                 └─────────┬──────────┘
                           ▼
              GL · Trial Balance · P&L · BS · Cash Flow · AR/AP Aging
```

Principles:
1. Every financial mutation posts a balanced journal in the same transaction (DB trigger/RPC), tagged with `source_type` + `source_id` + `booking_id`.
2. Store both `amount` (original currency) and `amount_base` (org functional currency, with `fx_rate` and `fx_date` snapshot).
3. `bank_accounts.current_balance` is a **view/RPC** computed from `bank_account_transactions`, not a mutable column.
4. Booking detail page is the operator's cockpit: services · invoices · payments · supplier bills · supplier payments · documents · P&L · timeline.

---

## 4. Prioritized Roadmap

### Wave 1 — Quick Wins (1 sprint, no schema change)
- Ship the missing RPCs (`get_trial_balance`, `get_income_statement`, `get_balance_sheet`, `get_cash_flow`, `get_customer_aging`, `seed_default_chart_of_accounts`) as `SECURITY DEFINER` functions reading existing `journal_entry_lines`. Unblocks CFODashboard/Reports immediately.
- Add read-only **Booking Financial Panel** to `UnifiedBookingDetails`: invoice list + status, customer paid/outstanding, supplier bill/paid/outstanding, derived profit, FX note.
- Add **Customer Ledger** and **Supplier Ledger** pages driven by existing invoices + payments + supplier_payments.
- Add a warning banner on ProfitAnalytics that profit uses stored values (transparency while we fix it).
- Wire `admin_audit_log` triggers on `invoices`, `payment_transactions`, `supplier_payments`, `expense_transactions`, `journal_entries`.

### Wave 2 — Double-Entry Foundation (2 sprints, schema)
- Add `organization_settings.functional_currency` + `fx_rate_source`.
- Add `amount_base`, `fx_rate`, `fx_date` to: `invoices`, `invoice_items`, `payment_transactions`, `supplier_payments`, `expense_transactions`, `bank_account_transactions`, `bookings.cost_price/selling_price`.
- Add `journal_entries.source_type`, `source_id`, `booking_id`, `posted_at`, `posted_by`, `reversed_by_entry_id`, `is_locked`.
- DB constraint: `sum(debit) = sum(credit)` per entry (deferred trigger).
- DB trigger: reject writes to `journal_*` when the entry's period is `closed`.
- Posting RPCs (idempotent, one per source): `post_invoice`, `post_customer_payment`, `post_supplier_bill`, `post_supplier_payment`, `post_expense`, `post_bank_transfer`, `post_salary`, `post_rent_payment`, `post_fx_revaluation`. Called from a single AFTER INSERT/UPDATE trigger per source table.
- Introduce `supplier_bills` table (AP header) — today supplier cost lives implicitly inside booking, which breaks proper AP. Bill = booking cost snapshot at confirmation; supplier_payments settle bills, not bookings.

### Wave 3 — Reporting & Sub-Ledgers (1 sprint)
- GL viewer with account → entries → source drill-down.
- Trial Balance, P&L (by period, by cost center, by booking type, by currency), Balance Sheet, Cash Flow (direct method from `bank_account_transactions`, indirect from P&L).
- Customer Aging (0/30/60/90/90+), Supplier Aging, Statement of Account (PDF).
- Bank Reconciliation UI (import statement CSV → match transactions → mark reconciled).
- Period Close workflow: preview trial balance → lock period → post closing entry.

### Wave 4 — Travel-Specific KPIs & Booking Cockpit (1 sprint)
- Booking P&L card with FX-normalized profit + margin %, commission accrual, net profit.
- KPI dashboard: Gross Booking Value, Net Revenue, Take-rate %, Attach rate, ADR, RevPAB, Avg. Lead Time, Cancellation %, Refund Ratio, Supplier Concentration (top 5), Employee Contribution Margin, Cash Conversion Cycle, Deposit Coverage %.
- Travel-specific reports: Supplier Payable by Due Date, Refund Liability, Deferred Revenue (paid but not-yet-travelled), Unbilled Bookings.

### Wave 5 — Governance (0.5 sprint)
- Finance role separation: `finance_viewer`, `finance_operator`, `finance_controller` (only controller can reverse posted entries or reopen a period).
- Immutable posted entries — edits require a reversing entry.
- Signed export (PDF + hash) for Trial Balance and closing package.

---

## 5. Required Reports (Definition of Done)

| Report | Grain | Filters | Source |
|---|---|---|---|
| General Ledger | account × date | period, cost center | `journal_entry_lines` |
| Trial Balance | account | as-of-date | RPC |
| P&L | account_type | period, currency, cost_center, booking_type | RPC |
| Balance Sheet | account | as-of-date | RPC |
| Cash Flow (direct) | bank txn | period | `bank_account_transactions` |
| Customer Aging | customer | as-of-date | invoices − payments |
| Supplier Aging | supplier | as-of-date | supplier_bills − supplier_payments |
| Bank Reconciliation | bank account | period | statement vs. txns |
| Booking Profitability | booking | period, employee, destination | bookings + bills + FX |
| Deferred Revenue | booking | as-of-date | paid & not-travelled |

---

## 6. Risks & Assumptions

- **Assumption:** functional currency is EGP unless the org sets otherwise. Confirm with product before Wave 2.
- **Assumption:** existing 391 journal entries are seed/demo and can be re-posted from source via a one-off backfill script; if any are real, we quarantine them under a "legacy" batch.
- **Risk:** legacy specialized booking tables (`hotel_bookings`, `flight_bookings`, …) still receive writes — Wave 2 posting triggers must live on both the specialized tables and unified `bookings` until migration completes.
- **Risk:** switching bank balance to computed view breaks any UI that writes to `bank_accounts.current_balance` directly — audit needed before Wave 2.

---

## 7. Scorecard (current state)

| Dimension | Score /100 | Note |
|---|---|---|
| Chart of Accounts | 70 | Structure fine, unused by system |
| Double-Entry Integrity | 15 | No auto-posting, no balance constraint |
| AR sub-ledger | 40 | Invoices yes, payments almost empty |
| AP sub-ledger | 35 | No bill entity, payments float |
| Multi-currency | 25 | No functional currency, no FX snapshot |
| Bank & Cash | 20 | Balances not derived, no reconciliation |
| Reporting | 20 | RPCs missing → pages empty |
| Booking-centric view | 45 | Info scattered across tabs |
| Audit & Period Control | 25 | Tables exist, unused |
| Travel KPIs | 15 | Not surfaced |
| **Overall Financial Maturity** | **28/100** | Ledger scaffolding present, engine absent |

---

## 8. Deliverable of Next Step

On approval, Wave 1 will be implemented first (RPCs + Booking Financial Panel + Ledgers + audit triggers). No schema changes, no data mutations. Waves 2–5 will each be re-planned before execution.

## ✅ Phase 2ب — Automatic Journal Posting Engine (تم)
- إضافة `source_type`/`source_id`/`booking_id`/`fx_rate`/`posted_at`/`is_locked`/`auto_generated` لجدول القيود.
- فهرس فريد `(org, source_type, source_id)` + CHECK `debit=credit` (NOT VALID).
- دوال ترحيل: `post_invoice`, `post_supplier_payment`, `post_expense_transaction`, `unpost_journal`, `backfill_journals`.
- Triggers تلقائية على `invoices` / `supplier_payments` / `expense_transactions`.
- زر "إعادة ترحيل القيود" في CFO Dashboard يستدعي `backfill_journals` لدفع البيانات التاريخية إلى دفتر الأستاذ.
- Idempotent + لا يمس القيود المقفلة (`is_locked`).

**التالي المقترح (Phase 3):** بوابة إقفال الفترات، شاشة GL مع Drill-down، Statement of Account PDF، Bank Reconciliation.
