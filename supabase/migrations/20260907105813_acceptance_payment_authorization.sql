-- Payment execution follows the existing payments_process role policy.
-- Membership alone is insufficient for financial mutations.
BEGIN;
CREATE OR REPLACE FUNCTION public.can_process_org_payments(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND coalesce(public.can_org_write(_org_id), false)
    AND (
      public.is_platform_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = _org_id AND m.user_id = auth.uid() AND m.is_active = true
          AND (
            m.role::text IN ('owner', 'admin', 'manager')
            OR (m.role::text = 'agent' AND EXISTS (
              SELECT 1 FROM public.sop_department_members d
              WHERE d.organization_id = m.organization_id AND d.user_id = m.user_id
                AND d.department::text IN ('finance', 'management')
            ))
          )
      )
    );
$function$;
REVOKE ALL ON FUNCTION public.can_process_org_payments(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_process_org_payments(uuid) TO authenticated;

-- Preserve deployed accounting logic and signatures. Abort if the expected
-- authorization check has changed, rather than overwriting unknown logic.
DO $patch$
DECLARE target record; definition text; replacement text;
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('record_customer_payment', 'IF NOT public.can_org_write(v_org) THEN', 'IF NOT public.can_process_org_payments(v_org) THEN'),
    ('record_supplier_payment', 'IF NOT public.can_org_write(v_po.organization_id) THEN', 'IF NOT public.can_process_org_payments(v_po.organization_id) THEN')
  ) AS checks(name, old_check, new_check)
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO STRICT definition
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=target.name;
    IF position(target.new_check IN definition)>0 THEN CONTINUE; END IF;
    IF position(target.old_check IN definition)=0 THEN
      RAISE EXCEPTION 'Unexpected authorization logic in %',target.name;
    END IF;
    replacement := replace(definition,target.old_check,target.new_check);
    EXECUTE replacement;
  END LOOP;
END;
$patch$;

DO $patch$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO STRICT definition
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='record_supplier_payment';
  IF position('Payment order is cancelled' IN definition)=0 THEN
    IF position('IF v_po.approval_status' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected payment order validation'; END IF;
    EXECUTE replace(definition, 'IF v_po.approval_status',
      E'IF v_po.status = ''cancelled'' THEN RAISE EXCEPTION ''Payment order is cancelled''; END IF;\n  IF v_po.approval_status');
  END IF;
END;
$patch$;

CREATE OR REPLACE FUNCTION public.approve_supplier_payment_order(
  _po_id uuid, _approve boolean DEFAULT true, _reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_po public.supplier_payment_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_po FROM public.supplier_payment_orders WHERE id=_po_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PO not found'; END IF;
  IF NOT public.can_process_org_payments(v_po.organization_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _approve IS NULL THEN RAISE EXCEPTION 'Approval decision is required'; END IF;
  IF v_po.status IN ('paid','partially_paid','cancelled') OR EXISTS (
    SELECT 1 FROM public.supplier_payment_allocations WHERE payment_order_id=_po_id
  ) THEN RAISE EXCEPTION 'Cannot change approval of a paid or cancelled order'; END IF;
  UPDATE public.supplier_payment_orders SET
    approval_status=CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    status=CASE WHEN _approve THEN 'approved' ELSE 'pending' END,
    approved_by=auth.uid(), approved_at=now(),
    rejection_reason=CASE WHEN NOT _approve THEN _reason ELSE NULL END,
    updated_at=now()
  WHERE id=_po_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.approve_supplier_payment_order(uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.approve_supplier_payment_order(uuid,boolean,text) TO authenticated;
COMMIT;
