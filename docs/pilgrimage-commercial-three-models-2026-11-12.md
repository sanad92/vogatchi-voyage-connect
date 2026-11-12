# Safar ERP — Hajj & Umrah: three commercial sale models

**Stage:** Draft PR #42, stacked on PR #41. **Not merged, migrated or published.** No current customer/booking/accounting records were changed.

## Commercial models

| Model | What is quoted | Buyer | Program | Inventory status |
|---|---|---|---|---|
| Group seat | 1+ places within a defined Hajj/Umrah group | CRM customer | Required and same company/type/currency | Quote only; does not reserve capacity |
| FIT | Individually assembled hotels, flights, transfers and optional services | CRM customer | Independent of group program | Quote only; supplier confirmations still needed |
| B2B group | Whole contracted group, typically a travel agency | B2B agency partner | Optional; required for linked group-seat quote | Quote only; does not reserve seats or trigger a B2B invoice |

Organizer: the ERP tenant operates its own package and can add constituent service suppliers as internal costs.

Distributor: the ERP tenant resells an external organizer's package, with an authorized same-tenant upstream supplier. This is **not** a live supplier booking link.

The `pilgrimage_sale_items` table stores quantity, unit selling price, and server-generated line totals. Internal supplier costs are in a **different RLS-protected table** and cannot be read by a regular organizational viewer. A missing cost item means that margin is unknown, **not zero cost**.

## Delivered

- Company-specific agency directory for B2B buyers; links to existing CRM customers and suppliers in the new sale's owning organization.
- Draft quotes with grouped/retail/B2B mode, organizer/distributor designation, type, quantity, currency and travel dates.
- Line-item services (program seats, hotels, flights, transfers, visa service, guides and other), optional internal costs, preliminary traveler list.
- SQL constraints for one buyer model, upstream supplier selection, program currency/type, service/party quantities, no anonymous reads, cross-tenant references and role-restricted writes.
- Fixed draft-to-issued/cancelled lifecycle: quoted selling price and internal cost cannot be silently changed.
- Before issuing a program-linked group quote, the server checks that the program is currently open and that the requested group size does not exceed current unregistered capacity. **Other pending quotes are not holds, and capacity can change after the quote.**
- Transactional `clone_pilgrimage_sale(uuid)` creates a **new** draft with new IDs and copied services/costs/travelers; records `supersedes_sale_id` without changing the old quote.
- Quote preview/print and Excel service breakdown. This is explicitly not an approved Hajj/Umrah contract, visa, permit, financial invoice or supplier confirmation.
- Domain logic and PostgreSQL 16 fixture automated tests + TypeScript and production build.

## Operational requirements not silently assumed complete

1. **Reservation/seat allocation:** A quoted group or B2B allocation does **not** consume program capacity. It must be accepted/converted only through a server-serialized reservation workflow that counts existing individual pilgrims and group allocations without double-counting.
2. **Real supplier booking:** FIT services, hotels, GDS flights and religious travel platforms require separate authorized confirmations and their own booking references.
3. **Finance:** The quote does not post revenue, customer receivable, an invoice, a cash journal, an installment or a supplier payment. Existing direct pilgrimage receipts without an issued invoice may be posted to *customer advances*. A complete conversion requires proper customer invoicing/allocation, tax handling, supplier payables, approvals and refund reversal in the main finance ledger.
4. **B2B buyer accounts:** Agency directory is distinct from a verified debtor/sub-ledger account. An invoiced B2B partner must be linked to an authorized CRM/financial customer account before issuing an actual receivable.
5. **Traveler documentation:** The preliminary list stores names and links only. Existing pilgrimage traveler records remain the authoritative source for verified passport/visa/ticket/room information. No government system issuance is claimed.
6. **Commercial compliance:** Season-specific permitted terms and procedures, external operator credentials, official booking/permit workflows and client contract signoff are separate from this PR.
7. **Safety gate:** Apply only to a verified staging clone first and conduct real two-tenant signed-in RLS, performance, invoice/journal, concurrency, print and rollback testing. This is not a release signoff.

## Installation order on a future staging clone

1. Reconcile PR #41 pilgrimage operational guardrails against actual live table/RPC/trigger definitions. Deploy it only after staged acceptance.
2. Apply `scripts/deploy-pilgrimage-sales-models.sql` on the clone in one migration, with permissions verified.
3. Test manually with two JWT-authenticated companies (owners, managers, agents, viewers, deactivated members). Validate one Group-seat quote, one FIT quote, one B2B quote, resale with upstream supplier, cost invisibility and quote revision.
4. Review pending invoicing and seat allocation design before enabling any "confirm booking" action.
5. Merge/deploy only after approved versioning, backups, monitoring, smoke tests and rollback plan.

## Test harness

`scripts/test-pilgrimage-sales-models.sql` creates disposable synthetic organizations and PostgreSQL roles. It does NOT use or clone real customers and must **never** be run against Lovable Cloud or any persistent hosted database.

CI: `.github/workflows/pilgrimage-qa.yml` uses independent PostgreSQL 16 fixture jobs for the prior operational module and the new commercial module, alongside Bun domain tests, TypeScript and the Vite build.

## Evidence / references

- Source: `src/components/pilgrimage/PilgrimageSales.tsx`
- Model: `src/lib/pilgrimage/sales.ts`
- SQL: `scripts/deploy-pilgrimage-sales-models.sql`
- SQL tests: `scripts/test-pilgrimage-sales-models.sql`
- Project: `sanad92/vogatchi-voyage-connect`; draft PR #42
