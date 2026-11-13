BEGIN;

CREATE TABLE public.pilgrimage_operations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  program_id uuid NOT NULL REFERENCES public.pilgrimage_programs(id),
  pilgrim_id uuid NOT NULL REFERENCES public.pilgrims(id),
  action text NOT NULL CHECK (action IN ('room_category', 'cancel', 'transfer')),
  reason text NOT NULL,
  old_room_type text NOT NULL,
  new_room_type text,
  old_price numeric(12,2) NOT NULL,
  new_price numeric(12,2) NOT NULL,
  cancellation_fee numeric(12,2) NOT NULL DEFAULT 0,
  replacement_id uuid REFERENCES public.pilgrims(id),
  refund_id uuid UNIQUE REFERENCES public.refund_requests(id),
  request jsonb NOT NULL,
  transaction_id bigint NOT NULL DEFAULT txid_current(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pilgrimage_operations_program_idx ON public.pilgrimage_operations(organization_id, program_id, created_at DESC);
CREATE INDEX pilgrimage_operations_passenger_idx ON public.pilgrimage_operations(pilgrim_id);
ALTER TABLE public.pilgrimage_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilgrimage_operations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pilgrimage_operations TO authenticated;
GRANT ALL ON public.pilgrimage_operations TO service_role;
CREATE POLICY pilgrimage_operations_read ON public.pilgrimage_operations FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(auth.uid(), organization_id)
     AND public.has_org_permission(organization_id, 'bookings_view'));

CREATE SCHEMA IF NOT EXISTS pilgrimage_operations_private;
REVOKE ALL ON SCHEMA pilgrimage_operations_private FROM PUBLIC, anon, authenticated;

CREATE FUNCTION pilgrimage_operations_private.refund_reserved(_pilgrim uuid)
RETURNS numeric LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT coalesce(sum(r.amount), 0)
  FROM public.pilgrimage_operations a
  JOIN public.refund_requests r ON r.id = a.refund_id
  WHERE a.pilgrim_id = _pilgrim AND r.status IN ('requested', 'approved', 'paid');
$$;

-- Preserve existing quote, B2B, and payment guards. Only a validated,
-- in-transaction operation permits a paid retail room-category change.
DO $patch$
DECLARE
  definition text;
  previous text := 'IF v_paid>0 OR NEW.status=''cancelled'' THEN';
