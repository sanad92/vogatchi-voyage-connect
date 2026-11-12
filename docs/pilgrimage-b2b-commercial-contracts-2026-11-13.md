# Safar ERP — حج وعمرة: B2B agency contracts, debtor accounts and provisional group rosters
**2026-11-13 | Draft PR #45 | Staging-only**

## Commercial workflow (agency is the buyer, not each pilgrim)

1. Create a `b2b_group` quotation in the **same organization**, naming the buyer agency, commercial program, group size, and wholesale prices.
2. Explicitly choose an **existing CRM customer record that represents that travel agency**. The current CRM `customers` schema has no verified legal-entity type, so an authorized operator must check the debtor's identity; do not infer the company from a passenger, passport or shared family phone.
3. Prepare a **draft internal B2B agreement**. The server takes the issued quote's complete selling price as the agreement amount and captures currency, terms and 1–12 proposed installments. **The sum of installments must equal 100% of the sale**. Different fingerprint on retry is rejected rather than silently overwriting terms.
4. For an agency group linked to an internal `pilgrimage_programs` program, hold and then allocate the contracted quantity using PR #43. The internal approver can mark the commercial agreement `approved_internal` only while those full seats are internally allocated.
5. Once internally approved, managers may add a **preliminary agency roster** of up to the group's capacity. Every name has an optional room category and append-only add/remove actions; changes never delete history. This is a **provisional name list, not registration as a pilgrim or external supplier confirmation**.
6. View and print a **non-binding internal commercial summary** and payment schedule. It is not a signed client contract, fiscal invoice, cash receipt, journal entry, official permit or visa.

## New staged objects

- `pilgrimage_b2b_agency_accounts`: organization/agency → unique CRM debtor binding, created through the contract RPC only.
- `pilgrimage_b2b_agreements`: immutable quote amount, agency, debtor, currency, commercial terms, approval status and approver attribution.
- `pilgrimage_b2b_installments`: exact per-currency payment milestones and due dates, initially *expected payments* only.
- `pilgrimage_b2b_roster_entries`: provisional group names, with strict active count and reversible soft removal.
- `pilgrimage_b2b_roster_events`: audit of additions/removals.
- Manager-authorized, organization-gated RPCs: `prepare_pilgrimage_b2b_agreement`, `approve_pilgrimage_b2b_agreement`, `add_pilgrimage_b2b_roster_name`, `remove_pilgrimage_b2b_roster_name`.
- Backend trigger blocks release of internally allocated seats while an internally approved agency agreement remains active. This requires a later **managed cancellation/reversal** flow rather than a UI status flip.

## Safeguards

- SQL `SECURITY DEFINER` functions pin an empty search path and check authenticated org manager role. Anonymous, different tenant and same-tenant viewer are denied agreement/roster access; there are no direct browser write grants.
- Contract creation/approval uses quote, program and internal seat-allocation locks; a genuine **two-session PostgreSQL race test** verifies approval cannot be silently undermined by concurrent seat release.
- Buyer agency, CRM debtor and sales quote must be in the same organization. A CRM debtor bound to one agency cannot silently be re-linked to another agency.
- A new B2B contract must be created from a new quote revision if commercial terms/pricing change; existing quoted terms and approved snapshots are preserved.
- Names and room categories never create `pilgrims` rows or per-person retail balances. Roster capacity is checked under a contract row lock, and event history preserves replacements.
- The UI validates installment amounts in integer minor currency units to avoid false rejection of values such as 0.29. The server independently enforces non-negative, two-decimal, within-date and equal-to-total checks.

## Database and QA

**Do not apply these scripts against hosted/production data.**
- `scripts/deploy-pilgrimage-b2b-agreements.sql` after staged PR #41 → #42 → #43 → #44.
- `scripts/deploy-pilgrimage-b2b-roster.sql` next.
- `scripts/test-pilgrimage-b2b-agreements.sql`: isolated synthetic agency/tenant/role, approved allocation, payment schedule, retry and fake-debtor resistance.
- `scripts/test-pilgrimage-b2b-concurrency.sh`: two separate PostgreSQL 16 sessions race approval against seat release.
- `scripts/test-pilgrimage-b2b-roster.sql`: synthetic 10-person group, 11th name denied, retry idempotency, replacement history, cross-tenant privacy and no real pilgrim row creation.
- `src/lib/pilgrimage/b2b.test.ts`: JavaScript decimal/minor-unit and schedule checks; CI TypeScript and Vite build.

All work is authored through **GitHub only**, with ephemeral GitHub Actions databases. No Lovable usage, Lovable Cloud credits, real user data, production migrations, external government/supplier systems or financial posting are included.

## Remaining before full Hajj/Umrah release

1. **Approved invoice/agency debtor ledger**: find/verify actual `invoices`, `customer_payments`, `payment_allocations`, receivables GL and tax treatment; create an issued B2B invoice with 1:1 agreement reference and approved finance postings, not an unposted schedule. Handle deposits, exchange differences, VAT and supplier costs without attributing the whole contract to each pilgrim.
2. **External operator workflow**: confirmations, supplier contract references, hotel rooms, transport, flights, government portal interactions only with authorized systems.
3. **Reconcile group roster with actual travel documents** and operational program passenger records without double counting seats; support partial agency submissions/replacements, family/rooming policies and no-shows.
4. **Supervised cancellation and refund/reversal** for approved company agreements, supplier liabilities and inventory; a simple release is intentionally disabled.
5. **Secure private identity-document storage**, auditable access/retention and current-season legal/operator terms and contract approval.
6. **Separate staging target**, real signed-in organization/JWT RLS and provider/accounting integration QA, backup/rollback and release approval.

**Status: Draft functionality, not production-ready and not a complete legal, accounting or supplier booking workflow.**
