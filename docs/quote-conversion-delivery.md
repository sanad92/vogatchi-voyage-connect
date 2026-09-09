# Atomic quote conversion

Implemented directly in repository code and applied to the connected database on
2026-09-09. Frontend publishing and browser acceptance have not been verified.
GitHub synchronization does not execute the SQL deployment script.

## Behavior

`convert_quote_atomic(_org, _quote)` locks and reads the saved quote and its items.
It validates company membership, write eligibility, quote view/edit scope, booking
creation and invoice creation permissions before creating or returning a conversion.
Only identifiers are accepted from the frontend; monetary values are recomputed and
checked against the persisted source.

Each supported quote creates one canonical `bookings` row with hotel, flight,
transport and/or car rental details. The existing booking automation creates the
customer invoice; conversion reuses that invoice and applies the quote discount
and VAT. Each service with a positive cost creates its own supplier payment order.
Existing supplier-invoice and journal automation handles those obligations.
A saved mapping and immutable source snapshot preserve the conversion identity.

Retrying conversion, including through the old `convert_quote_to_bookings` RPC,
returns the same booking and invoice. A late error aborts the entire conversion.
The dialog stays open on failure, disables repeated submission while pending and
opens the canonical booking only after success. Accepted quotes are convertible.

Converted quotes/items and supplier obligation amounts cannot be silently rewritten.
Link guards reject duplicate legacy service rows and a second consolidated invoice,
including writes from an already-open old frontend. Multi-supplier bookings can be
confirmed when their service obligations cover the cost. Assigning the entire
package cost to one supplier is blocked. Ordinary bookings keep their existing
financial behavior; converted bookings retain the source discount on later syncs.

## Verification

28 actual authenticated-role SQL assertions passed before deployment and again
after deployment, with all fixtures and test-only permission changes rolled back.
They cover the four supported service types, invoice/supplier/journal links,
discount/VAT, replay, confirmation, immutable source and links, late supplier
failure, invalid totals/prices/dates/types, foreign companies, explicit denial,
own versus organization scope, and inactive membership.

The mixed hotel/flight example produced gross sales 1,500, discount 100, VAT 196,
one customer invoice 1,596, supplier obligations 600 and 300, and booking contribution
500. One customer journal balanced at 1,596; two supplier journals balanced at 900
in total. These are rollback fixtures, not real financial transactions.

The actual hook/dialog/page-handler test passed, as did TypeScript, targeted ESLint
and the production build. Build warnings concern existing chunk sizes, browser-data
age and dependency annotations. No live browser acceptance was performed: prior
automatic approval review rejected browser access, and that route was not retried.
Replay was tested sequentially; simultaneous multi-session load was not tested.

After deployment and rollback verification: 6 quotes, 6 quote items, 198 bookings,
186 customer invoices, 7 supplier orders, 7 supplier invoices and 990 journals,
unchanged from immediately before deployment. No conversion fixture, mapping row
or test trigger remained. Anonymous execution is denied for both conversion RPCs;
clients cannot insert mappings or read the full source snapshot directly.

## Deployment and repeatability

Apply `scripts/deploy-atomic-quote.sql` first, then
`scripts/deploy-quote-conversion.sql` transactionally before publishing the UI to
another environment. These are versioned deployment scripts, not generated
Supabase migration history entries. The CLI migration generator was unavailable.
The conversion script includes bounded updates of the live booking normalizer and
financial-sync functions; re-review their definitions before applying it to a
database with additional changes. It performs no historical quote conversion or
balance backfill. The confirmation constraint remains NOT VALID for historical
rows; it is enforced for newly inserted or updated rows.

Run `node scripts/verify-quote-conversion-ui.mjs` for frontend behavior. To repeat
SQL verification, start BEGIN, set `qa.quote_org`, `qa.quote_owner`, and
`qa.quote_agent` to authorized fixture identities, run
`scripts/verify-quote-conversion.sql`, then ROLLBACK. The fixture company requires
one customer and two suppliers. Use an isolated test environment for repeated QA.

## Remaining limits

- Legacy quotes without a stored currency or with previous booking/invoice links
  require review before conversion; this change does not guess their currency or
  merge their historical transactions.
- Generic `service` items are rejected. Only hotel, flight, transport and car rental
  currently have a supported operational detail table. Missing customer, supplier
  for a positive cost, travel dates, or inconsistent totals are also rejected.
- Team/branch scopes are rejected for conversion because quotes lack an unambiguous
  team/branch ownership mapping. Organization scope and creator-based own scope
  are enforced. This is not certification of every other module's RLS policy.
- Optional item JSON details are preserved in the snapshot; only the basic existing
  operational fields are mapped. Mixed bookings retain the first service's type
  label, while all services remain attached to the same booking.
- Financial corrections, partial cancellations/refunds and foreign-exchange
  valuation remain separate acceptance gates. This change preserves existing
  ledger/revenue-recognition automation; it does not certify every accounting mode.

This completes the tested Q02 implementation. Production frontend publication,
user acceptance and the remaining readiness gates are still open.
