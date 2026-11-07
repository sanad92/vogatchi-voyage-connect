-- NEGATIVE test. Expected exit code != 0 in GitHub Actions.
-- Deliberately reinstate forbidden direct status UPDATE in a disposable database.
BEGIN;
GRANT UPDATE ON public.sop_approvals TO authenticated;
\i scripts/verify-safar-flow-sop-release-gate.sql
ROLLBACK;
