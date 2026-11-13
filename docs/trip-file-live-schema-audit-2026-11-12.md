# Trip File 2.0 — Lovable Cloud live schema preflight

Audit date: **12 November 2026**. This is **read-only metadata inspection**, not a
deployment or an authenticated tenant acceptance test.

## Connectivity

- The target Lovable project reports database `enabled=true`, `stack=supabase`.
- A harmless `SELECT CURRENT_TIMESTAMP` succeeded in this session.
- The previous repeated "Database is possibly not accessible" errors are
  therefore **not persistent at the time of this preflight**. Root cause of
  the earlier intermittent outage has **not** been established.
- Connected Supabase-project listing does not include the project's
  configured reference `gvozalurfthzxpuasplo`; do not use any unrelated
  project for production rollout.
- No customer rows were queried, modified or exported.

## Read-only schema result

The re-usable script `scripts/check-trip-file-live-readiness.sql` checked
25 expected objects in the target database.

**Present (15):**

- Original service/booking tables: `bookings`,
  `booking_timeline_events`, `hotel_bookings`,
  `organization_members`.
- Existing quotation: `quotes`, `quote_items`.
- Original finance: `invoices`, `supplier_invoices`,
  `customer_payments`, `supplier_payments`,
  `generated_documents`, `customer_payment_allocations`,
  `supplier_payment_allocations`.
- Existing functions: `has_org_permission` and
  `get_booking_profit_cockpit`.

**Absent (10):**

- Draft tables: `booking_change_requests`,
  `booking_change_handoffs`,
  `booking_change_handoff_events`,
  `booking_change_source_evidence`,
  `quote_version_snapshots`.
- Draft RPCs: `create_booking_change_request`,
  `decide_booking_change_request`,
  `record_booking_change_handoff`,
  `link_booking_change_source_evidence`,
  `capture_quote_version_snapshot`.

This agrees with the stated status of PRs #26/#29/#30/#27: their staged SQL
has **not** been applied to this Lovable Cloud database.

## Targeted type inspection

Metadata checked, without reading records:

- `hotel_bookings.check_in_date` and `check_out_date` are PostgreSQL
  `date`, and `number_of_rooms` is `integer`.
- Supplier reference and source fields exist on `hotel_bookings`:
  `booking_reference_supplier`, `booking_source`, `supplier_name`,
  plus `organization_id` and `booking_id`.
- Existing `quote_items` has `item_type`, `details`, costs, selling
  price and `total_selling`.
- Existing `booking_timeline_events` includes `organization_id`,
  `booking_id`, `kind`, `payload`, `summary` and `actor_id`.
- The live permission RPC is `has_org_permission(_org_id uuid,
  _permission text)`, consistent with the staged Edge Function call.
- The live cockpit RPC accepts `_booking uuid`.

These metadata matches are **not** proof that all staged migration triggers,
grants, enums, foreign keys, existing rows and RLS semantics are compatible.

## Release decision

**NO-GO for publishing the draft Trip File UI or Hotelbeds function.**
Reasons:

1. The five new tables and five RPCs above are not yet installed.
2. Migrations #26 → #29 → #30 and quote archive #27 need a deliberate,
   reviewed deployment sequence on a disposable staging clone first.
3. Real signed-in users from two organizations must confirm tenant-specific
   RLS and permissions; current read-only schema queries don't prove this.
4. Hotelbeds environment is not configured; there is no real test-booking
   payload or before/after amendment target.
5. Client/provider secrets, globally shared rate limiting, operations
   logs and a small-agency approval exception process are still outstanding.

**Next allowed operation:** create a verified staging clone and run staged
migrations with isolated synthetic data, then investigate role and financial
interactions. No automatic app publishing, payment/refund or supplier changes.
