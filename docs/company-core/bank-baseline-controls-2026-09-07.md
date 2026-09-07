# Bank baseline controls — 7 September 2026

## Confirmed problem

An active organization employee without baseline-management permission could
update `bank_accounts.opening_balance` directly as the PostgreSQL `authenticated`
role. The existing setter rejected that employee, but table-level UPDATE grants
allowed the direct path to bypass permission checks and the audit trail.
The reproduction was rolled back; no customer account was left modified.

Closing a reconciliation also only locked a baseline if its date was populated.
This permitted an initial set after closing and a clear/re-set bypass.

## Changes

- Column privileges exclude all five opening-baseline fields from authenticated
  INSERT/UPDATE. The existing audited RPC owns those changes. Account IDs and
  organization IDs cannot be changed through direct account UPDATE.
- Ordinary account creation, metadata edits and the bank-transaction balance
  trigger retain their required privileges. Existing RLS still scopes those rows.
- Any closed reconciliation locks its account baseline, including an unset or
  cleared baseline. An authorized owner must explicitly request a correction
  and supply a reason. The reason and before/after values stay in the audit.
- The setter rejects nonfinite amounts/dates. The lock helper checks organization
  access before exposing the existence of a closed reconciliation.
- Closing takes the bank-account lock before the session lock, serializing it
  with baseline edits. This lock ordering was reviewed; concurrent connections
  have not been stress-tested.
- The API reports effective edit/correction permission. The UI distinguishes
  loading and API failures from an unset baseline, supports retry, refreshes
  baseline state after closing, and remounts the editor when switching accounts.

The baseline remains reference metadata. It does not create an opening journal,
change `current_balance`, or alter reconciliation arithmetic. No historical
balance correction or data backfill is part of this change.

## Verification

- 34 integration assertions passed in the connected database with actual
  `SET LOCAL ROLE authenticated`, inside one transaction ending in ROLLBACK.
- The same 34 assertions passed again against the applied production functions,
  without prepending candidate DDL. Test data was rolled back in both runs.
- Coverage: direct write denial, ordinary account edits, denied employee access,
  a company-specific finance override, owner correction, clear/re-set locking,
  foreign/inactive users, nonfinite inputs, exact audit counts, and continued
  operation of the normal bank-posting trigger.
- Post-rollback inspection found zero test accounts, zero baseline audit records,
  zero configured baselines, and the same existing account balances.
- `npm run test:bank-baseline`: actual component handlers with controlled hook
  responses cover loading/error/retry, locked but unset state, correction reason,
  permission revocation, server errors and post-close cache invalidation.
- `npm run test:finance`, TypeScript checking, production build, targeted ESLint
  and whitespace checks passed. The build retains existing bundle-size and
  Browserslist-age warnings.

The SQL test is `scripts/verify-bank-baseline-controls.sql`. A privileged test
connection must supply its five documented transaction-local fixture settings.
Always wrap it in BEGIN/ROLLBACK. It does not store user IDs or credentials.

These checks do not replace a full browser acceptance run in Vogantra or a full
authorization audit of all financial endpoints. Daftra is a reference system;
testing its UI does not establish acceptance of Vogantra.

## Database rollout

The native migration tool generated and applied
`supabase/migrations/20260907210002_7623a02d-dd34-4512-bd38-d7b0d8ac64f9.sql`.
Its checked-in SQL was compared with the reviewed candidate and matches except
for comments/whitespace. No duplicate source-mirror migration was created.

The migration tool reported 278 project-wide advisory findings: an extension in
public, 10 functions executable by anonymous users, and 267 SECURITY DEFINER
functions executable by authenticated users. Execution grants alone do not
establish exploitability; these broader findings were not individually audited
or resolved here. Anonymous execution is denied on all five functions touched
by this migration. This is not a clean project-wide security scan.

Privilege reference: [Supabase column-level security](https://supabase.com/docs/guides/database/postgres/column-level-security).
