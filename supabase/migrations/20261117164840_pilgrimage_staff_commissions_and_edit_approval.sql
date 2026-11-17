CREATE TABLE pilgrimage_inventory_private.booking_staff (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id) DEFERRABLE INITIALLY DEFERRED,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  operations_user_id uuid NOT NULL,
  seller_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  seller_name text,
  approved_cost numeric(14,2) CHECK (approved_cost>0),
  CHECK (seller_employee_id IS NULL OR seller_name IS NOT NULL)
);
CREATE INDEX pilgrimage_booking_staff_salesperson_idx ON pilgrimage_inventory_private.booking_staff(seller_employee_id);
CREATE TABLE pilgrimage_inventory_private.commission_policy (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id),
  sales_enabled boolean NOT NULL,
  operations_enabled boolean NOT NULL
);
CREATE TABLE pilgrimage_inventory_private.booking_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  requested_by uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','closed')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_at timestamptz,
  expires_at timestamptz
);
CREATE INDEX pilgrimage_edit_booking_idx ON pilgrimage_inventory_private.booking_edit_requests(booking_id, requested_at DESC);
CREATE UNIQUE INDEX pilgrimage_edit_open_idx ON pilgrimage_inventory_private.booking_edit_requests(booking_id, requested_by)
  WHERE status IN ('pending','approved');

INSERT INTO pilgrimage_inventory_private.booking_staff(booking_id,organization_id,operations_user_id)
SELECT booking_id,organization_id,created_by FROM public.umrah_inventory_bookings WHERE booking_id IS NOT NULL;

CREATE FUNCTION pilgrimage_inventory_private.check_staff_access(_org uuid, _permission text, _manager boolean DEFAULT false)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT FROM public.organization_members m
      WHERE m.organization_id = _org AND m.user_id = auth.uid() AND m.is_active
        AND (NOT _manager OR m.role IN ('owner','admin','manager')))
    AND coalesce(public.has_org_permission(_org, _permission), false)
$$;

