# Launch execution

- [x] Apply approved SafarERP name, original logo, palette and typography; preserve tenant identities; public home/login/pricing and navigation verified. Authenticated dashboard visual check remains unavailable without a session.
- [x] Fix queued email read/unread persistence; reproduce old denial and verify staff persistence, unchanged ownership/workflow and tenant isolation in isolated PostgreSQL.
- [ ] Verify queued email read/unread in the authenticated live UI (blocked: signed out; requesting user's account could not be matched for session restoration).
- [x] Check live Cloud health after the approved resize.
- [x] Run financial, booking, conversion and access regression tests; fix failures.
- [x] Check authenticated operational screens and real booking/customer/paid-invoice read-back.
- [x] Record verified results and remaining launch blockers without claiming 100% readiness.
- [x] Full financial journey executed in test company "SafarERP QA" (2026-10-21): customer → quote → booking+invoice → payment → treasury → refund; all journals balanced, VAT reversed proportionally.
- [x] Refund posting reverses VAT proportionally from the source invoice (net to sales returns, VAT to tax account, cash credited in full).
- [x] Onboarding audit: new company gets owner role, 14-day trial on an active paid plan, chart of accounts and routing; all existing companies have a subscription and accounts.
- [ ] Live test of a paid refund and a new-company signup + Paymob/bank-transfer activation (blocked: needs a designated test company and test payment).

- [x] Arabic/English switch foundation: language toggle in top bar, saved per browser, page direction RTL/LTR, side menu flips sides, menu and top bar translated.
- [x] Inner page content translated to English (~10.7k interface strings) and fixed RTL blocks flip to LTR in English; switching back restores Arabic. Remaining: dates still in Arabic format, some text alignment classes stay right-aligned.
- [x] English/Arabic switch verified signed in (QA company): direction, side menu and top bar flip correctly.
- [x] New-company signup via real screens: owner, 14-day trial, chart of accounts and default currency now seeded automatically (two onboarding gaps fixed); owner cannot self-activate; bank-transfer request submitted.
- [ ] Platform approval of the QA bank transfer and a real Paymob payment (blocked: needs a platform-admin session and a real card payment).
- [x] Launch review: tenant isolation verified, DB healthy (memory 43%, disk 12%), managed daily backups (in-app backup log unused).
- [ ] Security hardening: 278 signed-in-callable privileged database functions to review (non-blocking for pilot).
