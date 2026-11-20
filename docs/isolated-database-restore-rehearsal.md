# Safar ERP database restore rehearsal

Run the release regression from a checkout with its locked dependencies installed.

```sh
bun install --frozen-lockfile
node scripts/verify-synthetic-database-restore.mjs
```

The test saves a compressed PostgreSQL data directory from a synthetic PGlite database, posts another movement on the source, then creates a fresh instance from the archive. It checks that the three saved movements return, the later movement stays outside that recovery point, and the original balances are exactly 800.00 and 1,165.25. It verifies each owner sees only their organization, an inactive member sees neither organization, and the anonymous role cannot read accounts or movements. A new movement in the restored instance exercises the release's bank-balance trigger. The test uses in-memory instances, removes its temporary archive and runs in the release workflow.

## Fresh database replay evidence

Supabase CLI 3.2.0 was run with `db push --dry-run --skip-vault` against a temporary loopback PostgreSQL 17.7 cluster. It reported 75 historical files as skipped because their names use `<timestamp>-<id>.sql`. The earliest skipped file, `20250614165848-6a25ae3b-4348-4025-ab3c-4433b432ff3f.sql`, defines foundational tables including customers, bookings and invoices. A disposable copy intended for a from-empty replay needs to account for those 75 files by version. Keep the checked-in history intact while preparing that copy.

Running the first files directly on native PostgreSQL applied four files. The fifth, `20250614174249-b29acdf9-50f6-4c00-8ff7-1334f3482112.sql`, expected the managed Auth schema beyond the minimal fixture and includes a legacy privileged-account seed. Review and remove or replace such seed behavior in the disposable baseline before enabling sign-in. The native PostgreSQL build did not supply `pg_cron`, `pg_net` or Supabase Vault, and the local CLI reported that Docker and Podman were unavailable. A complete from-empty replay therefore still needs the disposable Supabase runtime and the [historical SQL checkpoints](isolated-schema-bootstrap-checkpoints.md).

## Staging recovery drill

1. Use an empty, isolated Supabase target and synthetic data for at least two organizations. Record the source and target identifiers, commit SHA, database version, required extensions and migration versions. Keep provider callbacks and scheduled delivery pointed at test-only destinations during the drill.
2. Restore the database using the provider's documented backup flow. Check the historical migration list and application objects against the source manifest, and restore Auth, Storage objects and Edge configuration through their documented separate steps as applicable. Record the backup timestamp and the elapsed time until the target passes validation.
3. Compare customer, booking, payment and journal counts per organization. Compare ledger balances per organization, treasury account and currency, with separate debit and credit totals. For voucher and email attachments, compare Storage object counts and verify representative object downloads from the expected roles.
4. Sign in as two synthetic company users and confirm each can read its own records and cannot read the other's records or attachments. Run booking, collection, voucher download and supplier payout retry scenarios with synthetic funds. Verify restored scheduled jobs and provider settings use test endpoints before exercising them.
5. Record expected versus observed counts and balances, role checks, missing artifacts, the observed recovery point and elapsed recovery time. Treat the automated synthetic drill as one release check. The staging result establishes recovery behavior for the environment actually used.

[Supabase backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) · [Supabase CLI migration naming](https://supabase.com/docs/reference/cli/introduction) · [PGlite data directory archives](https://pglite.dev/docs/filesystems)