CREATE FUNCTION pilgrimage_inventory_private.create_with_staff(
  _org uuid, _program uuid, _id uuid, _customer uuid, _room text, _mode text,
  _passengers jsonb, _total numeric, _seller uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  attribution pilgrimage_inventory_private.booking_staff%ROWTYPE;
  seller_name text;
BEGIN
  IF NOT pilgrimage_inventory_private.check_staff_access(_org, 'bookings_create')
  THEN RAISE EXCEPTION 'umrah_inventory_denied' USING ERRCODE = '42501'; END IF;
  -- The inventory engine serializes creation and validates the idempotency key's payload.
  PERFORM pilgrimage_inventory_private.create_booking(_org,_program,_id,_customer,_room,_mode,_passengers,_total);
  SELECT * INTO attribution FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=_id;
  IF FOUND THEN
    IF (attribution.seller_employee_id, attribution.organization_id, attribution.operations_user_id)
      IS DISTINCT FROM (_seller, _org, actor) THEN
      RAISE EXCEPTION 'pilgrimage_booking_staff_mismatch' USING ERRCODE = '22023';
    END IF;
    RETURN _id;
  END IF;
  IF _seller IS NOT NULL THEN
    SELECT full_name INTO seller_name FROM public.employees
      WHERE id=_seller AND organization_id=_org AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'pilgrimage_invalid_sales_employee' USING ERRCODE = '22023'; END IF;
  END IF;
  INSERT INTO pilgrimage_inventory_private.booking_staff
    (booking_id, organization_id, operations_user_id, seller_employee_id, seller_name)
    VALUES (_id, _org, actor, _seller, seller_name);
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_umrah_inventory_booking(
  _organization_id uuid, _program_id uuid, _id uuid, _customer_id uuid,
  _room_type text, _mode text, _passengers jsonb, _expected_total numeric
) RETURNS uuid LANGUAGE sql SET search_path = ''
AS $$
  SELECT pilgrimage_inventory_private.create_with_staff(_organization_id,_program_id,_id,_customer_id,
    _room_type,_mode,_passengers,_expected_total,NULL)
$$;
CREATE FUNCTION public.create_pilgrimage_inventory_booking(
  _organization_id uuid, _program_id uuid, _id uuid, _customer_id uuid,
  _room_type text, _mode text, _passengers jsonb, _expected_total numeric, _sales_employee_id uuid
) RETURNS uuid LANGUAGE sql SET search_path = ''
AS $$
  SELECT pilgrimage_inventory_private.create_with_staff(_organization_id,_program_id,_id,_customer_id,
    _room_type,_mode,_passengers,_expected_total,_sales_employee_id)
$$;
REVOKE EXECUTE ON FUNCTION pilgrimage_inventory_private.create_booking(uuid,uuid,uuid,uuid,text,text,jsonb,numeric) FROM authenticated;

CREATE FUNCTION pilgrimage_inventory_private.sales_staff(_org uuid)
RETURNS TABLE(id uuid, full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT e.id, e.full_name FROM public.employees e
  WHERE e.organization_id=_org AND e.is_active
    AND pilgrimage_inventory_private.check_staff_access(_org,'bookings_create')
  ORDER BY e.full_name, e.id
$$;
CREATE FUNCTION public.list_pilgrimage_sales_staff(_org uuid)
RETURNS TABLE(id uuid, full_name text) LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT * FROM pilgrimage_inventory_private.sales_staff(_org) $$;

CREATE FUNCTION pilgrimage_inventory_private.can_edit_passengers(_booking uuid, _actor uuid)
RETURNS boolean LANGUAGE sql SET search_path = ''
AS $$
  SELECT EXISTS (SELECT FROM pilgrimage_inventory_private.booking_edit_requests r
    WHERE r.booking_id=_booking AND r.requested_by=_actor AND r.status='approved' AND r.expires_at>clock_timestamp())
$$;

CREATE FUNCTION pilgrimage_inventory_private.guard_booked_passenger_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  SELECT b.booking_id INTO booking_uuid FROM public.umrah_inventory_bookings b
    WHERE b.id=OLD.inventory_booking_id AND b.organization_id=OLD.organization_id;
  IF booking_uuid IS NULL
     OR (to_jsonb(NEW) - ARRAY['updated_at','paid_amount']) = (to_jsonb(OLD) - ARRAY['updated_at','paid_amount'])
  THEN RETURN NEW; END IF;

  -- The existing manager-approved cancellation posts credits, refunds and releases stock.
  IF OLD.status <> 'cancelled' AND NEW.status='cancelled' AND EXISTS (
    SELECT FROM public.pilgrimage_operations o
    WHERE o.pilgrim_id=OLD.id AND o.organization_id=OLD.organization_id AND o.action='cancel'
      AND o.created_by=auth.uid() AND o.transaction_id=txid_current()
  ) THEN RETURN NEW; END IF;

  PERFORM 1 FROM pilgrimage_inventory_private.booking_edit_requests r
    WHERE r.booking_id=booking_uuid AND r.requested_by=auth.uid()
      AND r.status='approved' AND r.expires_at>clock_timestamp() FOR SHARE;
  IF NOT FOUND OR OLD.status='cancelled' OR NOT coalesce(public.can_org_write(OLD.organization_id),false) THEN
    RAISE EXCEPTION 'pilgrimage_booking_edit_locked' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER zz_pilgrimage_booking_edit_gate BEFORE UPDATE ON public.pilgrims
  FOR EACH ROW WHEN (OLD.inventory_booking_id IS NOT NULL)
  EXECUTE FUNCTION pilgrimage_inventory_private.guard_booked_passenger_edit();

CREATE FUNCTION pilgrimage_inventory_private.read_booking_staff(_booking uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  s pilgrimage_inventory_private.booking_staff%ROWTYPE;
  manager boolean;
  finance boolean;
  editor boolean;
  latest jsonb;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=_booking;
  IF NOT FOUND OR NOT pilgrimage_inventory_private.check_staff_access(b.organization_id,'bookings_view')
  THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=b.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  manager := pilgrimage_inventory_private.check_staff_access(b.organization_id,'bookings_edit',true)
    AND coalesce(public.can_org_write(b.organization_id),false);
  finance := pilgrimage_inventory_private.check_staff_access(b.organization_id,'financial_edit',true)
    AND coalesce(public.can_org_write(b.organization_id),false);
  editor := (s.operations_user_id=auth.uid() OR manager) AND coalesce(public.can_org_write(b.organization_id),false);
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,
    'mine',r.requested_by=auth.uid(),'name',p.full_name,'reason',r.reason,'expires_at',r.expires_at)
    ORDER BY r.requested_at DESC),'[]') INTO latest
  FROM (
    SELECT * FROM pilgrimage_inventory_private.booking_edit_requests
    WHERE booking_id=b.id AND (manager OR requested_by=auth.uid())
    ORDER BY requested_at DESC LIMIT 30
  ) r LEFT JOIN public.profiles p ON p.id=r.requested_by;
  RETURN jsonb_build_object('operations_name',(SELECT full_name FROM public.profiles WHERE id=s.operations_user_id),
    'sales_name',s.seller_name,'can_request',editor AND b.status<>'cancelled','can_approve',manager AND b.status<>'cancelled',
    'can_edit',b.status<>'cancelled' AND pilgrimage_inventory_private.can_edit_passengers(b.id,auth.uid()),
    'can_approve_cost',finance AND b.status<>'cancelled','cost',CASE WHEN finance THEN s.approved_cost END,
    'commission_profit',CASE WHEN finance THEN b.selling_price-s.approved_cost END,
    'requests',latest);
