-- An edit approval never authorizes rewriting issued financial documents.
ALTER TABLE pilgrimage_inventory_private.booking_staff ADD COLUMN creation_xid bigint;
ALTER TABLE pilgrimage_inventory_private.booking_staff ALTER COLUMN creation_xid SET DEFAULT txid_current();

CREATE FUNCTION pilgrimage_inventory_private.booking_financials_issued(_booking uuid,_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (auth.uid() IS NULL OR coalesce(public.user_belongs_to_org(auth.uid(),_org),false))
    AND (EXISTS (
    SELECT FROM public.invoices i WHERE i.booking_id=_booking AND i.organization_id=_org
      AND coalesce(i.status,'draft') NOT IN ('draft','cancelled','canceled','void')
  ) OR EXISTS (
    SELECT FROM public.customer_payments p WHERE p.booking_id=_booking AND p.organization_id=_org
      AND p.status IN ('pending','completed')
  ) OR EXISTS (
    SELECT FROM public.supplier_payment_orders p WHERE p.booking_id=_booking AND p.organization_id=_org
      AND p.status NOT IN ('cancelled','canceled')
  ))
$$;

CREATE FUNCTION pilgrimage_inventory_private.protect_booking_financial_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    IF current_user IN ('authenticated','anon')
      AND pilgrimage_inventory_private.booking_financials_issued(OLD.id,OLD.organization_id) THEN
      RAISE EXCEPTION 'booking_financial_amendment_required' USING ERRCODE='42501';
    END IF;
    RETURN OLD;
  END IF;
  IF current_user IN ('authenticated','anon') AND (
      NEW.selling_price,NEW.cost_price,NEW.base_selling_price,NEW.base_cost_price,NEW.currency,
      NEW.customer_id,NEW.supplier_id,NEW.customer_name,NEW.supplier_name,NEW.start_date,NEW.end_date,NEW.booking_number,NEW.quote_id,NEW.payment_policy,NEW.deposit_percent,NEW.cancellation_terms,NEW.revenue_recognition_mode
    ) IS DISTINCT FROM (
      OLD.selling_price,OLD.cost_price,OLD.base_selling_price,OLD.base_cost_price,OLD.currency,
      OLD.customer_id,OLD.supplier_id,OLD.customer_name,OLD.supplier_name,OLD.start_date,OLD.end_date,OLD.booking_number,OLD.quote_id,OLD.payment_policy,OLD.deposit_percent,OLD.cancellation_terms,OLD.revenue_recognition_mode
    ) THEN RAISE EXCEPTION 'booking_financial_amendment_required' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER a_protect_booking_financial_fields BEFORE UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.protect_booking_financial_fields();

CREATE FUNCTION pilgrimage_inventory_private.protect_service_financial_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  payload jsonb := CASE WHEN TG_OP='INSERT' THEN to_jsonb(NEW) ELSE to_jsonb(OLD) END;
  prior jsonb;
  parent uuid := (payload->>'booking_id')::uuid;
  org uuid := (payload->>'organization_id')::uuid;
  field text;
BEGIN
  IF current_user NOT IN ('authenticated','anon') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP IN ('INSERT','DELETE') THEN
    IF parent IS NULL AND TG_OP='DELETE' THEN
      SELECT id,organization_id INTO parent,org FROM public.bookings
      WHERE organization_id=org AND legacy_table=TG_TABLE_NAME AND legacy_id=(payload->>'id')::uuid
        AND pilgrimage_inventory_private.booking_financials_issued(id,organization_id)
      LIMIT 1;
    ELSIF org IS NULL THEN
      SELECT organization_id INTO org FROM public.bookings WHERE id=parent;
    END IF;
    IF parent IS NOT NULL AND pilgrimage_inventory_private.booking_financials_issued(parent,org) THEN
      RAISE EXCEPTION 'booking_financial_amendment_required' USING ERRCODE='42501';
    END IF;
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  prior:=payload;
  payload:=to_jsonb(NEW);
  -- Supplier/customer changes, status, dates, amounts and passengers feed
  -- either the invoice, the supplier's obligation or a priced itinerary.
  FOR field IN SELECT jsonb_object_keys(prior) LOOP
    IF field ~ '(^|_)(price|cost|amount|currency|profit|total|rate|fee|fees|tax|taxes|commission|vat|discount|date|check_in|check_out|room_type|rooms|nights|passengers|adults|children|status|supplier_id|customer_id)(_|$)'
       AND field NOT IN ('updated_at','created_at','invoice_sent_date','supplier_payment_sent_date','voucher_sent_date')
       AND payload->field IS DISTINCT FROM prior->field THEN
      RAISE EXCEPTION 'booking_financial_amendment_required' USING ERRCODE='42501';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
DO $protect$
DECLARE relation text;
BEGIN
  FOREACH relation IN ARRAY ARRAY['hotel_bookings','flight_bookings','car_rentals','transport_bookings',
    'booking_hotel_details','booking_flight_details','booking_car_details','booking_transport_details']
  LOOP
    EXECUTE format('CREATE TRIGGER a_finance_booking_service BEFORE INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.protect_service_financial_fields()',relation);
  END LOOP;
END;
$protect$;

CREATE FUNCTION pilgrimage_inventory_private.has_other_booking_reviewer(_org uuid,_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT EXISTS (SELECT FROM public.organization_members m WHERE m.organization_id=_org
    AND m.user_id<>_actor AND m.is_active AND m.role IN ('owner','admin','manager')
    AND EXISTS (SELECT FROM public._org_permission_state(m.organization_id,m.user_id,'bookings_edit') p WHERE p.granted))
$$;

DO $workflow$
DECLARE definition text; anchor text;
BEGIN
  SELECT pg_get_functiondef('public.sync_booking_financials(uuid)'::regprocedure) INTO definition;
  anchor := 'UPDATE public.bookings';
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected booking finance sync'; END IF;
  EXECUTE replace(definition,anchor,'IF pilgrimage_inventory_private.booking_financials_issued(b.id,b.organization_id)
    AND NOT EXISTS (SELECT FROM pilgrimage_inventory_private.booking_staff staff
      WHERE staff.booking_id=b.id AND staff.creation_xid=txid_current()) THEN
    RAISE EXCEPTION ''booking_financial_amendment_required'' USING ERRCODE=''42501'';
  END IF;

  '||anchor);

  SELECT pg_get_functiondef('pilgrimage_inventory_private.change_edit_request(uuid,text,uuid,text)'::regprocedure) INTO definition;
  anchor := '_action IN (''approve'',''reject'') AND r.status=''pending'' AND manager';
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected edit approval'; END IF;
  EXECUTE replace(definition,anchor,'('||anchor||')
      AND (_action<>''approve'' OR r.requested_by<>actor
        OR NOT pilgrimage_inventory_private.has_other_booking_reviewer(b.organization_id,actor))');

  SELECT pg_get_functiondef('pilgrimage_inventory_private.read_booking_staff(uuid)'::regprocedure) INTO definition;
  anchor:=$key$'requests'$key$;
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected booking staff response'; END IF;
  EXECUTE replace(definition,anchor,$new$'financials_issued',pilgrimage_inventory_private.booking_financials_issued(b.id,b.organization_id),
    'can_self_approve',manager AND NOT pilgrimage_inventory_private.has_other_booking_reviewer(b.organization_id,auth.uid()),
    'requests'$new$);
END;
$workflow$;

CREATE TABLE pilgrimage_inventory_private.commission_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id uuid NOT NULL REFERENCES public.employee_commissions(id),
  previous_entitlement numeric(16,2) NOT NULL,
  new_entitlement numeric(16,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK(previous_entitlement<>new_entitlement)
);
CREATE INDEX commission_reconciliation_latest ON pilgrimage_inventory_private.commission_reconciliations
  (commission_id,created_at DESC,id DESC);

CREATE TABLE pilgrimage_inventory_private.commission_cash_settlements (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  commission_id uuid NOT NULL REFERENCES public.employee_commissions(id),
  treasury_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  signed_amount numeric(16,2) NOT NULL CHECK (signed_amount<>0),
  currency text NOT NULL,
  exchange_rate numeric NOT NULL CHECK (exchange_rate>0 AND exchange_rate<1000000),
  reference text NOT NULL CHECK (char_length(reference) BETWEEN 3 AND 200),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id),
  treasury_transaction_id uuid NOT NULL REFERENCES public.bank_account_transactions(id),
  initial_payment boolean NOT NULL,
  UNIQUE(organization_id,treasury_id,reference)
);
CREATE INDEX commission_cash_settlement_commission ON pilgrimage_inventory_private.commission_cash_settlements(commission_id);

CREATE OR REPLACE FUNCTION pilgrimage_inventory_private.reprice_pending_commissions(_booking uuid,_org uuid,_profit numeric)
RETURNS void LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  UPDATE public.employee_commissions
    SET booking_amount=greatest(coalesce(_profit,0),0),
      commission_amount=round(greatest(coalesce(_profit,0),0)*commission_rate/100,2),
      payment_status=CASE WHEN round(greatest(coalesce(_profit,0),0)*commission_rate/100,2)=0
        THEN 'cancelled' ELSE 'pending' END
  WHERE booking_id=_booking AND organization_id=_org AND payment_status='pending' AND workflow_managed;

  -- A pending supplier-cost review is not a reversal of an already paid amount.
  IF EXISTS (SELECT FROM pilgrimage_inventory_private.booking_staff
    WHERE booking_id=_booking AND commission_cost_review) THEN RETURN; END IF;

  INSERT INTO pilgrimage_inventory_private.commission_reconciliations(commission_id,previous_entitlement,new_entitlement)
  SELECT c.id,coalesce(last.new_entitlement,c.commission_amount),
    round(greatest(coalesce(_profit,0),0)*c.commission_rate/100,2)
  FROM public.employee_commissions c
  LEFT JOIN LATERAL (
    SELECT a.new_entitlement FROM pilgrimage_inventory_private.commission_reconciliations a
    WHERE a.commission_id=c.id ORDER BY a.created_at DESC,a.id DESC LIMIT 1
  ) last ON true
  WHERE c.booking_id=_booking AND c.organization_id=_org AND c.workflow_managed AND c.payment_status='paid'
    AND coalesce(last.new_entitlement,c.commission_amount) IS DISTINCT FROM
      round(greatest(coalesce(_profit,0),0)*c.commission_rate/100,2);
END;
$$;

CREATE OR REPLACE FUNCTION pilgrimage_inventory_private.refresh_pending_commissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE staff pilgrimage_inventory_private.booking_staff%ROWTYPE;
BEGIN
  SELECT * INTO staff FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=NEW.id AND commission_managed;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.status IN ('cancelled','canceled') OR NEW.workflow_stage::text='cancelled' THEN
    UPDATE pilgrimage_inventory_private.booking_staff SET commission_cost_review=false WHERE booking_id=NEW.id AND commission_cost_review;
    PERFORM pilgrimage_inventory_private.reprice_pending_commissions(NEW.id,NEW.organization_id,0);
  ELSIF staff.approved_cost IS NOT NULL AND NOT staff.commission_cost_review THEN
    PERFORM pilgrimage_inventory_private.reprice_pending_commissions(NEW.id,NEW.organization_id,
      pilgrimage_inventory_private.commission_margin(NEW,staff.approved_cost));
  END IF;
  RETURN NEW;
END;
$$;

-- Recognize any existing managed differences without recording a cash movement.
INSERT INTO pilgrimage_inventory_private.commission_reconciliations(commission_id,previous_entitlement,new_entitlement)
SELECT c.id,c.commission_amount,desired.amount
FROM public.employee_commissions c
JOIN public.bookings b ON b.id=c.booking_id AND b.organization_id=c.organization_id
JOIN pilgrimage_inventory_private.booking_staff staff ON staff.booking_id=b.id
CROSS JOIN LATERAL (SELECT round(greatest(pilgrimage_inventory_private.commission_margin(b,staff.approved_cost),0)
  *c.commission_rate/100,2) AS amount) desired
WHERE c.workflow_managed AND c.payment_status='paid' AND desired.amount IS DISTINCT FROM c.commission_amount
  AND (b.status IN ('cancelled','canceled') OR b.workflow_stage::text='cancelled'
    OR (staff.approved_cost IS NOT NULL AND NOT staff.commission_cost_review));

CREATE FUNCTION pilgrimage_inventory_private.protect_commission_treasury_movement()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND (
    (TG_OP<>'INSERT' AND OLD.source_type='commission_payment')
    OR (TG_OP<>'DELETE' AND NEW.source_type='commission_payment')
  ) THEN RAISE EXCEPTION 'commission_settlement_rpc_required' USING ERRCODE='42501'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_booking_commission_treasury_movement BEFORE INSERT OR UPDATE OR DELETE ON public.bank_account_transactions
  FOR EACH ROW EXECUTE FUNCTION pilgrimage_inventory_private.protect_commission_treasury_movement();

CREATE FUNCTION pilgrimage_inventory_private.commission_statement(_org uuid)
RETURNS TABLE(id uuid,booking_id uuid,booking_type text,booking_number text,employee_name text,
  commission_rate numeric,commission_amount numeric,currency text,payment_status text,entitlement numeric,
  signed_balance numeric,can_settle boolean,cost_needs_review boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT c.id,c.booking_id,c.booking_type,b.booking_number,e.full_name,c.commission_rate,c.commission_amount,c.currency,c.payment_status,
    coalesce(a.new_entitlement,c.commission_amount),
    CASE WHEN c.payment_status='cancelled' THEN 0
      WHEN c.payment_status='pending' THEN c.commission_amount
      ELSE coalesce(a.new_entitlement,c.commission_amount)-c.commission_amount-coalesce(p.additional,0) END,
    coalesce(public.can_org_write(_org),false)
      AND EXISTS (SELECT FROM public._org_permission_state(_org,auth.uid(),'payments_process') s
        WHERE s.granted AND s.data_scope='organization'),
    staff.commission_cost_review
  FROM public.employee_commissions c
  JOIN public.bookings b ON b.id=c.booking_id AND b.organization_id=c.organization_id
  JOIN pilgrimage_inventory_private.booking_staff staff ON staff.booking_id=b.id
  LEFT JOIN public.employees e ON e.id=c.employee_id AND e.organization_id=c.organization_id
  LEFT JOIN LATERAL (SELECT r.new_entitlement FROM pilgrimage_inventory_private.commission_reconciliations r
    WHERE r.commission_id=c.id ORDER BY r.created_at DESC,r.id DESC LIMIT 1) a ON true
  LEFT JOIN LATERAL (SELECT sum(x.signed_amount) AS additional FROM pilgrimage_inventory_private.commission_cash_settlements x
    WHERE x.commission_id=c.id AND NOT x.initial_payment) p ON true
  WHERE c.organization_id=_org AND c.workflow_managed
    AND pilgrimage_inventory_private.check_staff_access(_org,'employees_commission',true)
  ORDER BY c.created_at DESC,c.id
$$;
CREATE FUNCTION public.get_booking_commission_statement(_org uuid)
RETURNS TABLE(id uuid,booking_id uuid,booking_type text,booking_number text,employee_name text,
  commission_rate numeric,commission_amount numeric,currency text,payment_status text,entitlement numeric,
  signed_balance numeric,can_settle boolean,cost_needs_review boolean)
LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT * FROM pilgrimage_inventory_private.commission_statement(_org) $$;

CREATE FUNCTION pilgrimage_inventory_private.settle_commission(_commission uuid,_request uuid,_treasury uuid,
  _expected numeric,_rate numeric,_reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  c public.employee_commissions%ROWTYPE;
  staff pilgrimage_inventory_private.booking_staff%ROWTYPE;
  bank public.bank_accounts%ROWTYPE;
  prior pilgrimage_inventory_private.commission_cash_settlements%ROWTYPE;
  journal uuid;
  bank_tx uuid;
  balance numeric;
  expense uuid;
  treasury_account uuid;
  memo text;
  ref text := btrim(coalesce(_reference,''));
  initial boolean;
BEGIN
  SELECT * INTO c FROM public.employee_commissions WHERE id=_commission AND workflow_managed;
  IF NOT FOUND OR NOT pilgrimage_inventory_private.check_staff_access(c.organization_id,'employees_commission',true)
    OR NOT coalesce(public.can_org_write(c.organization_id),false)
    OR NOT EXISTS (SELECT FROM public._org_permission_state(c.organization_id,actor,'payments_process') s
      WHERE s.granted AND s.data_scope='organization') THEN
    RAISE EXCEPTION 'commission_settlement_denied' USING ERRCODE='42501';
  END IF;
  IF _request IS NULL OR _treasury IS NULL OR char_length(ref) NOT BETWEEN 3 AND 200
    OR NOT coalesce(_rate>0 AND _rate<1000000,false) OR (coalesce(c.currency,'EGP')='EGP' AND _rate<>1) THEN
    RAISE EXCEPTION 'commission_settlement_invalid' USING ERRCODE='22023';
  END IF;
  -- The same lock order as booking changes and commission recalculation.
  PERFORM 1 FROM public.bookings WHERE id=c.booking_id AND organization_id=c.organization_id FOR NO KEY UPDATE;
  SELECT * INTO STRICT c FROM public.employee_commissions WHERE id=_commission AND workflow_managed FOR UPDATE;
  SELECT * INTO prior FROM pilgrimage_inventory_private.commission_cash_settlements WHERE id=_request;
  IF FOUND THEN
    IF (prior.commission_id,prior.treasury_id,prior.signed_amount,prior.exchange_rate,prior.reference,prior.created_by)
      IS DISTINCT FROM (_commission,_treasury,_expected,_rate,ref,actor) THEN
      RAISE EXCEPTION 'commission_settlement_retry_mismatch' USING ERRCODE='22023';
    END IF;
    RETURN prior.id;
  END IF;

  SELECT * INTO STRICT staff FROM pilgrimage_inventory_private.booking_staff WHERE booking_id=c.booking_id;
  SELECT s.signed_balance INTO balance FROM pilgrimage_inventory_private.commission_statement(c.organization_id) s WHERE s.id=c.id;
  IF staff.commission_cost_review OR balance IS NULL OR balance=0 OR balance IS DISTINCT FROM _expected THEN
    RAISE EXCEPTION 'commission_settlement_amount_changed' USING ERRCODE='22023';
  END IF;
  initial:=c.payment_status='pending';

  SELECT * INTO bank FROM public.bank_accounts
    WHERE id=_treasury AND organization_id=c.organization_id AND is_active FOR UPDATE;
  IF NOT FOUND OR bank.currency IS DISTINCT FROM c.currency OR bank.treasury_kind IS NULL
    OR (balance>0 AND bank.treasury_kind='cash' AND coalesce(bank.current_balance,0)<balance) THEN
    RAISE EXCEPTION 'commission_settlement_invalid_treasury' USING ERRCODE='22023';
  END IF;
  expense:=public._resolve_account(c.organization_id,'6010');
  treasury_account:=public.get_org_account_route(c.organization_id,CASE WHEN bank.treasury_kind='cash' THEN 'cash' ELSE 'bank' END);
  memo:=CASE WHEN balance>0 THEN 'صرف عمولة حجز' ELSE 'رد فرق عمولة حجز' END;
  journal:=refund_balance_private.post(c.organization_id,'commission_payment',_request,c.booking_id,c.currency,_rate,
    ARRAY[CASE WHEN balance>0 THEN expense ELSE treasury_account END],ARRAY[abs(balance)],
    CASE WHEN balance>0 THEN treasury_account ELSE expense END,memo);
  INSERT INTO public.bank_account_transactions(bank_account_id,organization_id,transaction_type,amount,
    description,transaction_date,reference_number,created_by,source_type,source_id,currency)
  VALUES(bank.id,c.organization_id,CASE WHEN balance>0 THEN 'withdrawal' ELSE 'deposit' END,abs(balance),
    memo,CURRENT_DATE,ref,actor,'commission_payment',_request,c.currency) RETURNING id INTO bank_tx;

  INSERT INTO pilgrimage_inventory_private.commission_cash_settlements(id,organization_id,commission_id,treasury_id,
    signed_amount,currency,exchange_rate,reference,created_by,journal_id,treasury_transaction_id,initial_payment)
  VALUES(_request,c.organization_id,c.id,bank.id,balance,c.currency,_rate,ref,actor,journal,bank_tx,initial);
  IF initial THEN
    UPDATE public.employee_commissions SET payment_status='paid',payment_date=CURRENT_DATE WHERE id=c.id;
  END IF;
  INSERT INTO public.booking_timeline_events(organization_id,booking_id,kind,actor_id,summary,payload)
    VALUES(c.organization_id,c.booking_id,'booking_commission_settled',actor,memo,jsonb_build_object('settlement_id',_request));
  RETURN _request;
END;
$$;
CREATE FUNCTION public.settle_booking_commission(_commission uuid,_request uuid,_treasury uuid,
  _expected numeric,_rate numeric,_reference text)
RETURNS uuid LANGUAGE sql SET search_path = ''
AS $$ SELECT pilgrimage_inventory_private.settle_commission(_commission,_request,_treasury,_expected,_rate,_reference) $$;

DO $protect_commission$
DECLARE definition text; anchor text;
BEGIN
  SELECT pg_get_functiondef('pilgrimage_inventory_private.guard_managed_commission()'::regprocedure) INTO definition;
  anchor:='IF current_user IN (''authenticated'',''anon'') AND (old_managed OR new_managed) THEN';
  IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected managed commission write guard'; END IF;
  EXECUTE replace(definition,anchor,anchor||'
    RAISE EXCEPTION ''commission_settlement_rpc_required'' USING ERRCODE=''42501'';');
END;
$protect_commission$;

REVOKE ALL ON pilgrimage_inventory_private.commission_reconciliations,
  pilgrimage_inventory_private.commission_cash_settlements FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION pilgrimage_inventory_private.booking_financials_issued(uuid,uuid),
  pilgrimage_inventory_private.has_other_booking_reviewer(uuid,uuid),
  pilgrimage_inventory_private.protect_commission_treasury_movement(),
  pilgrimage_inventory_private.protect_booking_financial_fields(),pilgrimage_inventory_private.protect_service_financial_fields(),
  pilgrimage_inventory_private.commission_statement(uuid),pilgrimage_inventory_private.settle_commission(uuid,uuid,uuid,numeric,numeric,text),
  public.get_booking_commission_statement(uuid),public.settle_booking_commission(uuid,uuid,uuid,numeric,numeric,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pilgrimage_inventory_private.booking_financials_issued(uuid,uuid),pilgrimage_inventory_private.commission_statement(uuid),
  pilgrimage_inventory_private.settle_commission(uuid,uuid,uuid,numeric,numeric,text),
  public.get_booking_commission_statement(uuid),public.settle_booking_commission(uuid,uuid,uuid,numeric,numeric,text)
  TO authenticated;
