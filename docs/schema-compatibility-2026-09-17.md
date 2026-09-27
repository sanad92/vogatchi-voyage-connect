# Schema and write compatibility — local repair

Status: local changes only, reviewed 17 September 2026. The migration has not
been applied to the active database and the frontend has not been deployed.

## Why this change is needed

The application type check originally reported 24 diagnostics in 14 files.
The onboarding repair removed one; the remaining 23 included writes using
nonexistent columns, view/join objects sent to tables, and CMS fields missing
from the current schema. Read-only inspection confirmed these discrepancies
against the active Lovable database, rather than assuming stale generated types.

## Changes

- User creation requests use `role` and `requested_by` and require an authenticated
  requester. Invoice creation retains `final_amount` and no longer writes the
  nonexistent redundant `total_amount`.
- Car, transport, flight and expense writes use explicit column allowlists.
  Joined objects and view metadata do not reach table mutations. The current
  company is assigned by the hook, and updates are scoped to it. Flight passenger
  and baggage values use native JSON; explicit null values clear them correctly.
- Hotels and destinations use company-scoped query keys and confirmed writes.
  Existing names, addresses, amenities and contact details provide fallbacks
  for older rows; missing ratings remain missing.
- CMS pages and blocks read the actual title/publication fields, include the
  current company in requests, and reset local page state on company changes.
  Native JSON and legacy JSON strings both normalize for rendering.
- Form submissions are linked to an active form in the current company. This
  does not implement anonymous public form access or relax its RLS policies.

## Pending database change

`supabase/migrations/20260916193651_restore_cms_editor_columns.sql` adds 32
columns across six tables using `ADD COLUMN IF NOT EXISTS` inside a transaction:

| Table | Added columns | Purpose |
|---|---:|---|
| destinations | 9 | Arabic/editor metadata, attractions, rating and ordering |
| hotels | 14 | Arabic/editor metadata, features, contact details and ordering |
| blocks | 3 | Layout, styling and page section |
| pages | 2 | SEO title and description |
| supplier_currencies | 1 | Notes already exposed by the UI |
| form_submissions | 3 | User agent, optional IP field and received status |

No existing columns, records, policies or grants are removed or rewritten.
Existing hotels/destinations do not receive invented review ratings.
`src/integrations/supabase/types.ts` is synchronized with this **pending** schema;
it is not claimed to have been generated from the unchanged live database.
The schema fixture contains column metadata only, not customer records.

## Verification completed locally

- Application TypeScript check: **zero diagnostics** after this batch, using
  the pending schema types. Production build passed.
- PGlite applied the additive migration twice against the six-table metadata
  fixture. All 32 columns appeared, original sample data and sample RLS policies
  were preserved, JSON round trips passed, and Row/Insert/Update field names
  matched the migrated columns.
- Actual hook mutation tests cover joined-field rejection, company/creator
  ownership, parent booking links, JSON/null handling and rejected writes.
- Backup-status, onboarding, existing company/SaaS core and financial-formula
  scripts passed during the combined local batch. Targeted lint checks passed;
  this is not a claim that the full repository lint suite is clean.

The local SQL test uses representative policies; it does not certify the actual
production RLS matrix. Supabase security advisors for active ref
`gvozalurfthzxpuasplo` were attempted but denied by the connected tool's project
permissions. The active project was absent from its project list. No alternate
project was restored, and no remote schema write was attempted.

## Required release sequence

1. Test the migration on an isolated environment matching the active schema and
   preserve its real access controls. Capture pre/post schema and data evidence.
2. Apply this migration before deploying the matching frontend. Regenerate and
   compare Supabase types from the migrated environment, then typecheck/build.
3. Exercise hotel/destination editing, CMS page/block editing, configured forms
   and booking/expense writes with authorized and unauthorized test users in two
   companies. Verify failures, company switching and stored values through reload.
4. Match the deployed commit to the tested commit and document rollback. The
   additive columns can remain when rolling back the frontend; do not drop them
   automatically after they have received user data.

U02 remains partial until deployment and acceptance are evidenced. Anonymous
forms, atomic example-page creation/reordering, full financial reconciliation,
all-company isolation, real backups/restore and production monitoring are not
certified by these local tests.