END;
$$;
CREATE FUNCTION public.get_pilgrimage_booking_staff(_booking uuid)
RETURNS jsonb LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.read_booking_staff(_booking) $$;

CREATE FUNCTION pilgrimage_inventory_private.change_edit_request(
  _booking uuid, _action text, _request uuid, _reason text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  b public.bookings%ROWTYPE;
  s pilgrimage_inventory_private.booking_staff%ROWTYPE;
  r pilgrimage_inventory_private.booking_edit_requests%ROWTYPE;
  manager boolean;
  reason text := btrim(coalesce(_reason,''));
BEGIN
  IF _action IS NULL OR _action NOT IN ('request','approve','reject','close')
  THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO b FROM public.bookings WHERE id=_booking FOR NO KEY UPDATE;
  IF NOT FOUND OR b.status='cancelled' OR NOT coalesce(public.can_org_write(b.organization_id),false)
    OR NOT pilgrimage_inventory_private.check_staff_access(b.organization_id,'bookings_view')
  THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=b.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
  manager := pilgrimage_inventory_private.check_staff_access(b.organization_id,'bookings_edit',true);
  IF _action='request' THEN
    IF actor<>s.operations_user_id AND NOT manager THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
    UPDATE pilgrimage_inventory_private.booking_edit_requests SET status='closed'
      WHERE booking_id=b.id AND requested_by=actor AND status='approved' AND expires_at<=clock_timestamp();
    SELECT * INTO r FROM pilgrimage_inventory_private.booking_edit_requests
      WHERE booking_id=b.id AND requested_by=actor AND status IN ('pending','approved');
    IF FOUND THEN RETURN r.id; END IF;
    INSERT INTO pilgrimage_inventory_private.booking_edit_requests(booking_id,requested_by,reason)
      VALUES(b.id,actor,reason) RETURNING * INTO r;
  ELSE
    SELECT * INTO r FROM pilgrimage_inventory_private.booking_edit_requests
      WHERE id=_request AND booking_id=b.id FOR UPDATE;
    IF NOT FOUND OR (
      NOT (_action IN ('approve','reject') AND r.status='pending' AND manager)
      AND NOT (_action='close' AND r.status IN ('pending','approved') AND (manager OR r.requested_by=actor))
    ) THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
    UPDATE pilgrimage_inventory_private.booking_edit_requests SET
      status=CASE _action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE 'closed' END,
      decided_by=CASE WHEN _action='close' THEN decided_by ELSE actor END,
      decided_at=CASE WHEN _action='close' THEN decided_at ELSE clock_timestamp() END,
      expires_at=CASE WHEN _action='approve' THEN clock_timestamp()+interval '30 minutes' ELSE expires_at END
      WHERE id=r.id;
  END IF;
  INSERT INTO public.booking_timeline_events(organization_id,booking_id,kind,actor_id,summary,payload)
    VALUES(b.organization_id,b.id,'pilgrimage_edit_'||_action,actor,
      CASE _action WHEN 'request' THEN 'طلب فتح تعديل الحجز' WHEN 'approve' THEN 'تم اعتماد فتح تعديل الحجز'
        WHEN 'reject' THEN 'تم رفض فتح تعديل الحجز' ELSE 'تم إقفال تعديل الحجز' END,
      jsonb_build_object('request_id',r.id,'reason',r.reason));
  RETURN r.id;
END;
$$;
CREATE FUNCTION public.change_pilgrimage_edit_request(_booking uuid, _action text, _request uuid, _reason text)
RETURNS uuid LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.change_edit_request(_booking,_action,_request,_reason) $$;

CREATE FUNCTION pilgrimage_inventory_private.manage_commission_policy(_org uuid,_sales boolean,_operations boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE rules pilgrimage_inventory_private.commission_policy%ROWTYPE;
BEGIN
  IF NOT pilgrimage_inventory_private.check_staff_access(_org,'employees_commission',true)
  THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
  IF _sales IS NOT NULL AND _operations IS NOT NULL THEN
    IF NOT coalesce(public.can_org_write(_org),false) THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
    INSERT INTO pilgrimage_inventory_private.commission_policy VALUES (_org,_sales,_operations)
    ON CONFLICT (organization_id) DO UPDATE
      SET sales_enabled=EXCLUDED.sales_enabled, operations_enabled=EXCLUDED.operations_enabled;
  END IF;
  SELECT * INTO rules FROM pilgrimage_inventory_private.commission_policy WHERE organization_id=_org;
  RETURN jsonb_build_object('sales_enabled',coalesce(rules.sales_enabled,false),
    'operations_enabled',coalesce(rules.operations_enabled,false));
END;
$$;
CREATE FUNCTION public.pilgrimage_commission_policy(_org uuid,_sales boolean,_operations boolean)
RETURNS jsonb LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.manage_commission_policy(_org,_sales,_operations) $$;

CREATE FUNCTION pilgrimage_inventory_private.reprice_pending_commissions(_booking uuid,_org uuid,_profit numeric)
RETURNS void LANGUAGE sql SET search_path = ''
AS $$
  UPDATE public.employee_commissions
    SET booking_amount=greatest(coalesce(_profit,0),0),
      commission_amount=round(greatest(coalesce(_profit,0),0)*commission_rate/100,2),
      payment_status=CASE WHEN round(greatest(coalesce(_profit,0),0)*commission_rate/100,2)=0
        THEN 'cancelled' ELSE 'pending' END
  WHERE booking_id=_booking AND organization_id=_org AND payment_status='pending'
$$;

CREATE FUNCTION pilgrimage_inventory_private.approve_booking_cost(_booking uuid,_cost numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  b public.bookings%ROWTYPE;
  s pilgrimage_inventory_private.booking_staff%ROWTYPE;
  rules pilgrimage_inventory_private.commission_policy%ROWTYPE;
  operations_employee uuid;
  margin numeric;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=_booking FOR NO KEY UPDATE;
  IF NOT FOUND OR b.status NOT IN ('confirmed','completed') OR b.is_demo
    OR NOT pilgrimage_inventory_private.check_staff_access(b.organization_id,'financial_edit',true)
    OR NOT coalesce(public.can_org_write(b.organization_id),false)
  THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
  IF _cost IS NULL OR NOT (_cost>0 AND _cost<1000000000000 AND round(_cost,2)=_cost) THEN
    RAISE EXCEPTION 'pilgrimage_invalid_booking_cost' USING ERRCODE='22023';
  END IF;
  SELECT * INTO s FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=b.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501'; END IF;
  -- One family booking may have several suppliers. This approval establishes the
  -- commission basis and does not create any supplier order or payable.
  UPDATE pilgrimage_inventory_private.booking_staff SET approved_cost=_cost WHERE booking_id=b.id;
  margin := b.selling_price-_cost;
  PERFORM pilgrimage_inventory_private.reprice_pending_commissions(b.id,b.organization_id,margin);
  SELECT * INTO rules FROM pilgrimage_inventory_private.commission_policy WHERE organization_id=b.organization_id;
  IF rules.operations_enabled THEN
    -- Use the verified account email and require a unique employee match in this company.
    SELECT CASE WHEN count(*)=1 THEN (array_agg(e.id))[1] END INTO operations_employee
    FROM auth.users u JOIN public.employees e ON lower(e.email)=lower(u.email)
    WHERE u.id=s.operations_user_id AND u.email_confirmed_at IS NOT NULL
      AND e.organization_id=b.organization_id AND e.is_active;
  END IF;
  IF margin>0 THEN
    INSERT INTO public.employee_commissions(employee_id,booking_id,booking_type,booking_amount,commission_rate,
      commission_amount,currency,commission_date,payment_status,notes,organization_id)
    SELECT e.id,b.id,b.booking_type,margin,e.commission_rate,
      round(margin*e.commission_rate/100,2),b.currency,coalesce(b.start_date,current_date),
      'pending','عمولة حجز حج أو عمرة بعد اعتماد التكلفة',b.organization_id
    FROM public.employees e
    WHERE e.organization_id=b.organization_id AND e.is_active AND e.commission_rate>0 AND e.commission_rate<=100
      AND round(margin*e.commission_rate/100,2)>0
      AND (e.id=operations_employee OR (rules.sales_enabled AND e.id=s.seller_employee_id))
    ON CONFLICT (employee_id,booking_id) WHERE booking_id IS NOT NULL AND payment_status<>'cancelled' DO NOTHING;
  END IF;
  INSERT INTO public.booking_timeline_events(organization_id,booking_id,kind,actor_id,summary,payload)
    VALUES(b.organization_id,b.id,'pilgrimage_cost_approved',auth.uid(),'تم اعتماد تكلفة الحجز لحساب الربح والعمولة',
      jsonb_build_object('commission_eligible',coalesce(margin>0,false)));
END;
$$;
CREATE FUNCTION public.approve_pilgrimage_booking_cost(_booking uuid,_cost numeric)
RETURNS void LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.approve_booking_cost(_booking,_cost) $$;

CREATE FUNCTION pilgrimage_inventory_private.refresh_pending_commissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  cost numeric;
BEGIN
  SELECT approved_cost INTO cost FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=NEW.id;
  IF cost IS NOT NULL THEN
    PERFORM pilgrimage_inventory_private.reprice_pending_commissions(NEW.id,NEW.organization_id,
      CASE WHEN NEW.status='cancelled' THEN 0 ELSE NEW.selling_price-cost END);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pilgrimage_refresh_pending_commissions AFTER UPDATE ON public.bookings
  FOR EACH ROW WHEN (NEW.booking_type IN ('umrah','hajj')
    AND (OLD.status,OLD.selling_price) IS DISTINCT FROM (NEW.status,NEW.selling_price))
  EXECUTE FUNCTION pilgrimage_inventory_private.refresh_pending_commissions();

-- Keep the existing booking-level commissions on this path and prevent an
-- attributed pilgrimage booking from being reassigned to the legacy period path.
CREATE FUNCTION pilgrimage_inventory_private.guard_staff_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN RAISE EXCEPTION 'pilgrimage_booking_staff_fixed' USING ERRCODE='42501'; END IF;
  IF NEW.notes IS DISTINCT FROM OLD.notes
    AND NOT pilgrimage_inventory_private.can_edit_passengers(OLD.id,auth.uid()) THEN
    RAISE EXCEPTION 'pilgrimage_booking_edit_locked' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER zzz_pilgrimage_staff_booking BEFORE UPDATE ON public.bookings
  FOR EACH ROW WHEN (OLD.booking_type IN ('umrah','hajj'))
  EXECUTE FUNCTION pilgrimage_inventory_private.guard_staff_booking();

CREATE FUNCTION pilgrimage_inventory_private.guard_commission_work_email()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  org uuid := CASE WHEN TG_OP='INSERT' THEN NEW.organization_id ELSE OLD.organization_id END;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE'
    OR TG_OP='INSERT'
    OR (NEW.email,NEW.organization_id,NEW.is_active) IS DISTINCT FROM (OLD.email,OLD.organization_id,OLD.is_active) THEN
    IF NOT coalesce(public.has_org_permission(org,'employees_edit'),false)
      OR coalesce(public.get_user_org_role(auth.uid(),org)::text,'') NOT IN ('owner','admin','manager')
      OR (TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
      RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF (TG_OP='INSERT' AND coalesce(NEW.commission_rate,0)<>0
      OR TG_OP='UPDATE' AND NEW.commission_rate IS DISTINCT FROM OLD.commission_rate)
    AND (NOT coalesce(public.has_org_permission(org,'employees_commission'),false)
      OR coalesce(public.get_user_org_role(auth.uid(),org)::text,'') NOT IN ('owner','admin','manager')) THEN
    RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pilgrimage_guard_employee_commission_fields BEFORE INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_commission_work_email();

CREATE FUNCTION pilgrimage_inventory_private.guard_managed_commission()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  old_managed boolean := TG_OP<>'INSERT' AND OLD.booking_type IN ('umrah','hajj');
  new_managed boolean := TG_OP<>'DELETE' AND NEW.booking_type IN ('umrah','hajj');
BEGIN
  IF current_user IN ('authenticated','anon') AND (old_managed OR new_managed) THEN
    IF TG_OP <> 'UPDATE' OR NOT coalesce(public.has_org_permission(OLD.organization_id,'employees_commission'),false)
      OR coalesce(public.get_user_org_role(auth.uid(),OLD.organization_id)::text,'') NOT IN ('owner','admin','manager')
      OR (to_jsonb(NEW) - ARRAY['payment_status','payment_date','updated_at']) <>
         (to_jsonb(OLD) - ARRAY['payment_status','payment_date','updated_at'])
      OR OLD.payment_status IS DISTINCT FROM 'pending' OR NEW.payment_status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'pilgrimage_staff_denied' USING ERRCODE='42501';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pilgrimage_guard_commission_columns BEFORE INSERT OR UPDATE OR DELETE ON public.employee_commissions
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.guard_managed_commission();

CREATE POLICY pilgrimage_commissions_manager_read ON public.employee_commissions AS RESTRICTIVE
  FOR SELECT TO authenticated USING (
    booking_type IS NULL OR booking_type NOT IN ('umrah','hajj') OR (
      coalesce(public.has_org_permission(organization_id,'employees_commission'),false)
      AND coalesce(public.get_user_org_role(auth.uid(),organization_id)::text,'') IN ('owner','admin','manager')
    )
  );

CREATE FUNCTION public.list_pilgrimage_booking_commissions(_org uuid)
RETURNS TABLE(id uuid, booking_id uuid, booking_type text, booking_number text, employee_name text,
  commission_rate numeric, commission_amount numeric, currency text, payment_status text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT c.id,c.booking_id,c.booking_type,b.booking_number,e.full_name,
    c.commission_rate,c.commission_amount,c.currency,c.payment_status
  FROM public.employee_commissions c
  JOIN public.bookings b ON b.id=c.booking_id AND b.organization_id=c.organization_id
  LEFT JOIN public.employees e ON e.id=c.employee_id AND e.organization_id=c.organization_id
  WHERE c.organization_id=_org AND c.booking_type IN ('hajj','umrah')
  ORDER BY c.created_at DESC, c.id
$$;
REVOKE ALL ON FUNCTION public.list_pilgrimage_booking_commissions(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_pilgrimage_booking_commissions(uuid) TO authenticated;

DO $commission_guard$
DECLARE
  definition text;
  anchor text := 'IF v_status=''paid'' THEN';
  booking_join text := 'LEFT JOIN public.bookings b ON b.id=c.booking_id';
BEGIN
  SELECT pg_get_functiondef('public.cancel_commission(uuid,text)'::regprocedure) INTO definition;
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected commission cancellation function'; END IF;
  EXECUTE replace(definition,anchor,'IF EXISTS (SELECT FROM public.employee_commissions
    WHERE id=p_commission_id AND booking_type IN (''umrah'',''hajj''))
    AND NOT pilgrimage_inventory_private.check_staff_access(v_org,''employees_commission'',true)
    THEN RAISE EXCEPTION ''pilgrimage_staff_denied'' USING ERRCODE=''42501''; END IF;
  ' || anchor);

  SELECT pg_get_functiondef('public.validate_employee_commissions(uuid)'::regprocedure) INTO definition;
  IF strpos(definition,booking_join)=0 OR strpos(definition,'b.profit')=0 THEN
    RAISE EXCEPTION 'Unexpected commission validation function';
  END IF;
  definition := replace(definition,'b.profit',
    '(CASE WHEN staff.booking_id IS NULL THEN b.profit
      WHEN b.status=''cancelled'' THEN 0 ELSE b.selling_price-staff.approved_cost END)');
  definition := replace(definition,booking_join,booking_join || '
  LEFT JOIN pilgrimage_inventory_private.booking_staff staff ON staff.booking_id=b.id AND staff.organization_id=b.organization_id');
  EXECUTE replace(definition,'WHERE c.employee_id=p_employee_id','WHERE c.employee_id=p_employee_id
    AND (staff.booking_id IS NULL OR pilgrimage_inventory_private.check_staff_access(c.organization_id,''employees_commission'',true))');
END;
$commission_guard$;

REVOKE ALL ON ALL TABLES IN SCHEMA pilgrimage_inventory_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pilgrimage_inventory_private.check_staff_access(uuid,text,boolean),
  pilgrimage_inventory_private.can_edit_passengers(uuid,uuid), pilgrimage_inventory_private.guard_booked_passenger_edit(),
  pilgrimage_inventory_private.refresh_pending_commissions(), pilgrimage_inventory_private.reprice_pending_commissions(uuid,uuid,numeric),
  pilgrimage_inventory_private.guard_staff_booking(),
  pilgrimage_inventory_private.guard_commission_work_email(), pilgrimage_inventory_private.guard_managed_commission() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION pilgrimage_inventory_private.create_with_staff(uuid,uuid,uuid,uuid,text,text,jsonb,numeric,uuid),
  pilgrimage_inventory_private.sales_staff(uuid), pilgrimage_inventory_private.read_booking_staff(uuid),
  pilgrimage_inventory_private.change_edit_request(uuid,text,uuid,text),
  pilgrimage_inventory_private.manage_commission_policy(uuid,boolean,boolean), pilgrimage_inventory_private.approve_booking_cost(uuid,numeric),
  public.create_pilgrimage_inventory_booking(uuid,uuid,uuid,uuid,text,text,jsonb,numeric,uuid),
  public.list_pilgrimage_sales_staff(uuid), public.get_pilgrimage_booking_staff(uuid),
  public.change_pilgrimage_edit_request(uuid,text,uuid,text), public.pilgrimage_commission_policy(uuid,boolean,boolean),
  public.approve_pilgrimage_booking_cost(uuid,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pilgrimage_inventory_private.create_with_staff(uuid,uuid,uuid,uuid,text,text,jsonb,numeric,uuid),
  pilgrimage_inventory_private.sales_staff(uuid), pilgrimage_inventory_private.read_booking_staff(uuid),
  pilgrimage_inventory_private.change_edit_request(uuid,text,uuid,text),
  pilgrimage_inventory_private.manage_commission_policy(uuid,boolean,boolean), pilgrimage_inventory_private.approve_booking_cost(uuid,numeric),
  public.create_pilgrimage_inventory_booking(uuid,uuid,uuid,uuid,text,text,jsonb,numeric,uuid),
  public.list_pilgrimage_sales_staff(uuid), public.get_pilgrimage_booking_staff(uuid),
  public.change_pilgrimage_edit_request(uuid,text,uuid,text), public.pilgrimage_commission_policy(uuid,boolean,boolean),
  public.approve_pilgrimage_booking_cost(uuid,numeric) TO authenticated;
