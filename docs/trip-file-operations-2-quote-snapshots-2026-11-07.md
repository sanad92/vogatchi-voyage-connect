# Safar ERP 2.0 — Quote Version Snapshots (Sprint 2)

Status: **staged code only, no hosted database writes, merge or deploy**.

## Existing functionality reused

- `public.quotes` and `public.quote_items` (existing core quote model).
- Current `QuoteDetails` page, with quotation, customer, pricing, item
  quantities, supplier costs and selling prices.
- Existing organization permission model, including `quotes_edit`,
  `quotes_view` and `financial_view`.

## Delivered

- `public.quote_version_snapshots`: **immutable, append-only** manual version
  archive. Stores a sanitized quote header and structured item snapshot.
- `capture_quote_version_snapshot(quote_id)`: requires active membership and
  BOTH `quotes_edit` and `financial_view`; locks the source quote to
  serialize version numbering, captures items and returns the version.
- Each archive is numbered V1, V2, V3... and fixed to one quote/company.
- Exact duplicate content is not re-archived: a second identical call returns
  the existing version. This also protects against network retries.
- RLS allows viewing snapshots only with active company membership, quote view
  and finance view; browser roles cannot INSERT/UPDATE/DELETE the archive.
- `QuoteVersionHistory` component on existing QuoteDetails page permits
  authorized users to explicitly archive the current version and browse up
  to 50 saved versions with their historic price and item breakdown.
- No automatic edits to source quotes, conversion, bookings, invoices,
  supplier payments, customer payments or customer messages.

## Deliberately limited scope

- **Manual snapshots**: the archive is made only when a user clicks
  **حفظ نسخة الآن**. Existing quote edits and sends do not automatically
  create versions. This is not a complete legal or automatic audit of all
  historic quote changes.
- Source quote items have a complex `details` JSON field. Its snapshot is
  restricted to authorized staff with finance access and is never included
  in public printable customer documents.
- Snapshot version captures data while the quote row and current item rows
  are locked for this request. New concurrent INSERTs into quote_items are
  not serializable via only row locks; production-grade automatic revision
  capture requires a review of all quote writers and transaction protocols.
- Hashing is used for **deduplication only**; MD5 is not a signature or a
  cryptographic integrity guarantee.
- `ON DELETE RESTRICT` intentionally retains the audit archive by refusing
  deletion of an associated quote. Review deletion/retention policy before
  hosted deployment.
- Mixed-currency normalization is not attempted: one quote snapshot displays
  its explicitly stored currency and existing totals. Cross-currency
  supplier costs require a later currency-aware ledger.

## Acceptance tests before release

- Existing quote/quote_items columns match this staged schema.
- First archive captures header, item descriptions and accurate amounts.
- Repeat capture without changes returns same version.
- Edit current quote and line item; snapshot V1 remains intact, V2 reflects
  new values. The snapshot operation itself changes NO source quote rows.
- User from org B cannot read/capture org A snapshots.
- Agent without financial_view cannot read cost snapshots or capture them.
- Inactive employee, unauthenticated caller and anonymous role denied.
- Source quote with zero items is not archived as a valid client quotation.
- UI responsive; mobile/desktop, loading, error, and role controls verified.
- Real user JWT/RLS, quote review/send/convert integrations and race tests
  on an isolated clone are mandatory before production use.

## Operational deployment gate

Lovable Cloud was still reporting enabled-but-unavailable for read-only SQL.
The staged SQL script is **not run automatically by CI, PR merge, or frontend
build**. Apply only after connection recovery, schema audit and authenticated
staging validation. Do not populate real customer data into test fixtures.

## Future phase

Automated quote revision capture at every meaningful published version,
including revision acceptance/supersession. A formal Trip File amendment
application process will reconcile approved requests with supplier
confirmation, customer payment and financial ledger entries only after
managerial and finance controls pass.
