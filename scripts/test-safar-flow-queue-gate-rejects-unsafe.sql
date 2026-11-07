-- NEGATIVE test. Expected exit code != 0 in GitHub Actions.
-- The transaction is rolled back automatically when psql exits on gate error.
BEGIN;
GRANT USAGE ON SCHEMA safar_flow TO authenticated;
\i scripts/verify-safar-flow-queue-release-gate.sql
ROLLBACK;
