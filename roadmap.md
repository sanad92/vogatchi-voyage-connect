# Launch execution

- [x] Apply approved SafarERP name, original logo, palette and typography; preserve tenant identities; public home/login/pricing and navigation verified. Authenticated dashboard visual check remains unavailable without a session.
- [x] Fix queued email read/unread persistence; reproduce old denial and verify staff persistence, unchanged ownership/workflow and tenant isolation in isolated PostgreSQL.
- [ ] Verify queued email read/unread in the authenticated live UI (blocked: signed out; requesting user's account could not be matched for session restoration).
- [x] Check live Cloud health after the approved resize.
- [x] Run financial, booking, conversion and access regression tests; fix failures.
- [x] Check authenticated operational screens and real booking/customer/paid-invoice read-back.
- [x] Record verified results and remaining launch blockers without claiming 100% readiness.
- [ ] Execute a newly created full financial journey in an isolated test organization/environment (blocked: safe test scope and recipient not designated; current backend also serves production).- [x] Refund posting reverses VAT proportionally from the source invoice (net to sales returns, VAT to tax account, cash credited in full).
- [x] Onboarding audit: new company gets owner role, 14-day trial on an active paid plan, chart of accounts and routing; all existing companies have a subscription and accounts.
- [ ] Live test of a paid refund and a new-company signup + Paymob/bank-transfer activation (blocked: needs a designated test company and test payment).

- [x] Arabic/English switch foundation: language toggle in top bar, saved per browser, page direction RTL/LTR, side menu flips sides, menu and top bar translated.
- [ ] Translate inner page content (~145 screens still fixed Arabic/RTL) — next batches by module.
- [ ] Visual check of English mode while signed in (blocked: no preview session for the requesting account).
- [ ] Live financial cycle + new-company signup/payment test (blocked: needs approval to create a labelled test company on the live backend).
- [ ] Final launch review: permissions, backups, performance, support paths.
