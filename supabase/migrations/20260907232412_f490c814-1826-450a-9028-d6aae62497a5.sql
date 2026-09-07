-- Follow-up for safe unignore: an old inconsistent row may be ignored while
-- retaining matches. Recompute its status from the matches before returning.
CREATE OR REPLACE FUNCTION public.set_bank_statement_line_ignored(
  _line uuid, _ignored boolean, _reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_line public.bank_statement_lines%ROWTYPE;
  v_status text;
  v_has_matches boolean;
  v_matched numeric;
BEGIN
  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = _line FOR UPDATE;
  IF NOT FOUND OR public._can_manage_bank_reconciliation(v_line.organization_id) IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT status INTO v_status FROM public.bank_reconciliation_sessions WHERE id = v_line.session_id FOR UPDATE;
  IF v_status NOT IN ('draft', 'in_review') THEN RAISE EXCEPTION 'Session is locked'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.bank_reconciliation_matches WHERE statement_line_id = _line)
    INTO v_has_matches;
  IF _ignored AND v_has_matches THEN
    RAISE EXCEPTION 'A matched line cannot be ignored';
  END IF;
  IF NOT _ignored AND v_has_matches THEN
    SELECT COALESCE(sum(matched_amount), 0) INTO v_matched
    FROM public.bank_reconciliation_matches WHERE statement_line_id = _line;
    UPDATE public.bank_statement_lines SET
      status = CASE
        WHEN v_matched >= v_line.amount - 0.005 THEN 'matched'
        WHEN v_matched > 0 THEN 'partial'
        ELSE 'unmatched'
      END,
      ignored_reason = NULL
    WHERE id = _line;
    RETURN;
  END IF;
  UPDATE public.bank_statement_lines SET
    status = CASE WHEN _ignored THEN 'ignored' ELSE 'unmatched' END,
    ignored_reason = CASE WHEN _ignored THEN NULLIF(trim(_reason), '') ELSE NULL END
  WHERE id = _line;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_bank_statement_line_ignored(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_bank_statement_line_ignored(uuid, boolean, text) TO authenticated, service_role;