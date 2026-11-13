-- A voided supplier document is evidence that the original estimate no
-- longer applies. A live supplier invoice or a legacy posted cost still wins.
DO $cockpit$
DECLARE
  v_definition text := pg_get_functiondef('public.get_booking_profit_cockpit(uuid)'::regprocedure);
  v_anchor text := 'v_supplier_obligation := CASE WHEN v_supplier_invoiced > 0 THEN v_supplier_invoiced ELSE v_cost END;';
  v_basis text := 'CASE WHEN v_supplier_invoiced > 0 THEN ''supplier_invoices'' ELSE ''booking_cost'' END';
  v_cancelled_supplier text := $condition$
    (v_booking.status IN ('cancelled','canceled') OR v_booking.workflow_stage::text = 'cancelled')
    AND EXISTS (
      SELECT FROM public.supplier_invoices i WHERE i.organization_id = v_booking.organization_id
        AND i.booking_id = _booking AND upper(coalesce(i.currency, v_currency)) = v_currency
        AND i.status IN ('cancelled','canceled','void')
        AND (i.payment_order_id IS NULL OR EXISTS (
          SELECT FROM public.supplier_payment_orders o WHERE o.id = i.payment_order_id
            AND o.organization_id = i.organization_id AND o.booking_id = i.booking_id AND o.status = 'cancelled'
        ))
    )
    AND NOT EXISTS (
      SELECT FROM public.journal_entries j WHERE j.organization_id = v_booking.organization_id
        AND j.booking_id = _booking AND j.source_type = 'booking_cost' AND j.status = 'posted'
        AND upper(coalesce(j.currency, v_currency)) = v_currency
    )
  $condition$;
BEGIN
  IF strpos(v_definition, v_anchor) = 0 OR strpos(v_definition, v_basis) = 0 THEN
    RAISE EXCEPTION 'Unexpected supplier obligation calculation in booking cockpit';
  END IF;
  EXECUTE replace(replace(v_definition, v_anchor,
    'v_supplier_obligation := CASE WHEN v_supplier_invoiced > 0 THEN v_supplier_invoiced WHEN ' ||
      v_cancelled_supplier || ' THEN 0 ELSE v_cost END;'),
    v_basis, 'CASE WHEN v_supplier_invoiced > 0 THEN ''supplier_invoices'' WHEN ' ||
      v_cancelled_supplier || ' THEN ''cancelled_supplier_invoices'' ELSE ''booking_cost'' END');
END
$cockpit$;
