# Safar ERP Hajj/Umrah — Retail Group Seats → Program Registrations

**Stage:** Draft PR #44, stacked on PR #43 → #42 → #41. **Not deployed.** Written and tested only using GitHub source and ephemeral GitHub Actions PostgreSQL; **no Lovable credits consumed.**

## What the conversion does

For **Group Sales to a retail customer** (`sale_model=group_seat`), an issued quote with a full internal seat allocation can be converted in one database transaction to individual rows in the existing `public.pilgrims` program register.

It creates an immutable `pilgrimage_retail_conversions` header and one `pilgrimage_retail_conversion_travelers` link for each quote traveler → pilgrim record, then appends a **converted** event to the existing allocation history.

The invoice, payment receipt, supplier confirmation, official travel status and visa/permit are **not** created or marked complete. The generated `pilgrims.total_price` is an **operational/program tariff snapshot**, not an invoice or recognized accounting revenue. The existing pilgrimage UI can see new registered pilgrims for further document review and operations.

## Why this is deliberately restrictive

Conversion is allowed only if:
- The caller is an authenticated organization owner/admin/manager.
- The quote is **quoted**, of `group_seat` type, with a buyer CRM customer and a linked organization-owned program that is currently **open**.
- Exactly `party_size` traveler names exist, all at least three characters, with explicit room categories and no already-linked registered pilgrim.
- The quote contains only program-seat items. Each seat category has the same per-person selling price as the program's configured tariff, and the number of travelers in that category matches the priced seat quantities.
- The quote has an **allocated** (not just held) internal allocation with exactly the same seat count.
- The current capacity still permits swapping the allocation into individual registered rows without exceeding the program limit.

For B2B agency contracts and FIT, the function rejects conversion. A B2B group's contracted wholesale price cannot automatically be assigned as an individual consumer account receivable; FIT requires independently confirmed service orders. Both must use a later, separate finance-aware conversion.

Existing program pilgrims linked to a quote are blocked by the prior stage's allocation guard; those cases need a reconciled booking rather than a second registration.

## Transaction safety

The conversion RPC obtains the **quote lock → program lock → allocation lock**, the same sequence as the PR #43 seat-allocation RPC. It checks all participants and prices before applying any inventory mutation.

Inside one PostgreSQL transaction it changes the allocation from `allocated` to `released`, inserts all new `pilgrims`, writes the immutable mapping and logs the conversion event. Concurrent operations cannot take released seats before the new registered pilgrims are committed because the parent program row is locked. A failure rolls back the *entire* transaction; no partial group registration is retained.

Retries after success return the same conversion ID. The original quote remains frozen, and it cannot be re-held or cancelled outside the later supervised cancellation/refund process.

The migration intentionally grants no browser write permission for conversion or its lineage tables. Authenticated tenant members can read their own organization's conversion history; cross-tenant access is blocked by RLS.

## UI

The Group/FIT/B2B sales workspace now offers room category entry per preliminary traveler and an explicit **Convert to Registrations** confirmation screen after internal allocation. The confirmation states that invoice, payment and government/supplier credentials are separate steps. A converted badge and audit entry show successful registration.

For B2B, the workspace clearly warns that agency billing and contract settlement must be built before individual financial registration is allowed.

## Automated verification

`scripts/test-pilgrimage-retail-registration.sql` creates a **disposable** database and executes the real SQL migration chain #41 → #42 → #43 → #44. Synthetic tests check:

- Organization/role authorization (manager succeeds; agent, other tenant and anonymous rejected)
- Exact named traveler and room mapping, program tariff parity and buyer reference
- Atomic replacement of two allocated seats with two genuine program pilgrim rows
- Zero payment posting, `registered` status and tariff correctly stored in each new pilgrim
- Idempotent retry, immutable conversion mapping, converted audit, and prohibition on re-holding or cancelling a converted group sale
- Rejection of incomplete names, missing room, mismatched per-person tariff, and B2B sale conversion
- Failure rollback leaves allocation active and does not partially create passenger rows

`scripts/test-pilgrimage-retail-concurrency.sh` opens two separate PostgreSQL sessions: while session A converts the last two allocated seats to actual registered pilgrims in an uncommitted transaction, session B tries to hold another seat in the same full-capacity program. Session B must wait, then fail, rather than overbook.

CI retains earlier program, 3-model sales, allocation and frontend tests.

## Why it is NOT production-ready yet

1. **Staging, not Lovable:** A verified non-production database with the real schema, real JWT-authenticated org roles and migration/rollback testing is still required. Github's ephemeral PostgreSQL fixture is a contract approximation, not a hosted staging environment.
2. **B2B/agency invoice and debtor:** Formal contract, debtor-account link, margin/tax/FX, deposits, invoice allocation, supplier payable, and a controlled B2B group traveler roster after signing.
3. **FIT source confirmation:** Per-service vendor references and status evidence for hotels/airlines/transfers and other components; no automatic provider booking assumed.
4. **Refund/cancellation finance:** Any already registered group cancellation requires a controlled approval, refund and reversing journal workflow; cancellation cannot be a simple quote field flip.
5. **Traveler compliance:** Private passport/ID storage, correct season requirements and official third-party Hajj/Umrah operator workflow and legal contract templates.
6. **Release:** Merge only after all critical prerequisites verified and signed off.

**No Lovable Cloud calls, no customer data, and no production financial postings were made in this implementation.**
