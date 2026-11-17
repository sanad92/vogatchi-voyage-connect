-- Reuse the existing staff, policy and manager approvals for every unified booking.
ALTER TABLE pilgrimage_inventory_private.booking_staff
  ALTER COLUMN operations_user_id DROP NOT NULL,
  ADD COLUMN commission_managed boolean NOT NULL DEFAULT true,
  ADD COLUMN commission_cost_review boolean NOT NULL DEFAULT false;
ALTER TABLE pilgrimage_inventory_private.booking_staff DROP CONSTRAINT booking_staff_approved_cost_check;
ALTER TABLE pilgrimage_inventory_private.booking_staff ADD CONSTRAINT booking_staff_approved_cost_check CHECK (approved_cost>=0);

ALTER TABLE public.employee_commissions
  ADD COLUMN workflow_managed boolean NOT NULL DEFAULT false;
UPDATE public.employee_commissions SET workflow_managed=true WHERE booking_type IN ('hajj','umrah');

-- Keep existing commission commitments. Attribute historical rows from the records
-- already on file, without assuming a creator or generating another commission.
INSERT INTO pilgrimage_inventory_private.booking_staff
  (booking_id,organization_id,operations_user_id,seller_employee_id,seller_name,commission_managed)
SELECT b.id,b.organization_id,coalesce(created.actor,converted.created_by),e.id,e.full_name,false
FROM public.bookings b
LEFT JOIN public.quote_booking_conversions converted ON converted.booking_id=b.id AND converted.organization_id=b.organization_id
LEFT JOIN LATERAL (
  SELECT r.created_by AS actor FROM public.booking_creation_requests r
  WHERE r.booking_id=b.id AND r.organization_id=b.organization_id LIMIT 1
) created ON true
LEFT JOIN public.employees e ON e.id=b.employee_id AND e.organization_id=b.organization_id
ON CONFLICT (booking_id) DO NOTHING;

CREATE FUNCTION pilgrimage_inventory_private.attribute_unified_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE seller text;
BEGIN
  IF NEW.booking_type IN ('hajj','umrah') THEN RETURN NEW; END IF;
  IF NEW.employee_id IS NOT NULL THEN
    SELECT full_name INTO seller FROM public.employees
      WHERE id=NEW.employee_id AND organization_id=NEW.organization_id AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_booking_sales_employee' USING ERRCODE='22023'; END IF;
  END IF;
  INSERT INTO pilgrimage_inventory_private.booking_staff
    (booking_id,organization_id,operations_user_id,seller_employee_id,seller_name)
  VALUES (NEW.id,NEW.organization_id,auth.uid(),NEW.employee_id,seller);
  RETURN NEW;
END;
$$;
CREATE TRIGGER a_capture_unified_booking_staff AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.attribute_unified_booking();

CREATE FUNCTION pilgrimage_inventory_private.has_managed_commission(_booking uuid,_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT FROM pilgrimage_inventory_private.booking_staff s
    WHERE s.booking_id=_booking AND s.organization_id=_org AND s.commission_managed
      AND public.user_belongs_to_org(auth.uid(),_org))
$$;

CREATE FUNCTION pilgrimage_inventory_private.edit_access(_booking uuid,_org uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT pilgrimage_inventory_private.check_staff_access(_org,'bookings_view')
    OR NOT coalesce(public.can_org_write(_org),false) THEN RETURN false; END IF;
  PERFORM 1 FROM pilgrimage_inventory_private.booking_edit_requests r
  JOIN public.bookings b ON b.id=r.booking_id AND b.organization_id=_org
  WHERE r.booking_id=_booking AND r.requested_by=auth.uid()
    AND r.status='approved' AND r.expires_at>clock_timestamp()
    AND b.status NOT IN ('cancelled','canceled') AND b.workflow_stage::text<>'cancelled'
  FOR SHARE OF r;
  RETURN FOUND;
END;
$$;

CREATE FUNCTION pilgrimage_inventory_private.guard_unified_staff_edit()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id,NEW.organization_id,NEW.employee_id,NEW.booking_type,NEW.is_demo)
    IS DISTINCT FROM (OLD.id,OLD.organization_id,OLD.employee_id,OLD.booking_type,OLD.is_demo) THEN
    RAISE EXCEPTION 'booking_attribution_fixed' USING ERRCODE='42501';
  END IF;
  -- Authoritative finance, supplier, stage and settlement RPCs retain their
  -- own checks. Direct company writes require the manager's edit grant.
  IF current_user IN ('authenticated','anon') AND (
    TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['updated_at','profit','data_quality_status'])
      IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','profit','data_quality_status'])
  ) AND NOT pilgrimage_inventory_private.edit_access(OLD.id,OLD.organization_id) THEN
    RAISE EXCEPTION 'booking_edit_approval_required' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER zz_staff_edit_unified_booking BEFORE UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_unified_staff_edit();

