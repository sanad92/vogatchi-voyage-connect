# Safar ERP — Hajj & Umrah module release checklist
Status: **DRAFT** | Last reviewed 12 November 2026 | Pull request #41

## Existing production components (verified from source and database metadata)
- /pilgrimage program CRUD, room-category pricing, pilgrim registration and CRM linking.
- Program-level capacity/status, Makkah and Madinah rooms, bus assignments and supervisors.
- Pilgrim passports, visa-status fields, manually recorded vaccinations and documentation flags.
- Customer payment records, basic printable receipts/contracts, flight and rooming spreadsheets.
- Three existing live tables: pilgrimage_programs, pilgrimage_program_costs, pilgrims, plus customer_payments.pilgrim_id.
- Existing customer_payments trigger creates a general-ledger journal via post_customer_payment.
  **Without an allocated issued invoice, this posts as a customer advance rather than program revenue.**

## Proposed changes in PR #41 — NOT DEPLOYED
- Calculate receivables and refund exposure independently, avoiding negative receivables.
- Validate dates, room prices, capacity, stage eligibility and program currency.
- Operational traveler-readiness checks and reports (visa, documentation, room allocation and balance).
- Separate domestic identification workflow from international passport/visa workflow.
- Server-side SQL guardrails: tenant-bound program/customer/fee data, capacity serialized by program row lock, immutable paid price after collection, revocation of browser hard deletes, restricted cancellation, linked payment/customer/currency guards.
- User-facing payment collection now requires a treasury matching program currency and payment method, explicit FX rate into base amount, and a stable client reference for retries.
- Programmatic isolated fixture tests, TypeScript check and frontend build in GitHub Actions.

## Critical release blockers

### A. Finance and customer lifecycle — not complete
1. A pilgrimage sale needs an authorized source document: program price agreed, booking/invoice or installment plan (with approved VAT/tax handling), issue/publish accounting posting, and a unique pilgrim source link. Original bookings currently restrict booking_type to hotel/flight/transport/car_rental; pilgrimage is not included.
2. Verify customer payment posting and allocations on the **actual** finance schema, customer ledger, cash/bank balances and foreign-currency exchange treatments. Existing direct payments generally credit the customer advance account until allocated; calling this completed revenue is incorrect.
3. Implement reviewed cancellation invoice/credit-note/refund request sequence with finance approval and actual reversal journal. Refund exposure UI is not a refund.
4. Program costing must be modeled per supplier/service/group (hotel, transport, airline, visa service, guides); current cost_per_person is a rough estimate, not a verified P&L.
5. Verify two-person approvals for changing contracted prices, cancellation fees, supplier payables and financial adjustments.

### B. Traveler operations — not complete
1. Store and view documents securely per organization/pilgrim (passport, identity, vaccination record, visa/permit, contract and ticket), with private object storage and file size/type/retention controls; currently only flags and reference strings.
2. Implement structured guest lists, family/room occupancy, bus manifests and supplier confirmations with status history and audit trail, not only free-form room/bus text.
3. Source-approved ticket/visa/permit statuses need manual evidence and audit trail. A field marked "issued" is **not proof** that an actual visa or permit was issued.
4. Operational workflows for departure/arrival, missing documents, travel incidents, missed flight, no-show and post-trip closure, with owner and SLA.

### C. Legal/regulatory and credentials — not complete
1. Keep Egypt Umrah Portal, Saudi Nusuk and authorized supplier processes external unless official access/credentials exist. Never claim that an ERP has issued a real visa, Hajj permit or Umrah reference.
2. Get the agency's approved current-season terms, cancellation policy and permitted document templates before printing a legally branded contract; app boilerplate is not a substitute.
3. Define season-specific validations as configurable rules reviewed by operations/legal rather than embedding universal 6-month passport or vaccine/visa logic. Country, nationality and route can change requirements.

### D. Staging, security and release — not complete
1. Verify Lovable project/database target, create a disposable staging clone without exporting real passport/customer data to CI.
2. Apply the draft guardrail SQL to the verified clone; review existing triggers, RLS, grants, enum/type compatibility and rollback for existing records.
3. Test as two *actual JWT-authenticated* organizations (manager, agent, viewer, inactive member), including direct RPC/REST writes. Current fixture uses simplified mocked authorization.
4. Exercise concurrent signups/payments, retries/duplicates, program closure, cancellation, debit/credit balance, FX, supplier ledger, refunds and generated documents.
5. Confirm a privacy posture for sensitive identification details and minimize who can read passport data.
6. Merge after approval, deploy to staging, sign off, deploy to production with monitoring and rollback. **Do not automatically merge or publish this PR**.

## Source-of-truth links
- Egyptian Ministry of Tourism and Antiquities: https://mota.gov.eg/
- Egyptian Umrah Portal: https://umrah.eg/
- Saudi Nusuk Umrah: https://umrah.nusuk.sa/
- Saudi Nusuk Hajj: https://hajj.nusuk.sa/
These are external operational and government-facing systems; links are for manual verification, not asserted private API connectivity.

## Current verdict
**MODULE IN DEVELOPMENT / NO-GO FOR DECLARING COMPLETE.** GitHub checks exercise code and disposable fixtures only. Neither a production migration nor an actual provider or portal call has been executed.
