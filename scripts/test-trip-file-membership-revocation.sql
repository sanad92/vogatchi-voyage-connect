-- EPHEMERAL POSTGRES FIXTURE ONLY. Run AFTER test-trip-file-source-evidence-links.sql
-- in the SAME disposable database. Never run this on a hosted database:
-- this suite intentionally deactivates a synthetic member.
\set ON_ERROR_STOP on

-- Verify current fixture starts from an authorized, non-revoked organization A owner.
SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000013';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.booking_change_requests)
    OR NOT EXISTS (SELECT 1 FROM public.booking_change_handoffs)
    OR NOT EXISTS (SELECT 1 FROM public.booking_change_handoff_events)
    OR NOT EXISTS (SELECT 1 FROM public.booking_change_source_evidence)
  THEN RAISE EXCEPTION 'Fixture lacks owner-visible organization A history'; END IF;
END $$;

-- An active B manager cannot enumerate A's private change or financial evidence.
SET test.user_id='00000000-0000-4000-8000-000000000021';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.booking_change_requests)
    OR EXISTS (SELECT 1 FROM public.booking_change_handoffs)
    OR EXISTS (SELECT 1 FROM public.booking_change_handoff_events)
    OR EXISTS (SELECT 1 FROM public.booking_change_source_evidence)
  THEN RAISE EXCEPTION 'Active B member can read organization A history'; END IF;
END $$;

-- Simulate a signed-in browser with a token but WITHOUT a user id.
SET test.user_id='';
DO $$
BEGIN
  IF auth.uid() IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.booking_change_requests)
    OR EXISTS (SELECT 1 FROM public.booking_change_handoffs)
    OR EXISTS (SELECT 1 FROM public.booking_change_handoff_events)
    OR EXISTS (SELECT 1 FROM public.booking_change_source_evidence)
  THEN RAISE EXCEPTION 'Missing JWT subject did not fail closed'; END IF;
END $$;

-- Revocation is tested AFTER the fixture has already produced complete history.
-- Do not weaken RLS for an already-issued JWT whose membership was revoked.
RESET ROLE;
UPDATE public.organization_members SET is_active=false
  WHERE organization_id='00000000-0000-4000-8000-000000000001'
    AND user_id='00000000-0000-4000-8000-000000000013';

SET ROLE authenticated;
SET test.user_id='00000000-0000-4000-8000-000000000013';
DO $$
DECLARE
  req uuid;
  denied boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM public.booking_change_requests)
    OR EXISTS (SELECT 1 FROM public.booking_change_handoffs)
    OR EXISTS (SELECT 1 FROM public.booking_change_handoff_events)
    OR EXISTS (SELECT 1 FROM public.booking_change_source_evidence)
  THEN RAISE EXCEPTION 'Revoked organization A owner still reads tenant data'; END IF;

  -- Even a known valid UUID must not grant a revoked owner access to an RPC.
  req := public.test_lookup_change_id('00000000-0000-4000-8000-000000000201');
  BEGIN
    PERFORM public.link_booking_change_source_evidence(
      req,'customer_invoice','00000000-0000-4000-8000-000000000501');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN
    RAISE EXCEPTION 'Revoked member may still attach financial evidence';
  END IF;
END $$;

RESET ROLE;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.booking_change_source_evidence
    WHERE source_type='customer_invoice'
      AND source_id='00000000-0000-4000-8000-000000000501'
  ) THEN RAISE EXCEPTION 'Revocation unexpectedly removed historical evidence'; END IF;
END $$;

SELECT 'Trip File tenant membership revocation, null-subject and two-company checks passed' AS result;
