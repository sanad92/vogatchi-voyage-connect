# Safar ERP — Trip File 2.0 Sprint 13: release-posture gate

**Status: DRAFT / GitHub fixture QA only. No migration, live data operation, provider request, production merge or deployment.**

## Changes

- scripts/check-trip-file-security-posture.sql is a **read-only pg_catalog audit**. It lists the four amendment/handoff/evidence tables, quote archive table, and five expected RPC signatures. For each it reports: existence, RLS enabled or SECURITY DEFINER, authenticated SELECT/EXECUTE, no direct browser mutations, anonymous access denied, and at least one authenticated SELECT RLS policy or function search-path protection. Every row must say PASS.
- scripts/test-trip-file-membership-revocation.sql runs **only after disposable SQL fixture setup** (it updates synthetic membership records). It covers an authorized owner, a second organization's manager, an absent auth.uid, and an owner revoked after records were created. The revoked owner must lose direct reads and evidence-link RPC access without historical deletion.
- The Trip File integrated GitHub Actions workflow executes the revocation test and reads the audit on each isolated PostgreSQL fixture DB. The amendment fixture must pass 4 tables + 4 RPCs; the independent quote fixture must pass 1 table + 1 RPC. Objects absent from each partial fixture are expected to show BLOCK, not success.

## Running it safely

For a read-only SQL metadata check on a *known, verified staging project*, paste **only** the contents of scripts/check-trip-file-security-posture.sql. It returns 10 rows.

Do not run the test SQL scripts on hosted staging/production because they create fixtures or mutate synthetic memberships.

For ephemeral GitHub/Postgres CI, the integrated workflow runs the source evidence fixture test, the membership revocation test, then the metadata audit. The companion Node checker ensures that all present fixture objects PASS and all not-installed objects BLOCK. An independent quote fixture uses the quotes expectation.

## Interpretation and remaining release blockers

A PASS indicates **minimum catalog-level grants and policy configuration**, not proof of correct policy expressions, user JWT behavior, receipt schemas, or real supplier state. Most security checks remain behavioral tests against **simplified synthetic fixtures**, not hosted Lovable Cloud.

**NO-GO until:**

1. Verify the correct Lovable Cloud staging project and safe migration sequence, and apply the 5 tables + 5 RPCs to a disposable staging clone.
2. Run the metadata check and authenticated two-company JWT/RLS/API tests on that staging clone, including inactive/missing membership, finance-only records, and no cross-org UUID lookup. No production credentials or customer data in this stage.
3. Validate any migration against actual enum/types, existing role-grant configuration, trigger behavior, and rollback path.
4. Validate Hotelbeds and Travelport only with provider-owned preproduction test bookings/locators, tenant-bound credentials, audited access, durable rate limits and strict feature flags.
5. Keep Amadeus Enterprise blocked until a contract-specific API product, authorization scheme and exact response contract are provisioned.

Sprint 13 neither changes booking/financial state nor certifies execution, refund, ticket issuance, settlement or provider PNR modifications.