BEGIN
  SELECT pg_get_functiondef('public._pilgrimage_pilgrim_integrity()'::regprocedure) INTO definition;
  IF strpos(definition, previous) = 0 THEN
    RAISE EXCEPTION 'Pilgrimage room-change guard has an unexpected definition';
  END IF;
  definition := replace(definition, previous,
    'IF NEW.status=''cancelled'' OR ((v_paid>0 OR (p.program_type=''umrah'' AND NEW.b2b_roster_entry_id IS NULL)) AND NOT EXISTS (
      SELECT FROM public.pilgrimage_operations a
      WHERE a.pilgrim_id=OLD.id AND a.organization_id=OLD.organization_id
        AND a.action=''room_category'' AND a.old_room_type=OLD.room_type
        AND a.new_room_type=NEW.room_type AND a.created_by=auth.uid()
        AND a.transaction_id=txid_current()
    )) THEN');
  previous := 'IF NEW.cancellation_fee IS DISTINCT FROM OLD.cancellation_fee AND NEW.status<>''cancelled'' THEN';
  IF strpos(definition, previous) = 0 THEN
    RAISE EXCEPTION 'Pilgrimage cancellation guard has an unexpected definition';
  END IF;
  EXECUTE replace(definition, previous, 'IF p.program_type=''umrah'' AND NEW.b2b_roster_entry_id IS NULL
      AND (NEW.status=''cancelled'' AND OLD.status<>''cancelled''
        OR NEW.cancellation_fee IS DISTINCT FROM OLD.cancellation_fee
        OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at)
      AND NOT EXISTS (
        SELECT FROM public.pilgrimage_operations a WHERE a.pilgrim_id=OLD.id
          AND a.action IN (''cancel'',''transfer'') AND a.created_by=auth.uid()
          AND a.transaction_id=txid_current() AND a.cancellation_fee=NEW.cancellation_fee
      ) THEN
      RAISE EXCEPTION ''pilgrimage_requires_cancellation_workflow'' USING ERRCODE=''42501'';
    END IF;
    ' || previous);
  SELECT pg_get_functiondef('public._pilgrimage_payment_integrity()'::regprocedure) INTO definition;
  previous := 'greatest(g.total_price-v_paid,0)';
  IF strpos(definition, previous) = 0 THEN
    RAISE EXCEPTION 'Pilgrimage payment guard has an unexpected definition';
  END IF;
  EXECUTE replace(definition, previous,
    'greatest((CASE WHEN g.status=''cancelled'' THEN g.cancellation_fee ELSE g.total_price END)
      - v_paid + pilgrimage_operations_private.refund_reserved(g.id),0)');
  SELECT pg_get_functiondef('public._pilgrimage_payment_integrity()'::regprocedure) INTO definition;
  previous := 'IF g.status=''cancelled'' AND NEW.status=''completed'' THEN';
  IF strpos(definition, previous) = 0 THEN
    RAISE EXCEPTION 'Pilgrimage cancellation payment guard has an unexpected definition';
  END IF;
  EXECUTE replace(definition, previous,
    'IF g.status=''cancelled'' AND NEW.status=''completed'' AND NOT EXISTS (
      SELECT FROM public.pilgrimage_operations a
      WHERE a.pilgrim_id=g.id AND a.action IN (''cancel'',''transfer'')
    ) THEN');
END $patch$;

-- Retail pilgrim receipts are posted to customer advances by the existing
-- payment journal. Debit that same account when paying or applying the refund.
DO $patch$
DECLARE
  definition text;
  previous text := 'v_party_account := public.get_org_account_route(_org, ''refunds_payable'');';
BEGIN
  SELECT pg_get_functiondef('refund_balance_private.settle(uuid,uuid,uuid,uuid,numeric,uuid,uuid,uuid,text)'::regprocedure) INTO definition;
  IF strpos(definition, previous) = 0 THEN
    RAISE EXCEPTION 'Refund settlement source account has an unexpected definition';
  END IF;
  EXECUTE replace(definition, previous, previous || '
    IF EXISTS (SELECT FROM public.pilgrimage_operations a WHERE a.refund_id = _refund AND a.organization_id = _org) THEN
      v_party_account := public._resolve_account(_org, ''2050'');
    END IF;');
END $patch$;

-- Serializes edits to the same program's hotel rooms. Only changed slots
-- are checked so unrelated edits can still fix old inconsistent rosters.
CREATE FUNCTION pilgrimage_operations_private.guard_room()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  city text;
  room text;
  old_room text;
  category_size integer;
  occupants integer;
  other_category boolean;
  unsafe_mix boolean;
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND
    (NEW.makkah_room, NEW.madinah_room, NEW.room_type, NEW.room_group, NEW.gender, NEW.status = 'cancelled')
    IS NOT DISTINCT FROM
    (OLD.makkah_room, OLD.madinah_room, OLD.room_type, OLD.room_group, OLD.gender, OLD.status = 'cancelled')
  THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('traveled', 'completed') THEN
    RAISE EXCEPTION 'pilgrimage_passenger_not_changeable' USING ERRCODE = '22023';
  END IF;
  IF NEW.makkah_room IS NULL AND NEW.madinah_room IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('pilgrimage-room:' || NEW.program_id, 0));
  category_size := CASE NEW.room_type WHEN 'single' THEN 1 WHEN 'double' THEN 2 WHEN 'triple' THEN 3 WHEN 'quad' THEN 4 END;

  FOREACH city IN ARRAY ARRAY['makkah', 'madinah'] LOOP
    room := nullif(btrim(CASE city WHEN 'makkah' THEN NEW.makkah_room ELSE NEW.madinah_room END), '');
    IF city = 'makkah' THEN NEW.makkah_room := room; ELSE NEW.madinah_room := room; END IF;
    IF room IS NULL THEN CONTINUE; END IF;
    IF TG_OP = 'UPDATE' THEN
      old_room := CASE city WHEN 'makkah' THEN OLD.makkah_room ELSE OLD.madinah_room END;
      IF (room, NEW.room_type, NEW.room_group, NEW.gender) IS NOT DISTINCT FROM
         (old_room, OLD.room_type, OLD.room_group, OLD.gender) THEN CONTINUE; END IF;
    END IF;
    IF char_length(room) > 50 THEN
      RAISE EXCEPTION 'room_identifier_too_long' USING ERRCODE = '22023';
    END IF;

    SELECT count(*), coalesce(bool_or(g.room_type <> NEW.room_type), false),
      coalesce(bool_or(
        g.gender IS NOT NULL AND NEW.gender IS NOT NULL AND g.gender <> NEW.gender
        AND (nullif(lower(btrim(NEW.room_group)), '') IS NULL
          OR nullif(lower(btrim(g.room_group)), '') IS DISTINCT FROM nullif(lower(btrim(NEW.room_group)), ''))
      ), false)
    INTO occupants, other_category, unsafe_mix
    FROM public.pilgrims g
    WHERE g.organization_id = NEW.organization_id AND g.program_id = NEW.program_id
      AND g.status <> 'cancelled' AND g.id IS DISTINCT FROM NEW.id
      AND lower(btrim(CASE city WHEN 'makkah' THEN g.makkah_room ELSE g.madinah_room END)) = lower(room);
    IF other_category THEN RAISE EXCEPTION 'room_category_conflict' USING ERRCODE = '22023'; END IF;
    IF occupants >= category_size THEN RAISE EXCEPTION 'room_capacity_exceeded' USING ERRCODE = '22023'; END IF;
    IF unsafe_mix THEN RAISE EXCEPTION 'room_family_group_required' USING ERRCODE = '22023'; END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION pilgrimage_operations_private.guard_room() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER zzz_pilgrimage_room_guard BEFORE INSERT OR UPDATE OF makkah_room, madinah_room, room_type, room_group, gender, status
ON public.pilgrims FOR EACH ROW EXECUTE FUNCTION pilgrimage_operations_private.guard_room();

CREATE FUNCTION public.apply_pilgrimage_operations(_organization_id uuid, _program_id uuid, _requests jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  program public.pilgrimage_programs%ROWTYPE;
  destination public.pilgrimage_programs%ROWTYPE;
  passenger public.pilgrims%ROWTYPE;
  operation public.pilgrimage_operations%ROWTYPE;
  request jsonb;
  request_id uuid;
  passenger_id uuid;
  action_name text;
  reason text;
  room_category text;
  makkah_room_number text;
  madinah_room_number text;
  target_program_id uuid;
  fee numeric;
  new_price numeric;
  net_paid numeric;
  refund_amount numeric;
  refund_rate numeric;
  replacement uuid;
  refund uuid;
  result jsonb := '[]'::jsonb;
BEGIN
  IF actor IS NULL OR NOT coalesce(public.can_org_write(_organization_id), false)
     OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_edit'), false)
     OR coalesce(public.get_user_org_role(actor, _organization_id)::text, '') NOT IN ('owner','admin','manager') THEN
    RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_requests) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'pilgrimage_invalid_operation' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(_requests) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'pilgrimage_invalid_operation' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(DISTINCT item->>'pilgrim_id') FROM jsonb_array_elements(_requests) item) <> jsonb_array_length(_requests) THEN
    RAISE EXCEPTION 'pilgrimage_invalid_operation' USING ERRCODE = '22023';
  END IF;

  -- Lock all affected programs in stable order, then the selected passengers.
  PERFORM 1 FROM public.pilgrimage_programs p
  WHERE p.organization_id = _organization_id AND
    (p.id = _program_id OR p.id IN (
      SELECT (item->>'target_program_id')::uuid FROM jsonb_array_elements(_requests) item
    ))
  ORDER BY p.id FOR UPDATE;
  SELECT * INTO program FROM public.pilgrimage_programs
  WHERE id = _program_id AND organization_id = _organization_id;
  IF NOT FOUND OR program.program_type <> 'umrah' THEN
    RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501';
  END IF;

  FOR request IN SELECT value FROM jsonb_array_elements(_requests) ORDER BY value->>'pilgrim_id' LOOP
    request_id := (request->>'id')::uuid;
    passenger_id := (request->>'pilgrim_id')::uuid;
    action_name := request->>'action';
    reason := btrim(coalesce(request->>'reason', ''));
    fee := coalesce((request->>'fee')::numeric, 0);
    room_category := request->>'room_type';
    makkah_room_number := nullif(btrim(request->>'makkah_room'), '');
    madinah_room_number := nullif(btrim(request->>'madinah_room'), '');
    target_program_id := (request->>'target_program_id')::uuid;
    replacement := NULL;
    refund := NULL;

    IF request_id IS NULL OR passenger_id IS NULL OR action_name IS NULL
       OR action_name NOT IN ('room_category','cancel','transfer') OR char_length(reason) NOT BETWEEN 3 AND 500 THEN
      RAISE EXCEPTION 'pilgrimage_invalid_operation' USING ERRCODE = '22023';
    END IF;
    IF action_name IN ('cancel', 'transfer') AND NOT coalesce(public.has_org_permission(_organization_id, 'bookings_cancel'), false) THEN
      RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501';
    END IF;
    SELECT * INTO operation FROM public.pilgrimage_operations WHERE id = request_id;
    IF FOUND THEN
      IF operation.organization_id <> _organization_id OR operation.program_id <> program.id OR operation.request <> request THEN
        RAISE EXCEPTION 'pilgrimage_operation_id_used' USING ERRCODE = '22023';
      END IF;
      result := result || jsonb_build_object('id', request_id, 'refund_id', operation.refund_id, 'replacement_id', operation.replacement_id);
      CONTINUE;
    END IF;

    SELECT * INTO passenger FROM public.pilgrims
    WHERE id = passenger_id AND organization_id = _organization_id AND program_id = program.id FOR UPDATE;
    IF NOT FOUND OR passenger.status IN ('cancelled','traveled','completed')
       OR passenger.b2b_roster_entry_id IS NOT NULL OR program.status IN ('departed','completed','cancelled') THEN
      RAISE EXCEPTION 'pilgrimage_passenger_not_changeable' USING ERRCODE = '22023';
    END IF;
    net_paid := greatest(passenger.paid_amount - pilgrimage_operations_private.refund_reserved(passenger.id), 0);
    IF passenger.total_price IS DISTINCT FROM (request->>'expected_price')::numeric
       OR net_paid IS DISTINCT FROM (request->>'expected_net_paid')::numeric
       OR passenger.room_type IS DISTINCT FROM request->>'expected_room_type' THEN
      RAISE EXCEPTION 'pilgrimage_operation_refresh_required' USING ERRCODE = '22023';
    END IF;
    IF fee < 0 OR fee > passenger.total_price OR fee <> round(fee, 2)
       OR (action_name = 'room_category' AND fee <> 0) THEN
      RAISE EXCEPTION 'pilgrimage_invalid_fee' USING ERRCODE = '22023';
    END IF;

    destination := program;
    IF action_name = 'transfer' THEN
      SELECT * INTO destination FROM public.pilgrimage_programs WHERE id = target_program_id AND organization_id = _organization_id;
      IF NOT FOUND OR destination.id = program.id OR destination.status <> 'open'
         OR destination.program_type <> program.program_type OR destination.currency <> program.currency
         OR destination.travel_scope <> program.travel_scope THEN
        RAISE EXCEPTION 'pilgrimage_transfer_program_unavailable' USING ERRCODE = '22023';
      END IF;
    END IF;
    new_price := CASE room_category
      WHEN 'quad' THEN destination.price_quad WHEN 'triple' THEN destination.price_triple
      WHEN 'double' THEN destination.price_double WHEN 'single' THEN destination.price_single ELSE 0 END;
    IF action_name <> 'cancel' AND (new_price <= 0 OR
       (action_name = 'room_category' AND passenger.room_type = room_category)) THEN
      RAISE EXCEPTION 'pilgrimage_invalid_room_price' USING ERRCODE = '22023';
    END IF;
    IF action_name <> 'cancel' AND new_price IS DISTINCT FROM (request->>'expected_new_price')::numeric THEN
      RAISE EXCEPTION 'pilgrimage_operation_refresh_required' USING ERRCODE = '22023';
    END IF;
    IF action_name = 'cancel' THEN new_price := 0; END IF;
    IF char_length(makkah_room_number) > 50 OR char_length(madinah_room_number) > 50 THEN
      RAISE EXCEPTION 'room_identifier_too_long' USING ERRCODE = '22023';
    END IF;

    refund_amount := greatest(net_paid - CASE WHEN action_name = 'room_category' THEN new_price ELSE fee END, 0);
    IF refund_amount > 0 THEN
      IF passenger.customer_id IS NULL THEN
        RAISE EXCEPTION 'pilgrimage_refund_customer_required' USING ERRCODE = '22023';
      END IF;
      SELECT round(sum(amount_base) / nullif(sum(amount), 0), 6) INTO refund_rate
      FROM public.customer_payments WHERE pilgrim_id = passenger.id AND organization_id = _organization_id AND status = 'completed';
      IF refund_rate IS NULL OR refund_rate <= 0 THEN
        RAISE EXCEPTION 'pilgrimage_refund_payment_required' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.refund_requests (
        organization_id, customer_id, amount, currency, exchange_rate, amount_base, reason, status,
        requested_by, advance_component, sales_return_component
      ) VALUES (
        _organization_id, passenger.customer_id, refund_amount, program.currency, refund_rate,
        round(refund_amount * refund_rate, 2), program.name || ' · ' || passenger.full_name || ' · ' || reason,
        'requested', actor, refund_amount, 0
      ) RETURNING id INTO refund;
    END IF;
    INSERT INTO public.pilgrimage_operations (
      id, organization_id, program_id, pilgrim_id, action, reason, old_room_type, new_room_type,
      old_price, new_price, cancellation_fee, refund_id, request, created_by
    ) VALUES (
      request_id, _organization_id, program.id, passenger.id, action_name, reason, passenger.room_type,
      CASE WHEN action_name <> 'cancel' THEN room_category END,
      passenger.total_price, new_price, fee, refund, request, actor
    );

    IF action_name = 'room_category' THEN
      UPDATE public.pilgrims SET room_type = room_category, makkah_room = makkah_room_number, madinah_room = madinah_room_number,
        status = CASE WHEN status = 'ready' THEN 'registered' ELSE status END WHERE id = passenger.id;
    ELSE
      UPDATE public.pilgrims SET status = 'cancelled', cancellation_fee = fee, cancelled_at = now()
      WHERE id = passenger.id;
    END IF;
    IF action_name = 'transfer' THEN
      INSERT INTO public.pilgrims (
        organization_id, program_id, customer_id, full_name, name_en, phone, gender, birth_date,
        nationality, national_id, passport_number, passport_expiry, mahram_name, mahram_relation,
        room_type, room_group, notes, status, created_by
      ) VALUES (
        _organization_id, destination.id, passenger.customer_id, passenger.full_name, passenger.name_en,
        passenger.phone, passenger.gender, passenger.birth_date, passenger.nationality, passenger.national_id,
        passenger.passport_number, passenger.passport_expiry, passenger.mahram_name, passenger.mahram_relation,
        room_category, passenger.room_group, passenger.notes, 'registered', actor
      ) RETURNING id INTO replacement;
      UPDATE public.pilgrimage_operations SET replacement_id = replacement WHERE id = request_id;
    END IF;
    result := result || jsonb_build_object('id', request_id, 'refund_id', refund, 'replacement_id', replacement);
  END LOOP;
  RETURN result;
END;
$$;

CREATE FUNCTION public.get_pilgrimage_operation_refunds(_organization_id uuid, _program_id uuid)
RETURNS TABLE(pilgrim_id uuid, reserved_amount numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.user_belongs_to_org(auth.uid(), _organization_id), false)
     OR NOT coalesce(public.has_org_permission(_organization_id, 'bookings_view'), false) THEN
    RAISE EXCEPTION 'pilgrimage_operation_denied' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT a.pilgrim_id, sum(r.amount)
  FROM public.pilgrimage_operations a JOIN public.refund_requests r ON r.id = a.refund_id
  WHERE a.organization_id = _organization_id AND a.program_id = _program_id
    AND r.status IN ('requested', 'approved', 'paid')
  GROUP BY a.pilgrim_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_pilgrimage_operations(uuid, uuid, jsonb),
  public.get_pilgrimage_operation_refunds(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_pilgrimage_operations(uuid, uuid, jsonb),
  public.get_pilgrimage_operation_refunds(uuid, uuid) TO authenticated;

COMMIT;
