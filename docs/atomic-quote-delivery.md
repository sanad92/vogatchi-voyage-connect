# Atomic quote creation

Implemented directly in repository code; no Lovable AI build credits required.

`scripts/deploy-atomic-quote.sql` is the versioned deployment SQL (not an automatically
generated Supabase migration). It adds nullable currency/request metadata, a unique
company/request index and `create_quote_atomic`. The CLI migration generator was
unavailable in this environment. Apply this script to any additional environment
before publishing the frontend there; do not assume GitHub sync executes SQL.

The script was applied to the connected project database. Existing quotes were not
backfilled or rewritten. Existing direct-insert grants remain for compatibility
with the previously published frontend; the new API is the hardened creation path,
not certification of every legacy table write or status update.

The frontend uses one RPC for header and items. A retry in the same mounted form
reuses its request key; changing company, identity or payload starts a different
request. Keys are not persisted across a page reload. The server serializes equal
keys, checks creator/payload reuse, validates company references and permissions,
rejects invalid/nonfinite quantities and prices, and computes monetary totals itself.
Currency is captured from the company setting when the quote is first saved.

Eight actual authenticated-role SQL assertions passed before and after deployment,
with all fixture writes rolled back. The late-failure case uses a temporary test
trigger to fail insertion of a later item and confirms no orphan quote survives.
The frontend test executes the actual hook with RPC mocks; it checks retry-key reuse,
changed input/company, server failures, absent responses and missing identity.
TypeScript passed. Browser acceptance and production frontend publishing are pending.

This closes the tested creation portion of Q01. It does not close Q02 conversion:
the old frontend conversion remains a known blocker involving canonical automation,
supplier allocation and duplicated invoice risk. A one-master-booking design must
preserve each supplier's payable and booking confirmation rules before rollout.

Tests:
- `node scripts/verify-atomic-quote-ui.mjs`
- SQL: BEGIN, set qa.quote_org/qa.quote_owner/qa.quote_agent, run
  scripts/verify-atomic-quote.sql, ROLLBACK. Use isolated fixture identities.
