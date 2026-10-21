# Launch verification — 2026-10-20

## Verified in this review

- Live Cloud health: database and connection pool up, memory 42–45%, disk 12%, connections 19–22/90, no recent resource-exhaustion alerts. No further resize performed.
- Authenticated browser using the explicitly selected admin account: dashboard, quotes, bookings, invoices, supplier payment orders, financial approvals and company inbox loaded without page errors.
- Real existing booking `VGT-IMP-2025-0152`: selling 91,500 EGP, supplier cost 87,000 EGP, profit 4,500 EGP.
- Its customer profile displayed the same 91,500 EGP spending. Invoice `INV-VGT-00167-cffdeb`, opened using the invoice list's **عرض** button, showed 91,500 EGP total, 91,500 EGP paid and zero remaining.
- `/invoices/:id` is not an existing application route. The actual invoice experience is a dialog from `/invoices`; the exploratory direct URL returned 404, not an invoice-rendering failure.
- Company inbox contained real stored email messages. This confirms mailbox data is linked; it does not prove a fresh SMTP send or fresh IMAP synchronization.

## Corrections delivered

- Customer and supplier ledger caches now include the organization and remain disabled without an active organization.
- Quote-linked bookings are queried and cached by organization; query errors are propagated rather than hidden as empty results.
- Flight cancellation/refund status calls explicitly target flight records, not the RPC's default hotel table.
- All four hotel/flight cancellation/refund status dialogs check lookup errors, RPC errors and positive server acknowledgment before displaying success.
- Applied `secure_legacy_booking_status_updates`: preserved signature, switched to invoker security so caller RLS remains effective, validates identity, type, status, organization write eligibility and action-specific permission, rejects missing/no-op updates, denies anonymous execution.
- Updated the quote-conversion test's missing child-component mocks.

## Tests executed successfully

`test:core`, `test:finance`, `test:company-core`, `test:navigation`,
`verify-atomic-quote-ui.mjs`, `verify-atomic-booking-ui.mjs`,
`verify-quote-conversion-ui.mjs`, `verify-payment-acceptance.mjs`,
`verify-launch-regressions.mjs`, `verify-booking-status-dialogs.mjs`,
`verify-booking-status-security.mjs`.

The status SQL test executes the applied migration in isolated PostgreSQL and tests unsigned, cross-organization, insufficient permission, invalid type/status, missing record, correct-table targeting and execution grants. Browser screens and the paid invoice were inspected visually. Latest preview build signal: build OK.

## Launch blockers still open

1. No newly created customer → quote → booking → invoice → payment journey was executed end-to-end in this review. Existing paid records are read-back evidence, not proof of a new transaction. Do this in an isolated test organization/environment before introducing financial test entries to the shared production backend.
2. Complete cancellation accounting remains unverified: client penalty, supplier penalty, credit note, supplier settlement and preserved financial history. Status changes alone are not a monetary refund.
3. Live `post_customer_refund` posts the sales-return component without an explicit VAT reversal. Taxable invoice returns require an invoice-linked net/VAT split and accounting acceptance testing before general release.
4. Legacy flight/hotel invoice creators still insert the service ID as the invoice booking reference and then separately update the service flag without checking its error. Parent-booking linkage and atomic/idempotent issuance need implementation and acceptance testing.
5. Full live cross-company role/permission/export coverage, ledger/period-close acceptance, subscription checkout acceptance and backup restore remain unverified.
6. No customer message was sent, no ownership was changed, and no fresh external WhatsApp delivery was tested. A designated internal test recipient is required for outbound communication checks.

**Decision:** operational availability verified; full public launch not approved. No 100% readiness claim or numerical readiness score can be justified by this review.
## Live QA cycle — 2026-10-21 (company "SafarERP QA", user qa.launch@safarerp.com)
- Quote: 10,000 sale + 1,400 VAT = 11,400; profit 2,000 (VAT excluded).
- Conversion → booking + invoice INV-2026-00187 + supplier order (8,000).
- Journals: cost 8,000 Dr 5000 / Cr 2000; invoice Dr 1100 11,400 / Cr 4000 10,000 + Cr 2100 1,400; payment 5,700 Dr 1010 / Cr 1100.
- Refund 1,140: Dr 4050 1,000 + Dr 2100 140 / Cr 1010 1,140; treasury 5,700 → 4,560.
- Fixed: new companies had no chart of accounts and no settings/currency (quotes blocked) — now seeded on creation and backfilled for 38 companies.
- Fixed: invoice "paid / partly paid" counters and badges ignored the stored statuses.
- Isolation: QA user sees 0 foreign customers/invoices/companies; cannot self-activate subscription or approve its own transfer.
- Not tested: platform approval of transfer, real Paymob payment.