CREATE FUNCTION pilgrimage_inventory_private.guard_booking_service_edit()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  service jsonb := CASE WHEN TG_OP='INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END;
  org uuid := (service->>'organization_id')::uuid;
  parent uuid := (service->>'booking_id')::uuid;
  service_id uuid := (service->>'id')::uuid;
  candidate uuid;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['updated_at','invoice_sent','invoice_sent_date','voucher_sent',
      'voucher_sent_date','supplier_payment_sent','supplier_payment_sent_date'])
    IS NOT DISTINCT FROM (service-ARRAY['updated_at','invoice_sent','invoice_sent_date','voucher_sent',
      'voucher_sent_date','supplier_payment_sent','supplier_payment_sent_date']) THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND ((to_jsonb(NEW)->>'booking_id',to_jsonb(NEW)->>'organization_id',to_jsonb(NEW)->>'id')
    IS DISTINCT FROM (service->>'booking_id', service->>'organization_id', service->>'id')) THEN
    RAISE EXCEPTION 'booking_attribution_fixed' USING ERRCODE='42501';
  END IF;
  IF TG_OP='INSERT' AND parent IS NULL THEN
    RAISE EXCEPTION 'create_through_unified_bookings' USING ERRCODE='42501';
  END IF;

  IF parent IS NOT NULL AND org IS NULL THEN
    SELECT organization_id INTO org FROM public.bookings WHERE id=parent;
  END IF;
  FOR candidate IN SELECT b.id FROM public.bookings b
    WHERE b.organization_id=org AND (
      b.id=parent OR (parent IS NULL AND b.legacy_table=TG_TABLE_NAME AND b.legacy_id=service_id)
    )
  LOOP
    IF pilgrimage_inventory_private.edit_access(candidate,org) THEN
      IF TG_OP='DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'booking_edit_approval_required' USING ERRCODE='42501';
END;
$$;

DO $service_guards$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['hotel_bookings','flight_bookings','car_rentals','transport_bookings',
    'booking_hotel_details','booking_flight_details','booking_car_details','booking_transport_details']
  LOOP
    EXECUTE format('CREATE TRIGGER aa_staff_edit_booking_service BEFORE INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_booking_service_edit()',relation);
  END LOOP;
END;
$service_guards$;

CREATE FUNCTION public.get_booking_staff(_booking uuid)
RETURNS jsonb LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.read_booking_staff(_booking) $$;
CREATE FUNCTION public.change_booking_edit_request(_booking uuid,_action text,_request uuid,_reason text)
RETURNS uuid LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.change_edit_request(_booking,_action,_request,_reason) $$;
CREATE FUNCTION public.list_booking_sales_staff(_org uuid)
RETURNS TABLE(id uuid,full_name text) LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT * FROM pilgrimage_inventory_private.sales_staff(_org) $$;
CREATE FUNCTION public.booking_commission_policy(_org uuid,_sales boolean,_operations boolean)
RETURNS jsonb LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.manage_commission_policy(_org,_sales,_operations) $$;
CREATE FUNCTION public.approve_booking_commission_cost(_booking uuid,_cost numeric)
RETURNS void LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.approve_booking_cost(_booking,_cost) $$;

