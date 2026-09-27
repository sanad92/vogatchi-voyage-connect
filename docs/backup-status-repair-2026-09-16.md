# R02: Backup status integrity

The previous UI inserted a log, waited two seconds, then marked it completed
with a random file size. Its scheduling controls existed only in component
state. No worker, backup file or restore verification supported those claims.

The replacement removes the simulated writes and scheduling controls. It shows
provider protection as unverified and exposes previous rows only as unverified
history. It does not display their arbitrary sizes, URLs or success notes as
evidence. Loading failures remain errors instead of becoming an empty history.
The history query is keyed by authenticated user and is read-only.

`node scripts/verify-backup-status.mjs` passed: legacy completed/in-progress/failed
rows, unavailable creation, read errors and signed-out access. Production build
and targeted ESLint also passed in the combined local batch.

This closes the misleading frontend behavior locally. It does not create a
backup service or close R01 (actual recovery). No previous database rows were
deleted or relabeled, and no frontend deployment occurred.

## Required recovery evidence

1. Identify the active project from the deployment configuration and confirm
   its actual provider backup inventory, retention and available recovery points.
   The active ref in this checkout is `gvozalurfthzxpuasplo`; the connected
   Supabase project list did not include it. Do not restore another project
   because its display name looks similar.
2. Record a backup's provider ID, timestamp and coverage. A `backup_logs` row or
   manually entered URL is insufficient evidence.
3. Plan object storage separately: Supabase database backups include storage
   metadata, not the stored object bytes. [Official backup documentation](https://supabase.com/docs/guides/platform/backups).
4. Restore to an isolated test environment with outbound communications disabled.
   Compare selected customer/supplier references, journal counts and balances,
   booking/invoice relations and attachment bytes with an independent baseline.
5. Record the observed recovery time and possible data-loss window. Do not mark
   the recovery gate passed until this has actually been done.

The real provider inventory and restore exercise remain unverified. This repair
does not assert that provider backups are absent.
