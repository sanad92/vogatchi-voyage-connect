# Launch execution

- [x] Audit tenant isolation after business-email enforcement: patch 11 NULL-role authorization bypasses, enforce verified work email in RPCs and pending invitation insert/update, and prohibit membership identity changes; 41 isolated regression assertions passed and deployed definitions verified.
- [ ] Verify hardened invitation flow in authenticated live UI (blocked: requesting user's email has no matching auth account; needs a signed-in preview session).
- [ ] Receive the requested deep security scan results (blocked: background scan notification).

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

- [x] Platform support tickets (company /support + platform /platform/support)
- [x] Hajj & Umrah module (/pilgrimage)
- [ ] English translations for support & Hajj/Umrah screens; ticket attachments

## 2026-11-19 release checkpoint

Baseline: main [493d45fc](https://github.com/sanad92/vogatchi-voyage-connect/commit/493d45fcc7fe0a6270181514c6d66421c6f3f3). The team follows the manager and specialist profiles in [#120](https://github.com/sanad92/vogatchi-voyage-connect/pull/120) while that PR is open. The mobile candidate is [#111](https://github.com/sanad92/vogatchi-voyage-connect/pull/111). The July readiness report describes the earlier web pilot. Current acceptance includes web and mobile.

| Priority | Owner | Exit evidence |
| --- | --- | --- |
| 1 | Finance manager, with Treasury and Accounting | Booking collection requires the correct treasury account. A deliberate advance leaves the invoice open. The invoice, journal and treasury agree after posting. A split FX receipt balances in base currency. Record independent QA, finance and access review. |
| 2 | Organization Settings and Platform managers | Signup, business-email invitation, member roles and tenant boundaries verified against test organizations. Provider payments and transfer approval verified only in designated test environments. |
| 2 | Sales, Operations, Finance, Pilgrimage and Supply managers | Exercise customer, quote, booking, invoice, collection, amendment, cancellation, refund and supplier closeout with test data. Trace Umrah inventory and accounting through those handoffs. |
| 2 | Mobile manager | Android APK build, install, and update evidence. iOS build and runtime evidence recorded separately. Check notifications with supported test devices and credentials. |
| 3 | Development director and Release | Record builds, failed checks, rollout order, and remaining decisions before declaring readiness. |

- Passed on the baseline or this test-only branch: production-mode Vite compilation with local fixture configuration, SaaS/company/CRM core, business-email validation, tenant isolation (41 assertions), department/HR permissions, quote and booking UI fixtures, payment acceptance (11 fixture cases), booking status SQL, supplier closeout, bank baseline and financial formulas. The bank-reconciliation permissions harness had a missing spreadsheet sanitizer import. It passes with the production sanitizer loaded by the harness.
- Existing work covers Paymob sandbox [#100](https://github.com/sanad92/vogatchi-voyage-connect/pull/100), branch POS [#67](https://github.com/sanad92/vogatchi-voyage-connect/pull/67), branch Inbox [#66](https://github.com/sanad92/vogatchi-voyage-connect/pull/66), and pilgrimage agency/inventory proposals [#42–45](https://github.com/sanad92/vogatchi-voyage-connect/pulls?q=is%3Apr+is%3Aopen+pilgrimage). Confirm which open proposals are required for the release before integrating them.
- Mobile [run 44583713953](https://github.com/sanad92/vogatchi-voyage-connect/actions/runs/44583713953) at PR head `dc33ff02` produced an [Android debug APK](https://github.com/sanad92/vogatchi-voyage-connect/actions/runs/44583713953/artifacts/14561550792) with install, launch and v3-to-v4 update on an Android emulator, and an iOS Simulator build. Device notifications, distribution signing and iOS execution remain to be verified.
- Continue with `codex/release-collection-integrity` for the collection changes and rerun related gates against that head. The Operations checkout is `codex/release-booking-verification`. Authenticated staging verification needs designated users, roles, and two isolated test organizations. Production rollout requires separate authorization.