CREATE FUNCTION public.save_booking_edit_notes(_booking uuid,_notes text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE org uuid;
BEGIN
  IF char_length(coalesce(_notes,''))>10000 THEN RAISE EXCEPTION 'booking_notes_too_long' USING ERRCODE='22023'; END IF;
  SELECT organization_id INTO org FROM public.bookings WHERE id=_booking;
  IF org IS NULL OR NOT pilgrimage_inventory_private.edit_access(_booking,org) THEN
    RAISE EXCEPTION 'booking_edit_approval_required' USING ERRCODE='42501';
  END IF;
  UPDATE public.bookings SET notes=nullif(btrim(_notes),'') WHERE id=_booking AND organization_id=org;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_edit_approval_required' USING ERRCODE='42501'; END IF;
END;
$$;

CREATE FUNCTION public.list_booking_workflow_commissions(_org uuid)
RETURNS TABLE(id uuid,booking_id uuid,booking_type text,booking_number text,employee_name text,
  commission_rate numeric,commission_amount numeric,currency text,payment_status text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT c.id,c.booking_id,c.booking_type,b.booking_number,e.full_name,c.commission_rate,
    c.commission_amount,c.currency,c.payment_status
  FROM public.employee_commissions c
  JOIN public.bookings b ON b.id=c.booking_id AND b.organization_id=c.organization_id
  LEFT JOIN public.employees e ON e.id=c.employee_id AND e.organization_id=c.organization_id
  WHERE c.organization_id=_org AND c.workflow_managed
  ORDER BY c.created_at DESC,c.id
$$;

DROP POLICY pilgrimage_commissions_manager_read ON public.employee_commissions;
CREATE POLICY booking_workflow_commissions_manager_read ON public.employee_commissions AS RESTRICTIVE
  FOR SELECT TO authenticated USING (
    NOT workflow_managed OR (
      coalesce(public.has_org_permission(organization_id,'employees_commission'),false)
      AND coalesce(public.get_user_org_role(auth.uid(),organization_id)::text,'') IN ('owner','admin','manager')
    )
  );

CREATE FUNCTION pilgrimage_inventory_private.commission_margin(b public.bookings,_cost numeric)
RETURNS numeric LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT CASE WHEN b.status IN ('cancelled','canceled') OR b.workflow_stage::text='cancelled' THEN 0
    WHEN _cost IS NULL THEN NULL
    ELSE b.selling_price-_cost + coalesce((
      SELECT sum(CASE WHEN supplement.id IS NOT NULL THEN supplement.subtotal-coalesce(supplement.discount_amount,0)
        WHEN a.customer_due_reduction>0 OR a.customer_refund_id IS NOT NULL THEN
          -a.customer_due_reduction
          + round(a.customer_due_reduction*coalesce(invoice.vat_amount,0)/nullif(invoice.final_amount,0),2)
          - coalesce(refund.amount,0)
          + coalesce(round(refund.amount*coalesce(invoice.vat_amount,0)/nullif(invoice.final_amount,0),2),0)
        ELSE 0 END)
      FROM public.trip_service_amendments a
      LEFT JOIN public.invoices supplement ON supplement.id=a.additional_invoice_id AND supplement.organization_id=b.organization_id
      LEFT JOIN public.invoices invoice ON invoice.id=a.customer_invoice_id AND invoice.organization_id=b.organization_id
      LEFT JOIN public.refund_requests refund ON refund.id=a.customer_refund_id AND refund.organization_id=b.organization_id
      WHERE a.booking_id=b.id AND a.organization_id=b.organization_id AND a.status='applied'
    ),0) END
$$;

CREATE OR REPLACE FUNCTION pilgrimage_inventory_private.refresh_pending_commissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE staff pilgrimage_inventory_private.booking_staff%ROWTYPE;
BEGIN
  SELECT * INTO staff FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=NEW.id AND commission_managed;
  IF staff.approved_cost IS NOT NULL AND NOT staff.commission_cost_review THEN
    PERFORM pilgrimage_inventory_private.reprice_pending_commissions(NEW.id,NEW.organization_id,
      pilgrimage_inventory_private.commission_margin(NEW,staff.approved_cost));
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION pilgrimage_inventory_private.refresh_commission_after_amendment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  staff pilgrimage_inventory_private.booking_staff%ROWTYPE;
BEGIN
  SELECT * INTO staff FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=NEW.booking_id AND commission_managed;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF coalesce((NEW.terms->>'supplier_wallet')::numeric,0)<>0
    OR coalesce((NEW.terms->>'supplier_fare_delta')::numeric,0)<>0
    OR (NEW.terms->>'operation'='change' AND coalesce((NEW.terms->>'supplier_fee')::numeric,0)<>0) THEN
    -- A new supplier settlement can change the approved cost or its exchange rate.
    UPDATE pilgrimage_inventory_private.booking_staff SET commission_cost_review=true WHERE booking_id=staff.booking_id;
    PERFORM pilgrimage_inventory_private.reprice_pending_commissions(staff.booking_id,staff.organization_id,0);
  ELSIF staff.approved_cost IS NOT NULL AND NOT staff.commission_cost_review THEN
    SELECT * INTO STRICT b FROM public.bookings WHERE id=staff.booking_id;
    PERFORM pilgrimage_inventory_private.reprice_pending_commissions(b.id,b.organization_id,
      pilgrimage_inventory_private.commission_margin(b,staff.approved_cost));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER booking_commissions_after_service_amendment AFTER UPDATE OF status ON public.trip_service_amendments
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status='applied')
  EXECUTE FUNCTION pilgrimage_inventory_private.refresh_commission_after_amendment();

DO $extend$
DECLARE
  definition text;
  anchor text;
BEGIN
  SELECT pg_get_functiondef('pilgrimage_inventory_private.read_booking_staff(uuid)'::regprocedure) INTO definition;
  definition:=replace(definition,'s.operations_user_id=auth.uid() OR manager',
    's.operations_user_id=auth.uid() OR manager OR (s.operations_user_id IS NULL AND pilgrimage_inventory_private.check_staff_access(b.organization_id,''bookings_edit''))');
  definition:=replace(definition,'b.status<>''cancelled''',
    '(b.status NOT IN (''cancelled'',''canceled'') AND b.workflow_stage::text<>''cancelled'')');
  definition:=replace(definition,'''can_approve_cost'',finance AND',
    '''can_approve_cost'',finance AND s.commission_managed
      AND (b.status IN (''confirmed'',''completed'') OR b.workflow_stage::text IN
        (''confirmed'',''paid'',''operations'',''traveling'',''completed'',''post_travel'')) AND');
  definition:=replace(definition,'''cost'',CASE WHEN finance THEN s.approved_cost END',
    '''cost'',CASE WHEN finance AND s.commission_managed THEN coalesce(s.approved_cost,CASE WHEN b.booking_type NOT IN (''hajj'',''umrah'') THEN b.cost_price END) END');
  definition:=replace(definition,'''commission_profit'',CASE WHEN finance THEN b.selling_price-s.approved_cost END',
    '''cost_needs_review'',finance AND s.commission_cost_review,
      ''commission_profit'',CASE WHEN finance AND NOT s.commission_cost_review
        THEN pilgrimage_inventory_private.commission_margin(b,s.approved_cost) END');
  EXECUTE definition;

  SELECT pg_get_functiondef('pilgrimage_inventory_private.change_edit_request(uuid,text,uuid,text)'::regprocedure) INTO definition;
  anchor:='IF actor<>s.operations_user_id AND NOT manager THEN';
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected booking edit request authorization'; END IF;
  definition:=replace(definition,'b.status=''cancelled''',
    '(b.status IN (''cancelled'',''canceled'') OR b.workflow_stage::text=''cancelled'')');
  EXECUTE replace(definition,anchor,'IF NOT manager AND actor IS DISTINCT FROM s.operations_user_id
    AND NOT (s.operations_user_id IS NULL AND pilgrimage_inventory_private.check_staff_access(b.organization_id,''bookings_edit'')) THEN');

  SELECT pg_get_functiondef('pilgrimage_inventory_private.approve_booking_cost(uuid,numeric)'::regprocedure) INTO definition;
  definition:=replace(definition,'IF NOT FOUND THEN RAISE EXCEPTION ''pilgrimage_staff_denied''',
    'IF NOT FOUND OR NOT s.commission_managed THEN RAISE EXCEPTION ''pilgrimage_staff_denied''');
  definition:=replace(definition,'b.status NOT IN (''confirmed'',''completed'')',
    '(b.status IN (''cancelled'',''canceled'') OR b.workflow_stage::text=''cancelled''
      OR (b.status NOT IN (''confirmed'',''completed'') AND b.workflow_stage::text NOT IN
      (''confirmed'',''paid'',''operations'',''traveling'',''completed'',''post_travel'')))');
  definition:=replace(definition,'NOT (_cost>0 AND', 'NOT ((_cost>0 OR (_cost=0 AND b.booking_type NOT IN (''hajj'',''umrah'') AND b.cost_price=0)) AND');
  definition:=replace(definition,'SET approved_cost=_cost WHERE','SET approved_cost=_cost,commission_cost_review=false WHERE');
  definition:=replace(definition,'margin := b.selling_price-_cost','margin := pilgrimage_inventory_private.commission_margin(b,_cost)');
  definition:=replace(definition,'payment_status,notes,organization_id)', 'payment_status,notes,organization_id,workflow_managed)');
  definition:=replace(definition,'''عمولة حجز حج أو عمرة بعد اعتماد التكلفة'',b.organization_id',
    '''عمولة حجز بعد اعتماد التكلفة'',b.organization_id,true');
  EXECUTE definition;

  SELECT pg_get_functiondef('pilgrimage_inventory_private.reprice_pending_commissions(uuid,uuid,numeric)'::regprocedure) INTO definition;
  EXECUTE replace(definition,'AND payment_status=''pending''','AND payment_status=''pending'' AND workflow_managed');
  DROP TRIGGER pilgrimage_refresh_pending_commissions ON public.bookings;
  CREATE TRIGGER booking_refresh_pending_workflow_commissions AFTER UPDATE ON public.bookings
    FOR EACH ROW WHEN ((OLD.status,OLD.workflow_stage,OLD.selling_price) IS DISTINCT FROM (NEW.status,NEW.workflow_stage,NEW.selling_price))
    EXECUTE FUNCTION pilgrimage_inventory_private.refresh_pending_commissions();

  SELECT pg_get_functiondef('pilgrimage_inventory_private.guard_managed_commission()'::regprocedure) INTO definition;
  definition:=replace(definition,'OLD.booking_type IN (''umrah'',''hajj'')',
    '(OLD.workflow_managed OR pilgrimage_inventory_private.has_managed_commission(OLD.booking_id,OLD.organization_id))');
  EXECUTE replace(definition,'NEW.booking_type IN (''umrah'',''hajj'')',
    '(NEW.workflow_managed OR pilgrimage_inventory_private.has_managed_commission(NEW.booking_id,NEW.organization_id))');

  SELECT pg_get_functiondef('public.cancel_commission(uuid,text)'::regprocedure) INTO definition;
  EXECUTE replace(definition,'booking_type IN (''umrah'',''hajj'')','workflow_managed');
  SELECT pg_get_functiondef('public.validate_employee_commissions(uuid)'::regprocedure) INTO definition;
  definition:=replace(definition,'WHEN staff.booking_id IS NULL THEN b.profit','WHEN NOT c.workflow_managed THEN b.profit');
  definition:=replace(definition,'WHEN b.status=''cancelled'' THEN 0 ELSE b.selling_price-staff.approved_cost END',
    'ELSE pilgrimage_inventory_private.commission_margin(b,staff.approved_cost) END');
  EXECUTE replace(definition,'(staff.booking_id IS NULL OR','(NOT c.workflow_managed OR');

  SELECT pg_get_functiondef('public.create_booking_commission(uuid,uuid,numeric)'::regprocedure) INTO definition;
  anchor:='IF b.employee_id IS DISTINCT FROM p_employee_id THEN';
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected legacy commission path'; END IF;
  EXECUTE replace(definition,anchor,'IF EXISTS (SELECT FROM pilgrimage_inventory_private.booking_staff
    WHERE booking_id=b.id AND commission_managed) THEN RAISE EXCEPTION ''booking_commission_managed'' USING ERRCODE=''42501''; END IF;
  '||anchor);

  SELECT pg_get_functiondef('public.calculate_employee_bookings_profit(uuid,date,date,text)'::regprocedure) INTO definition;
  anchor:='AND b.employee_id=p_employee_id';
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected period commission path'; END IF;
  EXECUTE replace(definition,anchor,anchor||'
    AND NOT EXISTS(SELECT FROM pilgrimage_inventory_private.booking_staff s WHERE s.booking_id=b.id AND s.commission_managed)');

  SELECT pg_get_functiondef('public.create_trip_service_amendment(uuid,uuid,text,text,uuid,text,jsonb)'::regprocedure) INTO definition;
  anchor:='v_service := trip_amendment_private.service';
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected booking amendment function'; END IF;
  EXECUTE replace(definition,anchor,'IF v_operation=''change'' AND NOT pilgrimage_inventory_private.edit_access(b.id,b.organization_id) THEN
    RAISE EXCEPTION ''booking_edit_approval_required'' USING ERRCODE=''42501''; END IF;
  '||anchor);

  SELECT pg_get_functiondef('public.convert_quote_atomic(uuid,uuid)'::regprocedure) INTO definition;
  anchor:='public.convert_quote_atomic(_org uuid, _quote uuid)';
  IF strpos(definition,anchor)=0 OR strpos(definition,'q.assigned_employee_id')=0 THEN
    RAISE EXCEPTION 'Unexpected quote conversion function';
  END IF;
  definition:=replace(definition,anchor,'public.convert_quote_atomic(_org uuid, _quote uuid, _seller uuid)');
  EXECUTE replace(definition,'q.assigned_employee_id','_seller');
END;
$extend$;

CREATE OR REPLACE FUNCTION public.convert_quote_atomic(_org uuid,_quote uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.convert_quote_atomic(_org,_quote,(SELECT assigned_employee_id FROM public.quotes WHERE id=_quote AND organization_id=_org))
$$;

REVOKE ALL ON FUNCTION pilgrimage_inventory_private.attribute_unified_booking(),
  pilgrimage_inventory_private.guard_unified_staff_edit(),pilgrimage_inventory_private.guard_booking_service_edit(),
  pilgrimage_inventory_private.commission_margin(public.bookings,numeric),pilgrimage_inventory_private.refresh_commission_after_amendment(),
  pilgrimage_inventory_private.edit_access(uuid,uuid),pilgrimage_inventory_private.has_managed_commission(uuid,uuid),public.get_booking_staff(uuid),
  public.change_booking_edit_request(uuid,text,uuid,text),public.list_booking_sales_staff(uuid),
  public.booking_commission_policy(uuid,boolean,boolean),public.approve_booking_commission_cost(uuid,numeric),
  public.save_booking_edit_notes(uuid,text),public.list_booking_workflow_commissions(uuid),
  public.convert_quote_atomic(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pilgrimage_inventory_private.edit_access(uuid,uuid),pilgrimage_inventory_private.has_managed_commission(uuid,uuid),public.get_booking_staff(uuid),
  public.change_booking_edit_request(uuid,text,uuid,text),public.list_booking_sales_staff(uuid),
  public.booking_commission_policy(uuid,boolean,boolean),public.approve_booking_commission_cost(uuid,numeric),
  public.save_booking_edit_notes(uuid,text),public.list_booking_workflow_commissions(uuid),
  public.convert_quote_atomic(uuid,uuid,uuid) TO authenticated;
