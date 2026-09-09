# Atomic unified booking creation

Implemented directly through repository code and applied to the connected database
on 2026-09-09. This is the tested creation portion of O01. Frontend publication and
live browser acceptance remain unverified.

## What changed

The previous hook saved a customer, booking and service details through separate
requests, and ignored detail-insert errors. The new `create_booking_atomic` RPC
creates the booking and its one selected hotel/flight/car/transport detail row in
one database transaction. Inline new-customer creation participates in that same
transaction. Existing invoice, supplier-order, supplier-invoice, journal, voucher
and event automation is reused. Failure of a required document aborts creation
even when the existing automation catches its internal error.

The server accepts a fixed set of fields, validates company references and active
suppliers/employees, requires booking/invoice creation and customer-view permissions,
and checks customer-create permission when creating a new customer. Canonical
customer/supplier names come from company records. New customers need a phone or
email, as required by the existing identity triggers. A same-name ambiguity needs
an explicit customer selection. Contact input is never attached silently to a
same-name person; existing duplicate-contact checks remain active.

The agreed total selling price and cost are validated and rounded, copied to the
service row and used to calculate contribution. Zero base amounts prevent a later
financial sync from adding the total twice. Hotel nights are calculated from dates;
header/service dates must agree. Positive cost requires a supplier; zero cost does
not create supplier debt. Supplied totals are not recalculated from every optional
unit-price control, which remains reference detail for this creation flow.

An internal request table records company, creator, exact payload and booking/invoice
references. Reusing the same request returns the saved result. Different payloads or
another employee cannot reuse it. Clients cannot read or write that table directly;
RLS is enabled and anonymous execution of the RPC is denied. Booking numbers use the
request UUID instead of the old COUNT-based number generator. This does not change
the existing invoice-number generator or certify concurrent invoice numbering.

The frontend makes one write RPC and no longer starts the old client-side
`booking_created` automation from this form, which could request another invoice.
Server automation and emitted events remain the creation workflow. Custom actions
configured only in that legacy client rule engine are not executed by this form;
they need a separate server workflow review before being relied upon.

Failed saves preserve the form and draft. A request key and payload hash (not the
booking data) are kept in session storage until the form completes successfully.
The same payload can therefore recover an unacknowledged save after reload in the
same tab. Company/user/payload changes use another key. If storage is blocked, key
reuse is limited to the mounted form. This is not cross-device deduplication.
The form remounts on company/user changes, ignores late responses after unmount,
and blocks repeated submission. Draft keys now include the user as well as company;
older company-only drafts are not automatically assigned to a user.

The separate explicit Add Customer dialog remains an independent customer action;
only the new inline customer fields are part of the booking transaction.

## Evidence

31 authenticated-role SQL assertions passed before deployment and again after
deployment. All fixtures and temporary permission changes were rolled back.
The tests cover four service types, financial links, replay, changed payload,
late detail failure, caught invoice-automation failure, invalid prices/counts/dates,
reference injection, unavailable company references, employee request isolation,
permission denial, inactive membership and a zero-cost service.

The hotel fixture had selling price 1,500 and cost 900, producing contribution 600,
one customer invoice for 1,500 and one supplier obligation for 900. The customer
journal balanced at 1,500 and the supplier journal at 900. Replaying creation and
running financial sync again did not duplicate the invoice or supplier cost.
These were temporary test records, not real customer transactions.

After rollback verification the business counts matched their predeployment values:
698 customers, 198 bookings, 186 invoices, 7 supplier orders, 7 supplier invoices and
990 journals. No creation-request fixture, QA customer or test trigger remained.

`scripts/verify-atomic-booking-ui.mjs` executes the actual request helper, hook and
form handlers with API/component mocks. It passed retry/reload, identity/payload
changes, incomplete responses, permissions, double click and late-result checks.
TypeScript and targeted ESLint passed. The production build passed with existing
dependency/browser-data/chunk-size warnings. This is not a live browser acceptance
test or a simultaneous multi-session database load test.

## Deployment and remaining gates

`scripts/deploy-atomic-booking.sql` is versioned deployment SQL, not a generated
Supabase migration. It was applied transactionally to the connected project. Apply
it to other environments before publishing the UI; GitHub sync does not execute it.
Its SHA-256 at deployment was
`4ac2a62b70bd07f355222fc172a970a5f3ca97c967d1e65a5d530b033e98b916`.
It adds one internal table and one RPC, without replacing the existing accounting
functions or rewriting historical bookings. Request references prevent deleting
their booking/invoice; normal cancellation remains a separate workflow.

To repeat SQL verification in an isolated environment: BEGIN; set `qa.booking_org`,
`qa.booking_owner`, `qa.booking_agent`; run `scripts/verify-atomic-booking.sql`;
ROLLBACK. The fixture organization needs a customer and an active supplier.

The Supabase CLI and direct project advisors were unavailable through the existing
connection, so no generated migration or advisor clearance is claimed. Relevant
function privilege/RLS checks were performed directly. The implementation follows
the [database-function guidance](https://supabase.com/docs/guides/database/functions);
the [current changelog](https://supabase.com/changelog) was reviewed.

Legacy direct table-write policies and other booking creation/edit screens remain
outside this RPC's guarantee. O01 does not close the module-wide authorization,
foreign-exchange, revenue-mode, ledger-closing, refunds or recovery gates. The next
planned work is F01/F02: document-to-ledger consistency, closing, collections and
supplier payments. No overall readiness percentage is certified by this delivery.
