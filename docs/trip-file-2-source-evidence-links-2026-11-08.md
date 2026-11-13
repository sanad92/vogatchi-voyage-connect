# Trip File 2.0 — Sprint 5: Source Evidence Linking

**Status: staged draft code, no Lovable Cloud migration or deployment.**

## Verified existing records

The existing Booking Financial Workspace reads the booking's:
- `invoices` (customer invoices)
- `supplier_invoices` (supplier obligations)
- `customer_payments` (customer receipts)
- `supplier_payments` (supplier payments)
- `generated_documents` (original system documents)

These tables already have `id`, `booking_id` and `organization_id`.
The new flow reuses these original records rather than making an alternative
payment ledger or a fake supplier receipt.

## Delivered

- New `booking_change_source_evidence` table with an immutable audit link
  to an existing approved amendment. The link captures source type, UUID,
  reference, amount/currency/status **at the time of linking**, actor and time.
- Private business authorization in `link_booking_change_source_evidence`:
  signed-in active member of the amendment's company, bookings_view,
  financial_view and financial_edit, and an approved amendment with a recorded
  supplier handoff (including later stages).
- The SQL function verifies that the chosen **source row belongs to the same
  company and same booking**. It refuses cancelled/void/rejected/reversed source
  records at link time. It has explicit allowlisted source tables and no
  dynamic user-provided SQL.
- Immutable deduplication constraint `(change_request_id,source_type,source_id)`
  blocks duplicate links and duplicate timeline entries on network retries.
- RLS and SELECT-only browser privileges: source evidence details are
  available only to active staff with bookings_view + financial_view.
  Browser clients cannot INSERT, UPDATE or DELETE evidence directly.
- Existing booking timeline receives only a sanitized event with type and
  link ID, not sensitive cost, amount, payment reference or customer details.
- New `BookingAmendmentEvidencePanel` appears within existing
  `BookingWorkspace → تعديلات الرحلة` for staff with financial permissions,
  after the supplier handoff exists.
- The UI picks from actual booking financial records, displays known status
  and value, and lists all historical document links.
- Builds on existing `useBookingFinancials` and
  `BookingAmendmentHandoffPanel`; no new external provider credentials.

## CRITICAL: What a linked document means

Linking a financial or system document proves only that a source row existed
for this booking and organization **at the moment of the operation**.
It **does not prove**:
- the booking was amended in the supplier's system;
- a payment settled, cleared its bank or was allocated to an invoice;
- a refund was actually issued or reached the customer;
- the linked invoice amount corresponds to the change delta;
- a generated document was sent or accepted.

The stored status is historical. A payment could later be reversed or
cancelled; the operator must re-open the authoritative financial record.

## Automated acceptance

The PostgreSQL 16 disposable fixture executes Sprint 1 + Sprint 4 tests,
then verifies:
- all five source types can be linked;
- record IDs from other companies and other bookings are rejected;
- cancelled/void documents are refused;
- unauthorized staff cannot link or read the finance-sensitive evidence;
- another company's manager cannot link or read it;
- a rejected amendment cannot receive links;
- duplicate attempts return the existing link with one timeline event;
- source invoice/payment amounts do not change;
- a later payment reversal does not rewrite historical status snapshot;
- composite foreign-key blocks a cross-tenant evidence row;
- original timeline does not expose payment references or amounts.

TypeScript/build CI runs with PostgreSQL tests.

## Known blockers and next steps

- This branch stacks on **draft PR #29** and draft PR #26.
- The live Lovable Cloud database is reported enabled but has continued
  failing read-only SQL queries. No production database write or rollout.
- Existing account permissions, source schemas and authorized two-company JWT
  behavior must be confirmed on a real isolated staging environment.
- Snapshot amounts may have different currencies. Never sum them without
  documented FX source and accounting controls.
- The evidence link intentionally does not auto-advance the handoff, approve a
  payment, post a credit note or send a WhatsApp message.
- Before actual financial execution, integrate approved provider booking
  changes and the existing refund/payment authorization flows with
  independently verified statuses, invoice allocations and audit trails.
- An audited policy for small companies without three independent reviewers
  remains a blocking product decision for the preceding handoff stage.
