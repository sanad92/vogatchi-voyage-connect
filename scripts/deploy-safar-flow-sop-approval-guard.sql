-- Safar Flow V5: harden EXISTING SOP approvals, don't create duplicate workflow.
-- Staged only; never run on production without two-company staging QA.
-- Existing sop_request_approval remains the sole creation API.
BEGIN;

-- Prevent bypassing management by directly INSERTing status='approved'
-- or changing status/decided_by through the Data API. Existing
-- SECURITY DEFINER SOP RPCs remain able to create/decide approvals.
REVOKE INSERT, UPDATE, DELETE ON public.sop_approvals FROM authenticated;
REVOKE ALL ON public.sop_approvals FROM anon, PUBLIC;
GRANT SELECT ON public.sop_approvals TO authenticated;
GRANT ALL ON public.sop_approvals TO service_role;

-- Preserve RPC signature/response and SOP event integration.
CREATE OR REPLACE FUNCTION public.sop_decide_approval(
  _approval uuid,
  _approve boolean,
  _note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  a public.sop_approvals%ROWTYPE;
  v_decision text;
BEGIN
  IF auth.uid() IS NULL OR _approval IS NULL OR _approve IS NULL THEN
    RETURN jsonb_build_object('allowed', false,
      'violations', jsonb_build_array('invalid_approval_decision'));
  END IF;
  -- Locked row makes concurrent approval/rejection decisions exclusive.
  SELECT * INTO a FROM public.sop_approvals
    WHERE id = _approval
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval_not_found' USING ERRCODE='P0002';
  END IF;

  IF NOT public.sop_is_manager(a.organization_id, auth.uid()) THEN
    RETURN jsonb_build_object('allowed', false,
      'violations', jsonb_build_array('management_only'));
  END IF;

  IF a.requested_by IS NOT NULL AND a.requested_by = auth.uid() THEN
    RETURN jsonb_build_object('allowed', false,
      'violations', jsonb_build_array('self_approval_forbidden'));
  END IF;

  IF a.status <> 'pending' THEN
    RETURN jsonb_build_object('allowed', false,
      'violations', jsonb_build_array('approval_already_decided'),
      'status', a.status::text);
  END IF;

  IF char_length(COALESCE(_note, '')) > 1000 THEN
    RETURN jsonb_build_object('allowed', false,
      'violations', jsonb_build_array('approval_note_too_long'));
  END IF;

  IF NOT _approve AND char_length(btrim(COALESCE(_note, ''))) < 3 THEN
    RETURN jsonb_build_object('allowed', false,
      'violations', jsonb_build_array('rejection_note_required'));
  END IF;

  v_decision := CASE WHEN _approve THEN 'approved' ELSE 'rejected' END;
  UPDATE public.sop_approvals
  SET status = v_decision::public.sop_approval_status,
      decided_by = auth.uid(),
      decided_at = now(),
      decision_note = NULLIF(btrim(_note), '')
  WHERE id = _approval AND organization_id = a.organization_id AND status = 'pending';

  -- Emits exactly once per successful decision. Note and financial details
  -- are intentionally omitted from the event payload.
  PERFORM public.emit_event(
    'sop.approval.decided','sop_approval',_approval,a.organization_id,
    jsonb_build_object('type',a.approval_type,'approved',_approve,'lead_id',a.lead_id),
    'sop.appr.dec.' || _approval::text || '.' || extract(epoch from now())::bigint::text
  );

  -- Approval does NOT execute a refund, payment, discount or booking update.
  RETURN jsonb_build_object('allowed',true,'status',v_decision);
END;
$$;

REVOKE ALL ON FUNCTION public.sop_decide_approval(uuid,boolean,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sop_decide_approval(uuid,boolean,text)
  TO authenticated;
COMMIT;
