# Safar ERP Trip File 2.0 — Sprint 6: Read-only Financial Allocation Review

**Status: draft source code, not deployed or connected to production.**

## Existing accounting source reused

This sprint reuses the existing `get_booking_profit_cockpit(_booking)` RPC
(via `useBookingProfitCockpit`) to show the authoritative booking-level
customer and supplier invoice/receipt/payable aggregates and warnings. The
new per-link comparison does not recalculate or replace these official totals.

Safar ERP already holds:
- `customer_payment_allocations(invoice_id, payment_id, amount, organization_id)`
- `supplier_payment_allocations(supplier_invoice_id, supplier_payment_id, amount, organization_id)`
- Existing invoices, supplier invoices, customer payments, supplier payments,
  and generated documents.

These are reviewed through the same finance-gated Trip File amendment UI,
not via a new financial journal or a new payment processor.

## Delivered

- `allocationReview.ts`: pure, fail-closed comparison of each linked
  amendment evidence source against its existing invoice/payment allocation
  records. Never mix currencies; compare source amount and allocation amount
  only within the exact booking and organization.
- `useBookingAllocationReview.ts`: existing Supabase authenticated client
  SELECTs from allocation tables, explicitly filtered to current org and
  current booking's invoice/payment identifiers. The endpoint's existing
  RLS must still authorize every row.
- The source hook fetches allocations from both the invoice side and
  payment side, deduplicating by actual allocation ID rather than adding
  an allocation twice.
- The hook detects potentially truncated query results and excessive
  source-document IDs and marks the output **incomplete**, not a success.
- `BookingAmendmentFinancialReview.tsx`: read-only financial review panel,
  displaying the original booking profit cockpit and per-linked source
  allocation states and diagnostics.
- Existing `BookingAmendmentEvidencePanel` embeds the read-only panel
  only for staff who can already see finance-gated linked evidence.
- All business states are cautious: source missing/unreadable,
  reversed/cancelled, incomplete, allocation conflict, over-allocation,
  no matching allocation, partial allocation, allocation present in
  records, or nonfinancial document.
- Historical invoice `total_paid_amount` and supplier invoice `amount_paid`
  are compared with allocation totals, **not added to them**. This avoids
  double counting legacy paid fields and allocation records.
- Currency mismatch, different-booking counterpart and invalid payment
  status count as **allocation conflict**. Links to void/reversed sources
  are never treated as settled.

## Financial meaning and limitations

**A fully allocated payment is NOT proof of successful bank clearance,
supplier execution, refund, payment settlement or successful itinerary
amendment.** The UI explicitly uses the label "recorded allocation" and never
sets a final "settled" flag for an amendment.

This is an operations *review*, not a posting workflow:
- Zero direct database changes or new schema required for Sprint 6.
- No invoice creation, credit note, journal entry, payment order, refund,
  booking change, ticket issuance or WhatsApp sends.
- Existing `useBookingFinancials` filters some cancelled or reversed
  records, so a hidden source may display `source_not_visible`. It is a
  review signal, **not proof the underlying record was deleted**.
- Some historical payments may have legacy direct `invoice_id` links
  without `*_payment_allocations` rows. Show a needs-review state,
  never infer missing payment or zero balance from absent allocations.
- Source financial lists may be limited by provider API pagination: a large
  data set must be validated from finance ledgers before release.
- The entire booking-level cockpit shows financial state across the booking,
  **not just the amendment's delta**, and it does not certify refund processing.
- This sprint does not check third-party supplier booking state or final bank
  settlement confirmations.

## Tests

- Pure TypeScript regression exercises full/partial/unallocated/overallocated
  records, duplicates, reversed payments, historical invoices, wrong tenant,
  cross-booking, currency mismatches, and incomplete data.
- GitHub Actions runs this alongside earlier evidence reconciliation,
  PostgreSQL 16 fixture tests for PRs #26/#29/#30, typecheck and build.
- Real hosted Lovable/Supabase JWT, RLS, financial records, actual source
  allocations and external provider confirmations remain untested.

## Release gates

- Stacked on draft PR #30, which depends on #29 → #26.
- Real Lovable Cloud was previously read-only inaccessible. No new migration
  or customer-data operation was attempted by this feature.
- Test with two authenticated organizations, a financial viewer vs nonviewer,
  an inactive employee, a reversed payment, a supplier partial payment,
  and mismatched currency before deploying.
- Examine provider-specific status semantics and allocation totals with
  finance owners; if the data is ambiguous, keep the UI conservative and
  require manual evidence verification.
- Confirm duplicate app changes from separate draft PR #27 and #28 are
  reconciled before bringing Trip File 2.0 to production.

## Next work

Build audited *actual execution* of an approved change only when real provider
and finance contracts have been validated; do not infer an automatic refund
or supplier amendment from manual handoff signatures.
